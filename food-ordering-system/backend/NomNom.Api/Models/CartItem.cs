namespace NomNom.Api.Models;

internal sealed record CartItem
{
    public required string Id { get; init; }
    public required string CustomerId { get; init; }
    public required string MenuId { get; init; }
    public required string Name { get; init; }
    public required string Description { get; init; }
    public required decimal Price { get; init; }
    public required string Category { get; init; }
    public required string Image { get; init; }
    public required int Quantity { get; init; }
}
