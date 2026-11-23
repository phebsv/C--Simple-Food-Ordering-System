using System.Text.Json.Serialization;

namespace NomNom.Api.Models;

[JsonConverter(typeof(JsonStringEnumConverter<OrderStatus>))]
public enum OrderStatus
{
    Pending,
    Preparing,
    Ready,
    Delivered,
    Cancelled
}

public sealed record Order
{
    public required string Id { get; init; }
    public required string CustomerId { get; init; }
    public required string CustomerName { get; init; }
    public required string CustomerEmail { get; init; }
    public required string CustomerPhone { get; init; }
    public required string CustomerAddress { get; init; }
    public required List<OrderItem> Items { get; init; }
    public required decimal Subtotal { get; init; }
    public required decimal Total { get; init; }
    public required OrderStatus Status { get; init; }
    public required string PaymentMethod { get; init; }
    public required string CreatedAt { get; init; }
    public required string UpdatedAt { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DeliveryNotes { get; init; }
}

public sealed record OrderItem
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Description { get; init; }
    public required decimal Price { get; init; }
    public required string Category { get; init; }
    public required int Quantity { get; init; }
}
