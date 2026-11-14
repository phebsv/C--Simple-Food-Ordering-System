using NomNom.Api.Models;
using NomNom.Api.Storage;
using NomNom.Api.Contracts;

namespace NomNom.Api.Services;

internal sealed class MenuService(MySqlMenuStore store) : IMenuService
{
    public async Task<IReadOnlyList<MenuItem>> ListAsync(
        string? category, string? search, CancellationToken cancellationToken)
    {
        IEnumerable<MenuItem> items = await store.ListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var wanted = category.Trim();
            items = items.Where(item =>
                string.Equals(item.Category, wanted, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            items = items.Where(item =>
                item.Name.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                item.Description.Contains(term, StringComparison.OrdinalIgnoreCase));
        }

        return items.ToList();
    }
    public async Task<MenuItem> GetAsync(string id, CancellationToken cancellationToken)
    {
        return await store.FindAsync(id, cancellationToken)
            ?? throw ApiError.NotFound("Menu item not found.");
    }

    public async Task<MenuItem> CreateAsync(CreateMenuItemRequest request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim() ?? "";
        var description = request.Description?.Trim() ?? "";
        var category = request.Category?.Trim() ?? "";
        var image = request.Image?.Trim() ?? "";

        if (name.Length is 0 or > 80) throw ApiError.Invalid("Enter an item name up to 80 characters.");
        if (description.Length > 500) throw ApiError.Invalid("Description must fit within 500 characters.");
        if (category.Length is 0 or > 30) throw ApiError.Invalid("Enter a category up to 30 characters.");
        if (image.Length > 2048) throw ApiError.Invalid("Image link is too long.");
        if (request.Price is null or <= 0 || request.Price > 999_999_999_999.99m ||
            request.Price != decimal.Round(request.Price.Value, 2))
            throw ApiError.Invalid("Price must be greater than 0 with at most 2 decimal places.");
        if (request.Stock is null or < 0) throw ApiError.Invalid("Stock must be a whole number of 0 or more.");

        var stock = request.Stock.Value;
        var available = request.Available ?? stock > 0;
        if (available && stock == 0)
            throw ApiError.Invalid("Set a stock above 0, or mark the item unavailable.");

        var item = new MenuItem
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = name,
            Description = description,
            Price = request.Price.Value,
            Category = category,
            Image = image,
            Available = available,
            Stock = stock
        };
        await store.CreateAsync(item, cancellationToken);
        return await store.FindAsync(item.Id, cancellationToken) ?? item;
    }
}
