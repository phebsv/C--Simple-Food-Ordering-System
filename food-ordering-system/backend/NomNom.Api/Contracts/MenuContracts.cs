namespace NomNom.Api.Contracts;

internal sealed record CreateMenuItemRequest(
    string? Name,
    string? Description,
    decimal? Price,
    string? Category,
    string? Image,
    int? Stock,
    bool? Available);

internal sealed record UpdateMenuItemRequest(
    string? Name,
    string? Description,
    decimal? Price,
    string? Category,
    string? Image,
    int? Stock,
    bool? Available);