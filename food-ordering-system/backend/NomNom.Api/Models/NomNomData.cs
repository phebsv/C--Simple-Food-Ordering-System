using System.Text.Json;
using System.Text.Json.Serialization;

namespace NomNom.Api.Models;

internal sealed class NomNomData
{
    public List<UserAccount> Users { get; init; } = [];
    public List<MenuItem> Menu { get; init; } = [];
    public List<Order> Orders { get; init; } = [];
    public List<Review> Reviews { get; init; } = [];

    [JsonPropertyName("cart_items")]
    public List<CartItem> CartItems { get; init; } = [];

    // The application derives admins from users and inventory from menu stock.
    // Preserve these legacy collections without imposing a record schema.
    public List<JsonElement> Admins { get; init; } = [];
    public List<JsonElement> Inventory { get; init; } = [];
}
