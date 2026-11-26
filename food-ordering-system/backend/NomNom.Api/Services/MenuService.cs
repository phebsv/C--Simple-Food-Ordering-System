using NomNom.Api.Contracts;
using NomNom.Api.Models;
using NomNom.Api.Repositories;

namespace NomNom.Api.Services;

internal sealed class MenuService(IMenuRepository store) : IMenuService
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
        var stock = CleanStock(request.Stock);
        var available = request.Available ?? stock > 0;
        if (available && stock == 0)
            throw ApiError.Invalid("Set a stock above 0, or mark the item unavailable.");

        var item = new MenuItem
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = CleanName(request.Name),
            Description = CleanDescription(request.Description),
            Price = CleanPrice(request.Price),
            Category = CleanCategory(request.Category),
            Image = CleanImage(request.Image),
            Available = available,
            Stock = stock
        };
        await store.CreateAsync(item, cancellationToken);
        return await store.FindAsync(item.Id, cancellationToken) ?? item;
    }

    public async Task<MenuItem> UpdateAsync(
        string id, UpdateMenuItemRequest request, CancellationToken cancellationToken)
    {
        if (request.Name is null && request.Description is null && request.Price is null &&
            request.Category is null && request.Image is null && request.Stock is null &&
            request.Available is null)
            throw ApiError.Invalid("Send at least one field to change.");

        var current = await store.FindAsync(id, cancellationToken)
            ?? throw ApiError.NotFound("Menu item not found.");

        var stock = request.Stock is null ? current.Stock ?? 0 : CleanStock(request.Stock);
        var available = request.Available ?? current.Available ?? true;
        if (available && stock == 0)
        {
            if (request.Available == true)
                throw ApiError.Invalid("Set a stock above 0 before marking the item available.");
            available = false; // out of stock, so it can't stay available
        }

        var changes = new UpdateMenuItemRequest(
            Name: request.Name is null ? null : CleanName(request.Name),
            Description: request.Description is null ? null : CleanDescription(request.Description),
            Price: request.Price is null ? null : CleanPrice(request.Price),
            Category: request.Category is null ? null : CleanCategory(request.Category),
            Image: request.Image is null ? null : CleanImage(request.Image),
            Stock: request.Stock is null ? null : stock,
            Available: available);

        await store.UpdateAsync(id, changes, cancellationToken);
        return await store.FindAsync(id, cancellationToken)
            ?? throw ApiError.NotFound("Menu item not found.");
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        if (!await store.DeleteAsync(id, cancellationToken))
            throw ApiError.NotFound("Menu item not found.");
    }

    public async Task<IReadOnlyList<MenuItem>> ListDeletedAsync(CancellationToken cancellationToken) =>
        await store.ListDeletedAsync(cancellationToken);

    public async Task RestoreAsync(string id, CancellationToken cancellationToken)
    {
        if (!await store.RestoreAsync(id, cancellationToken))
            throw ApiError.NotFound("Deleted menu item not found.");
    }

    private static string CleanName(string? value)
    {
        var name = value?.Trim() ?? "";
        if (name.Length is 0 or > 80) throw ApiError.Invalid("Enter an item name up to 80 characters.");
        return name;
    }

    private static string CleanDescription(string? value)
    {
        var description = value?.Trim() ?? "";
        if (description.Length > 500) throw ApiError.Invalid("Description must fit within 500 characters.");
        return description;
    }

    private static string CleanCategory(string? value)
    {
        var category = value?.Trim() ?? "";
        if (category.Length is 0 or > 30) throw ApiError.Invalid("Enter a category up to 30 characters.");
        return category;
    }

    private static string CleanImage(string? value)
    {
        var image = value?.Trim() ?? "";
        if (image.Length > 2048) throw ApiError.Invalid("Image link is too long.");
        return image;
    }

    private static decimal CleanPrice(decimal? value)
    {
        if (value is null or <= 0 || value > 999_999_999_999.99m ||
            value != decimal.Round(value.Value, 2))
            throw ApiError.Invalid("Price must be greater than 0 with at most 2 decimal places.");
        return value.Value;
    }

    private static int CleanStock(int? value)
    {
        if (value is null or < 0) throw ApiError.Invalid("Stock must be a whole number of 0 or more.");
        return value.Value;
    }
}