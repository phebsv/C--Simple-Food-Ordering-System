using NomNom.Api.Contracts;
using NomNom.Api.Models;
using NomNom.Api.Repositories;

namespace NomNom.Api.Services;

internal sealed class CartService(MySqlCartRepository store, MySqlMenuRepository menu) : ICartService
{
    public async Task<IReadOnlyList<CartLine>> ListAsync(
        AccountIdentity actor, CancellationToken cancellationToken)
    {
        var items = await store.ListAsync(actor.UserId, cancellationToken);
        return items.Select(ToLine).ToList();
    }

    public async Task<CartLine> AddAsync(
        AccountIdentity actor, AddCartItemRequest request, CancellationToken cancellationToken)
    {
        var menuId = request.MenuId?.Trim() ?? "";
        if (menuId.Length == 0) throw ApiError.Invalid("Choose a menu item to add.");

        var menuItem = await menu.FindAsync(menuId, cancellationToken)
            ?? throw ApiError.NotFound("Menu item not found.");
        var stock = menuItem.Stock ?? 0;
        if (menuItem.Available != true || stock <= 0)
            throw ApiError.Invalid("This item is currently unavailable.");

        var existing = await store.FindByMenuAsync(actor.UserId, menuId, cancellationToken);
        if (existing is null)
        {
            var line = new CartItem
            {
                Id = Guid.NewGuid().ToString("N"),
                CustomerId = actor.UserId,
                MenuId = menuItem.Id,
                Name = menuItem.Name,
                Description = menuItem.Description,
                Price = menuItem.Price,
                Category = menuItem.Category,
                Image = menuItem.Image ?? "",
                Quantity = 1
            };
            if (await store.TryInsertAsync(line, cancellationToken)) return ToLine(line);

            // A parallel request added the same item first, so add to that line instead.
            existing = await store.FindByMenuAsync(actor.UserId, menuId, cancellationToken)
                ?? throw ApiError.NotFound("Cart item not found.");
        }

        if (existing.Quantity >= stock) throw ApiError.Invalid($"Only {stock} left in stock.");
        var updated = existing with { Quantity = existing.Quantity + 1 };
        await store.SetQuantityAsync(updated.Id, updated.Quantity, cancellationToken);
        return ToLine(updated);
    }

    public async Task<CartLine> SetQuantityAsync(
        AccountIdentity actor, string id, UpdateCartItemRequest request, CancellationToken cancellationToken)
    {
        if (request.Quantity is null or < 1)
            throw ApiError.Invalid("Quantity must be a whole number of 1 or more.");
        var quantity = request.Quantity.Value;

        var line = await store.FindAsync(id, cancellationToken);
        if (line is null || !string.Equals(line.CustomerId, actor.UserId, StringComparison.Ordinal))
            throw ApiError.NotFound("Cart item not found.");

        if (quantity > line.Quantity)
        {
            var menuItem = await menu.FindAsync(line.MenuId, cancellationToken);
            var stock = menuItem?.Stock ?? 0;
            if (menuItem is null || menuItem.Available != true || stock <= 0)
                throw ApiError.Invalid("This item is currently unavailable.");
            if (quantity > stock) throw ApiError.Invalid($"Only {stock} left in stock.");
        }

        await store.SetQuantityAsync(id, quantity, cancellationToken);
        return ToLine(line with { Quantity = quantity });
    }

    public async Task RemoveAsync(AccountIdentity actor, string id, CancellationToken cancellationToken)
    {
        if (!await store.DeleteAsync(actor.UserId, id, cancellationToken))
            throw ApiError.NotFound("Cart item not found.");
    }

    public Task ClearAsync(AccountIdentity actor, CancellationToken cancellationToken) =>
        store.ClearAsync(actor.UserId, cancellationToken);

    private static CartLine ToLine(CartItem item) => new(
        item.Id, item.MenuId, item.Name, item.Description,
        item.Price, item.Category, item.Image, item.Quantity);
}