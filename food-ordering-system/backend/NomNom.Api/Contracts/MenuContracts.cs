namespace NomNom.Api.Contracts;

public sealed record CreateMenuItemRequest(
    string? Name,
    string? Description,
    decimal? Price,
    string? Category,
    string? Image,
    int? Stock,
    bool? Available);

public sealed record UpdateMenuItemRequest(
    string? Name,
    string? Description,
    decimal? Price,
    string? Category,
    string? Image,
    int? Stock,
    bool? Available);
