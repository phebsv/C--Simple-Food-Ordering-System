using MySqlConnector;
using NomNom.Api.Models;

namespace NomNom.Api.Repositories;

internal sealed class MySqlCartRepository(MySqlDataSource dataSource) : ICartRepository
{
    private const string SelectItems = """
        SELECT id, customer_id, menu_id, name, description, price, category, image, quantity
        FROM cart_items
        """;

    public async Task<List<CartItem>> ListAsync(string customerId, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = SelectItems + "\nWHERE customer_id = @customerId AND deleted_at IS NULL\nORDER BY name;";
        command.Parameters.AddWithValue("@customerId", customerId);
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
        var items = new List<CartItem>();
        while (await rows.ReadAsync(cancellationToken)) items.Add(ReadItem(rows));
        return items;
    }

    public async Task<CartItem?> FindByMenuAsync(
        string customerId, string menuId, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = SelectItems + "\nWHERE customer_id = @customerId AND menu_id = @menuId AND deleted_at IS NULL;";
        command.Parameters.AddWithValue("@customerId", customerId);
        command.Parameters.AddWithValue("@menuId", menuId);
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
        return await rows.ReadAsync(cancellationToken) ? ReadItem(rows) : null;
    }

    public async Task<CartItem?> FindAsync(string id, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = SelectItems + "\nWHERE id = @id AND deleted_at IS NULL;";
        command.Parameters.AddWithValue("@id", id);
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
            return await rows.ReadAsync(cancellationToken) ? ReadItem(rows) : null;
}

    /// <summary>Returns false when this customer already has the item in their cart.</summary>
    public async Task<CartItem?> TryInsertOrRestoreAsync(CartItem item, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO cart_items (id, customer_id, menu_id, name, description, price, category, image, quantity)
            VALUES (@id, @customerId, @menuId, @name, @description, @price, @category, @image, @quantity);
            """;
        command.Parameters.AddWithValue("@id", item.Id);
        command.Parameters.AddWithValue("@customerId", item.CustomerId);
        command.Parameters.AddWithValue("@menuId", item.MenuId);
        command.Parameters.AddWithValue("@name", item.Name);
        command.Parameters.AddWithValue("@description", item.Description);
        command.Parameters.AddWithValue("@price", item.Price);
        command.Parameters.AddWithValue("@category", item.Category);
        command.Parameters.AddWithValue("@image", item.Image);
        command.Parameters.AddWithValue("@quantity", item.Quantity);
        try
        {
            await command.ExecuteNonQueryAsync(cancellationToken);
            return item;
        }
        catch (MySqlException ex) when (ex.ErrorCode == MySqlErrorCode.DuplicateKeyEntry)
        {
            await using var restore = connection.CreateCommand();
            restore.CommandText = """
                UPDATE cart_items
                SET deleted_at = NULL, name = @name, description = @description, price = @price,
                    category = @category, image = @image, quantity = 1
                WHERE customer_id = @customerId AND menu_id = @menuId AND deleted_at IS NOT NULL;
                """;
            restore.Parameters.AddWithValue("@customerId", item.CustomerId);
            restore.Parameters.AddWithValue("@menuId", item.MenuId);
            restore.Parameters.AddWithValue("@name", item.Name);
            restore.Parameters.AddWithValue("@description", item.Description);
            restore.Parameters.AddWithValue("@price", item.Price);
            restore.Parameters.AddWithValue("@category", item.Category);
            restore.Parameters.AddWithValue("@image", item.Image);
            if (await restore.ExecuteNonQueryAsync(cancellationToken) == 1)
                return await FindByMenuAsync(item.CustomerId, item.MenuId, cancellationToken);
            return null;
        }
    }

    public async Task SetQuantityAsync(string id, int quantity, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE cart_items SET quantity = @quantity
            WHERE id = @id AND deleted_at IS NULL;
            """;
        command.Parameters.AddWithValue("@quantity", quantity);
        command.Parameters.AddWithValue("@id", id);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<bool> DeleteAsync(string customerId, string id, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        return await DeleteAsync(connection, null, customerId, id, cancellationToken);
    }

    internal static async Task<bool> DeleteAsync(
        MySqlConnection connection, MySqlTransaction? transaction, string customerId, string id,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            UPDATE cart_items SET deleted_at = UTC_TIMESTAMP(6)
            WHERE id = @id AND customer_id = @customerId AND deleted_at IS NULL;
            """;
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@customerId", customerId);
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    public async Task ClearAsync(string customerId, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE cart_items SET deleted_at = UTC_TIMESTAMP(6)
            WHERE customer_id = @customerId AND deleted_at IS NULL;
            """;
        command.Parameters.AddWithValue("@customerId", customerId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static CartItem ReadItem(MySqlDataReader row) => new()
    {
        Id = row.GetString(0),
        CustomerId = row.GetString(1),
        MenuId = row.GetString(2),
        Name = row.GetString(3),
        Description = row.GetString(4),
        Price = row.GetDecimal(5),
        Category = row.GetString(6),
        Image = row.GetString(7),
        Quantity = row.GetInt32(8)
    };
}
