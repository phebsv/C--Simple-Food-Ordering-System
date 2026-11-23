namespace NomNom.Api.Models;

public sealed record Review
{
    public required string Id { get; init; }
    public required string OrderId { get; init; }
    public required string CustomerId { get; init; }
    public required string CustomerName { get; init; }
    public required string FoodItemId { get; init; }
    public required string FoodItemName { get; init; }
    public required int Rating { get; init; }
    public required string Comment { get; init; }
    public required string CreatedAt { get; init; }
    public required bool Hidden { get; init; }
}
