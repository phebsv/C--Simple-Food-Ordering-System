using System.Globalization;
using MySqlConnector;
using NomNom.Api.Models;

namespace NomNom.Api.Repositories;

internal sealed class MySqlReviewRepository(MySqlDataSource dataSource) : IReviewRepository
{
    public async Task<List<Review>> ListAsync(CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT id, order_id, customer_id, customer_name, food_item_id, food_item_name,
                   rating, comment, created_at, hidden
            FROM reviews
            ORDER BY created_at DESC, id;
            """;
        await using var rows = await command.ExecuteReaderAsync(cancellationToken);
        var reviews = new List<Review>();
        while (await rows.ReadAsync(cancellationToken)) reviews.Add(ReadReview(rows));
        return reviews;
    }

    /// <summary>Returns false when this order item has already been reviewed.</summary>
    public async Task<bool> TryInsertAsync(Review review, DateTime createdAtUtc, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO reviews (id, order_id, customer_id, customer_name, food_item_id, food_item_name,
                                 rating, comment, created_at, hidden)
            VALUES (@id, @orderId, @customerId, @customerName, @foodItemId, @foodItemName,
                    @rating, @comment, @createdAt, FALSE);
            """;
        command.Parameters.AddWithValue("@id", review.Id);
        command.Parameters.AddWithValue("@orderId", review.OrderId);
        command.Parameters.AddWithValue("@customerId", review.CustomerId);
        command.Parameters.AddWithValue("@customerName", review.CustomerName);
        command.Parameters.AddWithValue("@foodItemId", review.FoodItemId);
        command.Parameters.AddWithValue("@foodItemName", review.FoodItemName);
        command.Parameters.AddWithValue("@rating", review.Rating);
        command.Parameters.AddWithValue("@comment", review.Comment);
        command.Parameters.AddWithValue("@createdAt", createdAtUtc);
        try
        {
            await command.ExecuteNonQueryAsync(cancellationToken);
            return true;
        }
        catch (MySqlException ex) when (ex.ErrorCode == MySqlErrorCode.DuplicateKeyEntry)
        {
            // The table allows one review per order item (uq_review_order_item).
            return false;
        }
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM reviews WHERE id = @id;";
        command.Parameters.AddWithValue("@id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    internal static string Timestamp(DateTime value) =>
        DateTime.SpecifyKind(value, DateTimeKind.Utc)
            .ToString("yyyy-MM-dd'T'HH:mm:ss.ffffff'Z'", CultureInfo.InvariantCulture);

    private static Review ReadReview(MySqlDataReader row) => new()
    {
        Id = row.GetString(0),
        OrderId = row.GetString(1),
        CustomerId = row.GetString(2),
        CustomerName = row.GetString(3),
        FoodItemId = row.GetString(4),
        FoodItemName = row.GetString(5),
        Rating = row.GetByte(6),
        Comment = row.GetString(7),
        CreatedAt = Timestamp(row.GetDateTime(8)),
        Hidden = row.GetBoolean(9)
    };
}
