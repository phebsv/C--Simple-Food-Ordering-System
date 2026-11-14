using System.Globalization;
using MySqlConnector;
using NomNom.Api.Models;
using NomNom.Api.Contracts;

namespace NomNom.Api.Storage;

internal sealed class MySqlMenuStore(MySqlDataSource dataSource)
{
    private const string SelectItems = """
        SELECT id, name, description, price, category, image, available, stock, last_updated
        FROM menu_items
        """;

    public async Task<List<MenuItem>> ListAsync(CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = SelectItems + "\nORDER BY display_order;";
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
        var items = new List<MenuItem>();
        while (await rows.ReadAsync(cancellationToken)) items.Add(ReadItem(rows));
        return items;
    }

    public async Task<MenuItem?> FindAsync(string id, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = SelectItems + "\nWHERE id = @id;";
        command.Parameters.AddWithValue("@id", id);
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
        return await rows.ReadAsync(cancellationToken) ? ReadItem(rows) : null;
    }

    public async Task CreateAsync(MenuItem item, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO menu_items (id, name, description, price, category, image, available, stock, last_updated)
            VALUES (@id, @name, @description, @price, @category, @image, @available, @stock, UTC_TIMESTAMP(6));
            """;
        command.Parameters.AddWithValue("@id", item.Id);
        command.Parameters.AddWithValue("@name", item.Name);
        command.Parameters.AddWithValue("@description", item.Description);
        command.Parameters.AddWithValue("@price", item.Price);
        command.Parameters.AddWithValue("@category", item.Category);
        command.Parameters.AddWithValue("@image", item.Image);
        command.Parameters.AddWithValue("@available", item.Available);
        command.Parameters.AddWithValue("@stock", item.Stock);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task UpdateAsync(string id, UpdateMenuItemRequest changes, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE menu_items SET
                name = COALESCE(@name, name),
                description = COALESCE(@description, description),
                price = COALESCE(@price, price),
                category = COALESCE(@category, category),
                image = COALESCE(@image, image),
                stock = COALESCE(@stock, stock),
                available = COALESCE(@available, available),
                last_updated = UTC_TIMESTAMP(6)
            WHERE id = @id;
            """;
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@name", changes.Name);
        command.Parameters.AddWithValue("@description", changes.Description);
        command.Parameters.AddWithValue("@price", changes.Price);
        command.Parameters.AddWithValue("@category", changes.Category);
        command.Parameters.AddWithValue("@image", changes.Image);
        command.Parameters.AddWithValue("@stock", changes.Stock);
        command.Parameters.AddWithValue("@available", changes.Available);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static MenuItem ReadItem(MySqlDataReader row) => new()
    {
        Id = row.GetString(0),
        Name = row.GetString(1),
        Description = row.GetString(2),
        Price = row.GetDecimal(3),
        Category = row.GetString(4),
        Image = row.IsDBNull(5) ? null : row.GetString(5),
        Available = row.IsDBNull(6) ? null : row.GetBoolean(6),
        Stock = row.IsDBNull(7) ? null : row.GetInt32(7),
        LastUpdated = row.IsDBNull(8) ? null :
            DateTime.SpecifyKind(row.GetDateTime(8), DateTimeKind.Utc).ToString("O", CultureInfo.InvariantCulture)
    };
}
