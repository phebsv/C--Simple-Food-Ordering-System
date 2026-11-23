using NomNom.Api.Contracts;
using NomNom.Api.Models;

namespace NomNom.Api.Services;

public interface ICheckoutService
{
    Task<Order> PlaceOrderAsync(
        AccountIdentity actor, CheckoutRequest request, CancellationToken cancellationToken);
}

public interface ICustomerOrderService
{
    Task<IReadOnlyList<Order>> ListAsync(AccountIdentity actor, CancellationToken cancellationToken);
    Task<Order?> FindAsync(AccountIdentity actor, string orderId, CancellationToken cancellationToken);
}
