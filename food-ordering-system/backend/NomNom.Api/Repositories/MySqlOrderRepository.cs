using System.Data;
using System.Globalization;
using MySqlConnector;
using NomNom.Api.Models;
using NomNom.Api.Services;

namespace NomNom.Api.Repositories;

internal sealed class MySqlOrderRepository(MySqlDataSource dataSource, TimeProvider clock) : IOrderRepository
{
    public async Task<Order> PlaceAsync(
        string customerId, Func<CheckoutSnapshot, Order> buildOrder, CancellationToken ct)
    {
        await using var connection = await dataSource.OpenConnectionAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);

        // Serialize checkouts for this account, even if its cart changes during a request.
        await using var account = Command(connection, transaction,
            "SELECT email FROM users WHERE id = @id AND is_deleted = FALSE FOR UPDATE;",
            ("@id", customerId));
        var email = (string?)await account.ExecuteScalarAsync(ct) ?? throw ApiError.Unauthorized();
        var lines = await ReadCheckoutCartAsync(connection, transaction, customerId, ct);

        // The service decides whether the order is valid; the repository only saves what it returns.
        var order = buildOrder(new CheckoutSnapshot(email, lines));
        var createdAt = DateTime.Parse(order.CreatedAt, CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
        var updatedAt = DateTime.Parse(order.UpdatedAt, CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);

        await using var insert = Command(connection, transaction, """
            INSERT INTO orders (id, customer_id, customer_name, customer_email, customer_phone, customer_address,
                subtotal, total, status, payment_method, delivery_notes, created_at, updated_at)
            VALUES (@id, @customerId, @name, @email, @phone, @address,
                @subtotal, @total, @status, @payment, @notes, @createdAt, @updatedAt);
            """, ("@id", order.Id), ("@customerId", customerId), ("@name", order.CustomerName),
            ("@email", order.CustomerEmail),
            ("@phone", order.CustomerPhone), ("@address", order.CustomerAddress),
            ("@subtotal", order.Subtotal), ("@total", order.Total),
            ("@status", order.Status.ToString()), ("@payment", order.PaymentMethod),
            ("@notes", order.DeliveryNotes), ("@createdAt", createdAt), ("@updatedAt", updatedAt));
        await insert.ExecuteNonQueryAsync(ct);

        for (var index = 0; index < lines.Count; index++)
        {
            var (cartId, item, _, _) = lines[index];
            await using var line = Command(connection, transaction, """
                INSERT INTO order_items (order_id, line_number, menu_id, name, description, price, category, quantity)
                VALUES (@orderId, @line, @menuId, @name, @description, @price, @category, @quantity);
                """, ("@orderId", order.Id), ("@line", index + 1), ("@menuId", item.Id), ("@name", item.Name),
                ("@description", item.Description), ("@price", item.Price),
                ("@category", item.Category), ("@quantity", item.Quantity));
            await line.ExecuteNonQueryAsync(ct);

            await using var stock = Command(connection, transaction, """
                UPDATE menu_items
                SET available = stock > @quantity, stock = stock - @quantity, last_updated = @createdAt
                WHERE id = @menuId AND is_deleted = FALSE;
                """, ("@menuId", item.Id), ("@quantity", item.Quantity), ("@createdAt", createdAt));
            await stock.ExecuteNonQueryAsync(ct);
            await MySqlCartRepository.DeleteAsync(connection, transaction, customerId, cartId, ct);
        }

        await transaction.CommitAsync(ct);
        return order;
    }

    private static async Task<List<CheckoutLine>> ReadCheckoutCartAsync(
        MySqlConnection connection, MySqlTransaction transaction, string customerId, CancellationToken ct)
    {
        // Lock cart lines and their live menu rows until the order and stock changes commit together.
        await using var command = Command(connection, transaction, """
            SELECT c.id, m.id, m.name, m.description, m.price, m.category, c.quantity, m.available, m.stock
            FROM cart_items c
            JOIN menu_items m ON m.id = c.menu_id
            WHERE c.customer_id = @customerId AND c.deleted_at IS NULL AND m.is_deleted = FALSE
            ORDER BY c.menu_id
            FOR UPDATE;
            """, ("@customerId", customerId));
        await using var rows = await command.ExecuteReaderAsync(ct);
        var lines = new List<CheckoutLine>();
        while (await rows.ReadAsync(ct))
        {
            lines.Add(new CheckoutLine(
                rows.GetString(0),
                new OrderItem
                {
                    Id = rows.GetString(1),
                    Name = rows.GetString(2),
                    Description = rows.GetString(3),
                    Price = rows.GetDecimal(4),
                    Category = rows.GetString(5),
                    Quantity = rows.GetInt32(6)
                },
                rows.IsDBNull(7) ? null : rows.GetBoolean(7),
                rows.IsDBNull(8) ? null : rows.GetInt32(8)));
        }
        return lines;
    }

    public Task<IReadOnlyList<Order>> ListAsync(string customerId, CancellationToken ct) =>
        ReadAsync(customerId, orderId: null, ct);

    public Task<IReadOnlyList<Order>> ListAllAsync(CancellationToken ct) => ReadAsync(null, null, ct);

    public Task<IReadOnlyList<Order>> ListDeletedAsync(CancellationToken ct) =>
        ReadAsync(null, null, ct, includeDeleted: true);

    public async Task<Order?> FindAsync(string orderId, string? customerId, CancellationToken ct) =>
        (await ReadAsync(customerId, orderId, ct)).SingleOrDefault();

    public async Task<bool> SoftDeleteAsync(string orderId, CancellationToken ct)
    {
        await using var connection = await dataSource.OpenConnectionAsync(ct);
        await using var command = Command(connection, null, """
            UPDATE orders
            SET is_deleted = TRUE, deleted_at = UTC_TIMESTAMP(6)
            WHERE id = @id AND is_deleted = FALSE;
            """, ("@id", orderId));
        return await command.ExecuteNonQueryAsync(ct) == 1;
    }

    public async Task<bool> RestoreAsync(string orderId, CancellationToken ct)
    {
        await using var connection = await dataSource.OpenConnectionAsync(ct);
        await using var command = Command(connection, null, """
            UPDATE orders
            SET is_deleted = FALSE, deleted_at = NULL
            WHERE id = @id AND is_deleted = TRUE;
            """, ("@id", orderId));
        return await command.ExecuteNonQueryAsync(ct) == 1;
    }

    // Administrator workflows supply an expected state after applying their transition rules.
    public async Task<bool> TryUpdateStatusAsync(string orderId, OrderStatus expected, OrderStatus next, CancellationToken ct)
    {
        await using var connection = await dataSource.OpenConnectionAsync(ct);
        await using var command = Command(connection, null, """
            UPDATE orders SET status = @next, updated_at = @now
            WHERE id = @id AND status = @expected AND is_deleted = FALSE;
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
            WHERE id = @id AND status IN ('Pending', 'Preparing') AND is_deleted = FALSE;
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

    private async Task<IReadOnlyList<Order>> ReadAsync(
        string? customerId, string? orderId, CancellationToken ct, bool includeDeleted = false)
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
              AND o.is_deleted = @includeDeleted
            ORDER BY o.created_at DESC, o.id, i.line_number;
            """, ("@customerId", customerId), ("@orderId", orderId), ("@includeDeleted", includeDeleted));
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
