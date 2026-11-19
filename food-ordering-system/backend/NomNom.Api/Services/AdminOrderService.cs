using System.Globalization;
using NomNom.Api.Models;
using NomNom.Api.Storage;

namespace NomNom.Api.Services;

internal sealed class AdminOrderService(MySqlOrderStore orders) : IAdminOrderService
{
    public async Task<IReadOnlyList<Order>> ListAsync(
        string? search, string? date, CancellationToken cancellationToken)
    {
        IEnumerable<Order> result = await orders.ListAllAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            result = result.Where(order => order.Id.Contains(term, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(date))
        {
            if (!DateOnly.TryParseExact(date.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var day))
                throw ApiError.Invalid("Use the date format yyyy-MM-dd.");
            var prefix = day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            result = result.Where(order => order.CreatedAt.StartsWith(prefix, StringComparison.Ordinal));
        }

        return result.ToList();
    }

    public async Task<Order> GetAsync(string id, CancellationToken cancellationToken) =>
        await orders.FindAsync(id, null, cancellationToken)
            ?? throw ApiError.NotFound("Order not found.");
}