namespace NomNom.Api.Contracts;

public sealed record CartLine(
    string Id,
    string MenuId,
    string Name,
    string Description,
    decimal Price,
    string Category,
    string Image,
    int Quantity);

public sealed record AddCartItemRequest(string? MenuId);
public sealed record UpdateCartItemRequest(int? Quantity);
