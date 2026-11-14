using NomNom.Api.Contracts;
using NomNom.Api.Models;

namespace NomNom.Api.Services;

internal interface ICheckoutService
{
    Task<Order> PlaceOrderAsync(
        AccountIdentity actor, CheckoutRequest request, CancellationToken cancellationToken);
}

internal interface ICustomerOrderService
{
    Task<IReadOnlyList<Order>> ListAsync(AccountIdentity actor, CancellationToken cancellationToken);
    Task<Order?> FindAsync(AccountIdentity actor, string orderId, CancellationToken cancellationToken);
}

// Checkout passes the same snapshot to both collaborators inside the store update.
// Collaborators work in memory so stock, cart, and order changes can commit together.
internal interface ICheckoutMenu
{
    MenuItem? Find(NomNomData data, string menuId);
    void DeductStock(NomNomData data, IReadOnlyList<OrderItem> items, string updatedAt);
}

internal interface ICheckoutCart
{
    IReadOnlyList<CartItem> GetItems(NomNomData data, string customerId);
    void Clear(NomNomData data, string customerId);
}
