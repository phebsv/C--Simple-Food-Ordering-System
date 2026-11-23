using NomNom.Api.Contracts;
using NomNom.Api.Models;
using NomNom.Api.Repositories;

namespace NomNom.Api.Services;

internal sealed class ReviewService(MySqlReviewRepository store, MySqlOrderRepository orders, TimeProvider clock)
    : IReviewService
{
    private const int MaxCommentLength = 500;

    public async Task<IReadOnlyList<Review>> ListAsync(CancellationToken cancellationToken) =>
        await store.ListAsync(cancellationToken);

    public async Task<Review> AddAsync(
        AccountIdentity actor, AddReviewRequest request, CancellationToken cancellationToken)
    {
        var orderId = request.OrderId?.Trim() ?? "";
        var foodItemId = request.FoodItemId?.Trim() ?? "";
        if (orderId.Length == 0 || foodItemId.Length == 0)
            throw ApiError.Invalid("Choose an order item to review.");

        if (request.Rating is not (>= 1 and <= 5))
            throw ApiError.Invalid("Rating must be a whole number from 1 to 5.");

        var comment = (request.Comment ?? "").Trim();
        if (comment.Length > MaxCommentLength)
            throw ApiError.Invalid($"Please keep your review under {MaxCommentLength} characters.");

        // Passing the customer id means another customer's order is simply "not found".
        var order = await orders.FindAsync(orderId, actor.UserId, cancellationToken)
            ?? throw ApiError.NotFound("Order not found.");
        if (order.Status != OrderStatus.Delivered)
            throw ApiError.Invalid("You can only review delivered orders.");

        var item = order.Items.FirstOrDefault(i => i.Id == foodItemId)
            ?? throw ApiError.Invalid("That item is not part of this order.");

        // Names come from the stored order, never from the browser.
        var now = clock.GetUtcNow().UtcDateTime;
        var review = new Review
        {
            Id = Guid.NewGuid().ToString("N"),
            OrderId = order.Id,
            CustomerId = actor.UserId,
            CustomerName = order.CustomerName,
            FoodItemId = item.Id,
            FoodItemName = item.Name,
            Rating = request.Rating.Value,
            Comment = comment,
            CreatedAt = MySqlReviewRepository.Timestamp(now),
            Hidden = false
        };

        if (!await store.TryInsertAsync(review, now, cancellationToken))
            throw ApiError.Invalid("You already reviewed this item.");

        return review;
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        if (!await store.DeleteAsync(id, cancellationToken))
            throw ApiError.NotFound("Review not found.");
    }
}
