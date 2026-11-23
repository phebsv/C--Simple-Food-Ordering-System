using NomNom.Api.Contracts;
using NomNom.Api.Models;
using NomNom.Api.Repositories;

namespace NomNom.Api.Services;

internal sealed record CheckoutDetails(string Name, string Phone, string Address, string Payment, string? Notes);

internal sealed class CheckoutService(MySqlOrderRepository orders) : ICheckoutService
{
    public Task<Order> PlaceOrderAsync(AccountIdentity actor, CheckoutRequest request, CancellationToken ct)
    {
        if (actor.IsAdmin) throw new ApiError(403, "Only customers can place orders.");

        var name = request.CustomerName?.Trim() ?? "";
        var phone = request.CustomerPhone?.Trim() ?? "";
        var address = request.CustomerAddress?.Trim() ?? "";
        var notes = request.DeliveryNotes?.Trim();
        if (name.Length is < 2 or > 50) throw ApiError.Invalid("Enter a name between 2 and 50 characters.");
        if (phone.Length == 0) throw ApiError.Invalid("Enter a delivery phone number.");
        AccountService.ValidatePhone(phone);
        if (address.Length is < 10 or > 300)
            throw ApiError.Invalid("Enter a delivery address between 10 and 300 characters.");
        if (notes?.Length > 300) throw ApiError.Invalid("Delivery notes must fit within 300 characters.");
        if (request.PaymentMethod is not ("cash" or "credit-card" or "debit-card" or "gcash" or "maya"))
            throw ApiError.Invalid("Choose a valid payment method.");

        if (request.Items is not { Count: > 0 }) throw ApiError.Invalid("Your cart is empty.");
        var expectedCart = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var item in request.Items)
        {
            if (item?.Id is not { Length: > 0 and <= 64 } || item.Quantity is not > 0 ||
                !expectedCart.TryAdd(item.Id, item.Quantity.Value))
                throw ApiError.Invalid("The checkout cart contains invalid items or quantities.");
        }

        var delivery = new CheckoutDetails(name, phone, address, request.PaymentMethod,
            string.IsNullOrEmpty(notes) ? null : notes);
        return orders.PlaceAsync(actor.UserId, delivery, expectedCart, ct);
    }
}

internal sealed class CustomerOrderService(MySqlOrderRepository orders) : ICustomerOrderService
{
    public Task<IReadOnlyList<Order>> ListAsync(AccountIdentity actor, CancellationToken ct) =>
        orders.ListAsync(actor.UserId, ct);

    public Task<Order?> FindAsync(AccountIdentity actor, string orderId, CancellationToken ct) =>
        orders.FindAsync(orderId, actor.UserId, ct);
}
