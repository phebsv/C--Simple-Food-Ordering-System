using System.Data;
using System.Globalization;
using MySqlConnector;
using NomNom.Api.Models;
using NomNom.Api.Services;

namespace NomNom.Api.Storage;

internal sealed class MySqlOrderStore(MySqlDataSource dataSource, TimeProvider clock)
{
    public async Task<Order> PlaceAsync(
        string customerId, CheckoutDetails delivery, IReadOnlyDictionary<string, int> expectedCart, CancellationToken ct)
    {
        await using var connection = await dataSource.OpenConnectionAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);

        // Serialize checkouts for this account, even if its cart changes during a request.
        await using var account = Command(connection, transaction, "SELECT email FROM users WHERE id = @id FOR UPDATE;",
            ("@id", customerId));
        var email = (string?)await account.ExecuteScalarAsync(ct) ?? throw ApiError.Unauthorized();
        var cart = await ReadCheckoutCartAsync(connection, transaction, customerId, ct);
        if (cart.Count == 0) throw ApiError.Invalid("Your cart is empty.");
        if (cart.Count != expectedCart.Count || cart.Any(line =>
                !expectedCart.TryGetValue(line.Item.Id, out var quantity) || quantity != line.Item.Quantity))
            throw new ApiError(409, "Your cart changed. Review it before placing your order.");

        var total = cart.Sum(line => line.Item.Price * line.Item.Quantity);
        if (total > 999_999_999_999.99m) throw ApiError.Invalid("The order total is too large.");
        var now = clock.GetUtcNow().UtcDateTime;
        var order = new Order
        {
            Id = Guid.NewGuid().ToString("N"),
            CustomerId = customerId,
            CustomerName = delivery.Name,
            CustomerEmail = email,
            CustomerPhone = delivery.Phone,
            CustomerAddress = delivery.Address,
            Items = cart.Select(line => line.Item).ToList(),
            Subtotal = total,
            Total = total,
            Status = OrderStatus.Pending,
            PaymentMethod = delivery.Payment,
            DeliveryNotes = delivery.Notes,
            CreatedAt = Timestamp(now),
            UpdatedAt = Timestamp(now)
        };

        await using var insert = Command(connection, transaction, """
            INSERT INTO orders (id, customer_id, customer_name, customer_email, customer_phone, customer_address,
                subtotal, total, status, payment_method, delivery_notes, created_at, updated_at)
            VALUES (@id, @customerId, @name, @email, @phone, @address,
                @total, @total, 'Pending', @payment, @notes, @now, @now);
            """, ("@id", order.Id), ("@customerId", customerId), ("@name", delivery.Name), ("@email", email),
            ("@phone", delivery.Phone), ("@address", delivery.Address), ("@total", total),
            ("@payment", delivery.Payment), ("@notes", delivery.Notes), ("@now", now));
        await insert.ExecuteNonQueryAsync(ct);

        for (var index = 0; index < cart.Count; index++)
        {
            var (cartId, item) = cart[index];
            await using var line = Command(connection, transaction, """
                INSERT INTO order_items (order_id, line_number, menu_id, name, description, price, category, quantity)
                VALUES (@orderId, @line, @menuId, @name, @description, @price, @category, @quantity);
                """, ("@orderId", order.Id), ("@line", index + 1), ("@menuId", item.Id), ("@name", item.Name),
                ("@description", item.Description), ("@price", item.Price),
                ("@category", item.Category), ("@quantity", item.Quantity));
            await line.ExecuteNonQueryAsync(ct);

            await using var stock = Command(connection, transaction, """
                UPDATE menu_items
                SET available = stock > @quantity, stock = stock - @quantity, last_updated = @now
                WHERE id = @menuId;
                """, ("@menuId", item.Id), ("@quantity", item.Quantity), ("@now", now));
            await stock.ExecuteNonQueryAsync(ct);
            await MySqlCartStore.DeleteAsync(connection, transaction, customerId, cartId, ct);
        }

        await transaction.CommitAsync(ct);
        return order;
    }

    private static async Task<List<(string CartId, OrderItem Item)>> ReadCheckoutCartAsync(
        MySqlConnection connection, MySqlTransaction transaction, string customerId, CancellationToken ct)
    {
        // Lock cart lines and their live menu rows until the order and stock changes commit together.
        await using var command = Command(connection, transaction, """
            SELECT c.id, m.id, m.name, m.description, m.price, m.category, c.quantity, m.available, m.stock
            FROM cart_items c
            JOIN menu_items m ON m.id = c.menu_id
            WHERE c.customer_id = @customerId
            ORDER BY c.menu_id
            FOR UPDATE;
            """, ("@customerId", customerId));
        await using var rows = await command.ExecuteReaderAsync(ct);
        var lines = new List<(string, OrderItem)>();
        while (await rows.ReadAsync(ct))
        {
            var name = rows.GetString(2);
            var quantity = rows.GetInt32(6);
            if (rows.IsDBNull(7) || !rows.GetBoolean(7) || rows.IsDBNull(8) ||
                quantity < 1 || rows.GetInt32(8) < quantity)
                throw new ApiError(409, $"The requested quantity of {name} is unavailable. Review your cart.");

            lines.Add((rows.GetString(0), new OrderItem
            {
                Id = rows.GetString(1),
                Name = name,
                Description = rows.GetString(3),
                Price = rows.GetDecimal(4),
                Category = rows.GetString(5),
                Quantity = quantity
            }));
        }
        return lines;
    }

    public Task<IReadOnlyList<Order>> ListAsync(string customerId, CancellationToken ct) =>
        ReadAsync(customerId, orderId: null, ct);

    public Task<IReadOnlyList<Order>> ListAllAsync(CancellationToken ct) => ReadAsync(null, null, ct);

    public async Task<Order?> FindAsync(string orderId, string? customerId, CancellationToken ct) =>
        (await ReadAsync(customerId, orderId, ct)).SingleOrDefault();

    // Administrator workflows supply an expected state after applying their transition rules.
    public async Task<bool> TryUpdateStatusAsync(string orderId, OrderStatus expected, OrderStatus next, CancellationToken ct)
    {
        await using var connection = await dataSource.OpenConnectionAsync(ct);
        await using var command = Command(connection, null, """
            UPDATE orders SET status = @next, updated_at = @now
            WHERE id = @id AND status = @expected;
            """, ("@id", orderId), ("@expected", expected.ToString()), ("@next", next.ToString()),
            ("@now", clock.GetUtcNow().UtcDateTime));
        return await command.ExecuteNonQueryAsync(ct) == 1;
    }

    public async Task<bool> CancelAsync(string orderId, CancellationToken ct)
    {
        await using var connection = await dataSource.OpenConnectionAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(ct);
        var now = clock.GetUtcNow().UtcDateTime;

        await using var cancel = Command(connection, transaction, """
            UPDATE orders SET status = 'Cancelled', updated_at = @now
            WHERE id = @id AND status IN ('Pending', 'Preparing');
            """, ("@id", orderId), ("@now", now));
        if (await cancel.ExecuteNonQueryAsync(ct) != 1) return false;

        // Items this order sold out go back on sale; anything an admin hid by hand has stock left and stays as it was.
        await using var reopen = Command(connection, transaction, """
            UPDATE menu_items m JOIN order_items i ON i.menu_id = m.id
            SET m.available = TRUE
            WHERE i.order_id = @id AND m.stock = 0;
            """, ("@id", orderId));
        await reopen.ExecuteNonQueryAsync(ct);

        await using var restock = Command(connection, transaction, """
            UPDATE menu_items m JOIN order_items i ON i.menu_id = m.id
            SET m.stock = m.stock + i.quantity, m.last_updated = @now
            WHERE i.order_id = @id;
            """, ("@id", orderId), ("@now", now));
        await restock.ExecuteNonQueryAsync(ct);

        await transaction.CommitAsync(ct);
        return true;
    }

    private async Task<IReadOnlyList<Order>> ReadAsync(string? customerId, string? orderId, CancellationToken ct)
    {
        await using var connection = await dataSource.OpenConnectionAsync(ct);
        await using var command = Command(connection, null, """
            SELECT o.id, o.customer_id, o.customer_name, o.customer_email, o.customer_phone, o.customer_address,
                   o.subtotal, o.total, o.status, o.payment_method, o.delivery_notes, o.created_at, o.updated_at,
                   i.menu_id, i.name, i.description, i.price, i.category, i.quantity
            FROM orders o
            LEFT JOIN order_items i ON i.order_id = o.id
            WHERE (@customerId IS NULL OR o.customer_id = @customerId)
              AND (@orderId IS NULL OR o.id = @orderId)
            ORDER BY o.created_at DESC, o.id, i.line_number;
            """, ("@customerId", customerId), ("@orderId", orderId));
        await using var rows = await command.ExecuteReaderAsync(ct);
        var orders = new List<Order>();
        Order? order = null;
        while (await rows.ReadAsync(ct))
        {
            var id = rows.GetString(0);
            if (order?.Id != id)
            {
                order = new Order
                {
                    Id = id,
                    CustomerId = rows.GetString(1),
                    CustomerName = rows.GetString(2),
                    CustomerEmail = rows.GetString(3),
                    CustomerPhone = rows.GetString(4),
                    CustomerAddress = rows.GetString(5),
                    Subtotal = rows.GetDecimal(6),
                    Total = rows.GetDecimal(7),
                    Status = Enum.Parse<OrderStatus>(rows.GetString(8)),
                    PaymentMethod = rows.GetString(9),
                    DeliveryNotes = rows.IsDBNull(10) ? null : rows.GetString(10),
                    CreatedAt = Timestamp(rows.GetDateTime(11)),
                    UpdatedAt = Timestamp(rows.GetDateTime(12)),
                    Items = []
                };
                orders.Add(order);
            }

            if (!rows.IsDBNull(13))
                order.Items.Add(new OrderItem
                {
                    Id = rows.GetString(13),
                    Name = rows.GetString(14),
                    Description = rows.GetString(15),
                    Price = rows.GetDecimal(16),
                    Category = rows.GetString(17),
                    Quantity = rows.GetInt32(18)
                });
        }
        return orders;
    }

    private static string Timestamp(DateTime value) =>
        DateTime.SpecifyKind(value, DateTimeKind.Utc).ToString("yyyy-MM-dd'T'HH:mm:ss.ffffff'Z'", CultureInfo.InvariantCulture);

    private static MySqlCommand Command(
        MySqlConnection connection, MySqlTransaction? transaction, string sql, params (string Name, object? Value)[] parameters)
    {
        var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        foreach (var (name, value) in parameters) command.Parameters.AddWithValue(name, value);
        return command;
    }
}
