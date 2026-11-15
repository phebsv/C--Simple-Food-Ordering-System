namespace NomNom.Api.Contracts;

internal sealed record CartLine(
    string Id,
    string MenuId,
    string Name,
    string Description,
    decimal Price,
    string Category,
    string Image,
    int Quantity);

internal sealed record AddCartItemRequest(string? MenuId);
internal sealed record UpdateCartItemRequest(int? Quantity);