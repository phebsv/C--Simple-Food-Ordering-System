using MySqlConnector;
using NomNom.Api.Contracts;
using NomNom.Api.Models;

namespace NomNom.Api.Repositories;

internal sealed class MySqlAccountRepository(MySqlDataSource dataSource) : IAccountRepository
{
    public Task<UserAccount?> FindByEmailAsync(string email, CancellationToken cancellationToken) =>
        FindAsync(email, byEmail: true, cancellationToken);

    public Task<UserAccount?> FindByIdAsync(string id, CancellationToken cancellationToken) =>
        FindAsync(id, byEmail: false, cancellationToken);

    private async Task<UserAccount?> FindAsync(string value, bool byEmail, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT id, email, name, role, password_hash, phone, address
            FROM users
            """;
        command.CommandText += byEmail
            ? " WHERE email = @value AND is_deleted = FALSE;"
            : " WHERE id = @value AND is_deleted = FALSE;";
        command.Parameters.AddWithValue("@value", value);
        await using var row = await command.ExecuteReaderAsync(cancellationToken);
        if (!await row.ReadAsync(cancellationToken)) return null;

        return new UserAccount
        {
            Id = row.GetString(0),
            Email = row.GetString(1),
            Name = row.GetString(2),
            Role = row.GetString(3),
            PasswordHash = row.GetString(4),
            Phone = row.IsDBNull(5) ? null : row.GetString(5),
            Address = row.IsDBNull(6) ? null : row.GetString(6)
        };
    }

    public async Task UpdateProfileAsync(
        string id, string? name, string? phone, string? address, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE users
            SET name = COALESCE(@name, name), phone = COALESCE(@phone, phone), address = COALESCE(@address, address)
            WHERE id = @id AND is_deleted = FALSE;
            """;
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@name", name);
        command.Parameters.AddWithValue("@phone", phone);
        command.Parameters.AddWithValue("@address", address);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<bool> TryChangePasswordAsync(
        string id, string currentHash, string newHash, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE users SET password_hash = @newHash
            WHERE id = @id AND password_hash = @currentHash AND is_deleted = FALSE;
            """;
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@newHash", newHash);
        command.Parameters.AddWithValue("@currentHash", currentHash);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    public async Task<bool> TryCreateAsync(UserAccount user, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO users (id, email, name, role, password_hash, phone, address)
            VALUES (@id, @email, @name, @role, @passwordHash, @phone, @address);
            """;
        command.Parameters.AddWithValue("@id", user.Id);
        command.Parameters.AddWithValue("@email", user.Email);
        command.Parameters.AddWithValue("@name", user.Name);
        command.Parameters.AddWithValue("@role", user.Role);
        command.Parameters.AddWithValue("@passwordHash", user.PasswordHash);
        command.Parameters.AddWithValue("@phone", user.Phone);
        command.Parameters.AddWithValue("@address", user.Address);

        try
        {
            await command.ExecuteNonQueryAsync(cancellationToken);
            return true;
        }
        catch (MySqlException error) when (error.ErrorCode == MySqlErrorCode.DuplicateKeyEntry)
        {
            return false;
        }
    }

    public async Task<IReadOnlyList<DeletedUser>> ListDeletedAsync(CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT id, name, email, role, deleted_at
            FROM users
            WHERE is_deleted = TRUE
            ORDER BY deleted_at DESC, id;
            """;
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
        var users = new List<DeletedUser>();
        while (await rows.ReadAsync(cancellationToken))
        {
            users.Add(new DeletedUser(
                rows.GetString(0),
                rows.GetString(1),
                rows.GetString(2),
                rows.GetString(3),
                rows.IsDBNull(4) ? null : rows.GetDateTime(4).ToString("O")));
        }
        return users;
    }

    public async Task<bool> SoftDeleteAsync(string id, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE users
            SET is_deleted = TRUE, deleted_at = UTC_TIMESTAMP(6)
            WHERE id = @id AND is_deleted = FALSE;
            """;
        command.Parameters.AddWithValue("@id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    public async Task<bool> RestoreAsync(string id, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE users
            SET is_deleted = FALSE, deleted_at = NULL
            WHERE id = @id AND is_deleted = TRUE;
            """;
        command.Parameters.AddWithValue("@id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }
}
