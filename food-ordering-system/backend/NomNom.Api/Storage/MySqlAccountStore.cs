using MySqlConnector;
using NomNom.Api.Models;

namespace NomNom.Api.Storage;

internal sealed class MySqlAccountStore(MySqlDataSource dataSource)
{
    public async Task<UserAccount?> FindByEmailAsync(string email, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT id, email, name, role, password_hash, phone, address
            FROM users
            WHERE email = @email;
            """;
        command.Parameters.AddWithValue("@email", email);
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
}
