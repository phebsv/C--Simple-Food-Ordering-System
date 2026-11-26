using System.Globalization;
using MySqlConnector;
using NomNom.Api.Models;
using NomNom.Api.Contracts;

namespace NomNom.Api.Repositories;

internal sealed class MySqlMenuRepository(MySqlDataSource dataSource) : IMenuRepository
{
    private const string SelectItems = """
        SELECT id, name, description, price, category, image, available, stock, last_updated
        FROM menu_items
        """;

    public async Task<List<MenuItem>> ListAsync(CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = SelectItems + "\nWHERE is_deleted = FALSE\nORDER BY display_order;";
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
        var items = new List<MenuItem>();
        while (await rows.ReadAsync(cancellationToken)) items.Add(ReadItem(rows));
        return items;
    }

    public async Task<MenuItem?> FindAsync(string id, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = SelectItems + "\nWHERE id = @id AND is_deleted = FALSE;";
        command.Parameters.AddWithValue("@id", id);
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
        return await rows.ReadAsync(cancellationToken) ? ReadItem(rows) : null;
    }

    public async Task<List<MenuItem>> ListDeletedAsync(CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = SelectItems + "\nWHERE is_deleted = TRUE\nORDER BY deleted_at DESC, display_order;";
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
        var items = new List<MenuItem>();
        while (await rows.ReadAsync(cancellationToken)) items.Add(ReadItem(rows));
        return items;
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
            WHERE id = @id AND is_deleted = FALSE;
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

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await using var archive = connection.CreateCommand();
        archive.Transaction = transaction;
        archive.CommandText = """
            UPDATE menu_items
            SET is_deleted = TRUE, deleted_at = UTC_TIMESTAMP(6),
                deleted_available = available, available = FALSE
            WHERE id = @id AND is_deleted = FALSE;
            """;
        archive.Parameters.AddWithValue("@id", id);
        var deleted = await archive.ExecuteNonQueryAsync(cancellationToken);
        if (deleted == 0)
        {
            await transaction.RollbackAsync(cancellationToken);
            return false;
        }

        await using var clearCarts = connection.CreateCommand();
        clearCarts.Transaction = transaction;
        clearCarts.CommandText = """
            UPDATE cart_items SET deleted_at = UTC_TIMESTAMP(6)
            WHERE menu_id = @id AND deleted_at IS NULL;
            """;
        clearCarts.Parameters.AddWithValue("@id", id);
        await clearCarts.ExecuteNonQueryAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return deleted > 0;
    }

    public async Task<bool> RestoreAsync(string id, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE menu_items
            SET is_deleted = FALSE, deleted_at = NULL,
                available = COALESCE(deleted_available, FALSE) AND stock > 0,
                deleted_available = NULL
            WHERE id = @id AND is_deleted = TRUE;
            """;
        command.Parameters.AddWithValue("@id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
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
