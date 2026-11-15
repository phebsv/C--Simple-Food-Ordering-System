using MySqlConnector;
using NomNom.Api.Models;

namespace NomNom.Api.Storage;

internal sealed class MySqlCartStore(MySqlDataSource dataSource)
{
    private const string SelectItems = """
        SELECT id, customer_id, menu_id, name, description, price, category, image, quantity
        FROM cart_items
        """;

    public async Task<List<CartItem>> ListAsync(string customerId, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = SelectItems + "\nWHERE customer_id = @customerId\nORDER BY name;";
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
        command.CommandText = SelectItems + "\nWHERE customer_id = @customerId AND menu_id = @menuId;";
        command.Parameters.AddWithValue("@customerId", customerId);
        command.Parameters.AddWithValue("@menuId", menuId);
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
        return await rows.ReadAsync(cancellationToken) ? ReadItem(rows) : null;
    }

    public async Task<CartItem?> FindAsync(string id, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = SelectItems + "\nWHERE id = @id;";
        command.Parameters.AddWithValue("@id", id);
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
            return await rows.ReadAsync(cancellationToken) ? ReadItem(rows) : null;
}

    /// <summary>Returns false when this customer already has the item in their cart.</summary>
    public async Task<bool> TryInsertAsync(CartItem item, CancellationToken cancellationToken)
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
            return true;
        }
        catch (MySqlException ex) when (ex.ErrorCode == MySqlErrorCode.DuplicateKeyEntry)
        {
            return false;
        }
    }

    public async Task SetQuantityAsync(string id, int quantity, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE cart_items SET quantity = @quantity WHERE id = @id;";
        command.Parameters.AddWithValue("@quantity", quantity);
        command.Parameters.AddWithValue("@id", id);
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