using System.Globalization;
using NomNom.Api.Contracts;
using NomNom.Api.Models;
using NomNom.Api.Repositories;

namespace NomNom.Api.Services;

public sealed record CheckoutDetails(string Name, string Phone, string Address, string Payment, string? Notes);

internal sealed class CheckoutService(IOrderRepository orders, TimeProvider clock) : ICheckoutService
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
        return orders.PlaceAsync(
            actor.UserId, snapshot => BuildOrder(actor.UserId, delivery, expectedCart, snapshot), ct);
    }

    private Order BuildOrder(
        string customerId, CheckoutDetails delivery, IReadOnlyDictionary<string, int> expectedCart,
        CheckoutSnapshot snapshot)
    {
        var lines = snapshot.Lines;
        if (lines.Count == 0) throw ApiError.Invalid("Your cart is empty.");

        foreach (var line in lines)
        {
            if (line.Available != true || line.Stock is null || line.Item.Quantity < 1 ||
                line.Stock < line.Item.Quantity)
                throw new ApiError(409,
                    $"The requested quantity of {line.Item.Name} is unavailable. Review your cart.");
        }

        if (lines.Count != expectedCart.Count || lines.Any(line =>
                !expectedCart.TryGetValue(line.Item.Id, out var quantity) || quantity != line.Item.Quantity))
            throw new ApiError(409, "Your cart changed. Review it before placing your order.");

        var total = lines.Sum(line => line.Item.Price * line.Item.Quantity);
        if (total > 999_999_999_999.99m) throw ApiError.Invalid("The order total is too large.");

        var now = DateTime.SpecifyKind(clock.GetUtcNow().UtcDateTime, DateTimeKind.Utc)
            .ToString("yyyy-MM-dd'T'HH:mm:ss.ffffff'Z'", CultureInfo.InvariantCulture);
        return new Order
        {
            Id = Guid.NewGuid().ToString("N"),
            CustomerId = customerId,
            CustomerName = delivery.Name,
            CustomerEmail = snapshot.Email,
            CustomerPhone = delivery.Phone,
            CustomerAddress = delivery.Address,
            Items = lines.Select(line => line.Item).ToList(),
            Subtotal = total,
            Total = total,
            Status = OrderStatus.Pending,
            PaymentMethod = delivery.Payment,
            DeliveryNotes = delivery.Notes,
            CreatedAt = now,
            UpdatedAt = now
        };
    }
}

internal sealed class CustomerOrderService(IOrderRepository orders) : ICustomerOrderService
{
    public Task<IReadOnlyList<Order>> ListAsync(AccountIdentity actor, CancellationToken ct) =>
        orders.ListAsync(actor.UserId, ct);

    public Task<Order?> FindAsync(AccountIdentity actor, string orderId, CancellationToken ct) =>
        orders.FindAsync(orderId, actor.UserId, ct);
}
