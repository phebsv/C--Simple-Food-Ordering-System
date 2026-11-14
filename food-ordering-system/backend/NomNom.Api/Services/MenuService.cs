using NomNom.Api.Models;
using NomNom.Api.Storage;

namespace NomNom.Api.Services;

internal sealed class MenuService(INomNomStore store) : IMenuService
{
    public async Task<IReadOnlyList<MenuItem>> ListAsync(
        string? category, string? search, CancellationToken cancellationToken)
    {
        var data = await store.ReadAsync(cancellationToken);
        IEnumerable<MenuItem> items = data.Menu;

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
        var data = await store.ReadAsync(cancellationToken);
        return data.Menu.Find(item => item.Id == id)
            ?? throw ApiError.NotFound("Menu item not found.");
    }
}