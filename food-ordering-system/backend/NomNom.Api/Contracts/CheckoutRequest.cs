namespace NomNom.Api.Contracts;

internal sealed record CheckoutRequest(
    string? CustomerName,
    string? CustomerPhone,
    string? CustomerAddress,
    string? PaymentMethod,
    string? DeliveryNotes,
    List<CheckoutItemRequest?>? Items);

internal sealed record CheckoutItemRequest(string? Id, int? Quantity);
