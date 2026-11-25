using NomNom.Api.Contracts;
using NomNom.Api.Models;
using NomNom.Api.Services;

namespace NomNom.Api.Repositories;

internal interface IAccountRepository
{
    Task<UserAccount?> FindByEmailAsync(string email, CancellationToken cancellationToken);
    Task<UserAccount?> FindByIdAsync(string id, CancellationToken cancellationToken);
    Task UpdateProfileAsync(
        string id, string? name, string? phone, string? address, CancellationToken cancellationToken);
    Task<bool> TryChangePasswordAsync(
        string id, string currentHash, string newHash, CancellationToken cancellationToken);
    Task<bool> TryCreateAsync(UserAccount user, CancellationToken cancellationToken);
}

internal interface ICartRepository
{
    Task<List<CartItem>> ListAsync(string customerId, CancellationToken cancellationToken);
    Task<CartItem?> FindByMenuAsync(string customerId, string menuId, CancellationToken cancellationToken);
    Task<CartItem?> FindAsync(string id, CancellationToken cancellationToken);
    Task<bool> TryInsertAsync(CartItem item, CancellationToken cancellationToken);
    Task SetQuantityAsync(string id, int quantity, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(string customerId, string id, CancellationToken cancellationToken);
    Task ClearAsync(string customerId, CancellationToken cancellationToken);
}

internal interface IMenuRepository
{
    Task<List<MenuItem>> ListAsync(CancellationToken cancellationToken);
    Task<MenuItem?> FindAsync(string id, CancellationToken cancellationToken);
    Task CreateAsync(MenuItem item, CancellationToken cancellationToken);
    Task UpdateAsync(string id, UpdateMenuItemRequest changes, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
}

internal interface IOrderRepository
{
    Task<Order> PlaceAsync(
        string customerId, CheckoutDetails delivery, IReadOnlyDictionary<string, int> expectedCart,
        CancellationToken ct);
    Task<IReadOnlyList<Order>> ListAsync(string customerId, CancellationToken ct);
    Task<IReadOnlyList<Order>> ListAllAsync(CancellationToken ct);
    Task<Order?> FindAsync(string orderId, string? customerId, CancellationToken ct);
    Task<bool> TryUpdateStatusAsync(
        string orderId, OrderStatus expected, OrderStatus next, CancellationToken ct);
    Task<bool> CancelAsync(string orderId, CancellationToken ct);
}

internal interface IReviewRepository
{
    Task<List<Review>> ListAsync(CancellationToken cancellationToken);
    Task<bool> TryInsertAsync(
        Review review, DateTime createdAtUtc, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
}
