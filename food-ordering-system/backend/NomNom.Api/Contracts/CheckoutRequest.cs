namespace NomNom.Api.Contracts;

public sealed record CheckoutRequest(
    string? CustomerName,
    string? CustomerPhone,
    string? CustomerAddress,
    string? PaymentMethod,
    string? DeliveryNotes,
    List<CheckoutItemRequest?>? Items);

public sealed record CheckoutItemRequest(string? Id, int? Quantity);
