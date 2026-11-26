using NomNom.Api.Contracts;
using System.Globalization;
using NomNom.Api.Models;
using NomNom.Api.Repositories;

namespace NomNom.Api.Services;

internal sealed class AdminOrderService(IOrderRepository orders) : IAdminOrderService
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

    public Task<IReadOnlyList<Order>> ListDeletedAsync(CancellationToken cancellationToken) =>
        orders.ListDeletedAsync(cancellationToken);

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        if (!await orders.SoftDeleteAsync(id, cancellationToken))
            throw ApiError.NotFound("Order not found.");
    }

    public async Task RestoreAsync(string id, CancellationToken cancellationToken)
    {
        if (!await orders.RestoreAsync(id, cancellationToken))
            throw ApiError.NotFound("Deleted order not found.");
    }

    public async Task<Order> UpdateStatusAsync(
        string id, UpdateOrderStatusRequest request, CancellationToken cancellationToken)
    {
        var wanted = request.Status?.Trim() ?? "";
        if (!Enum.GetNames<OrderStatus>().Contains(wanted, StringComparer.OrdinalIgnoreCase))
            throw ApiError.Invalid("Choose a valid status: Pending, Preparing, Ready, Delivered or Cancelled.");
        var next = Enum.Parse<OrderStatus>(wanted, ignoreCase: true);

        var order = await orders.FindAsync(id, null, cancellationToken)
            ?? throw ApiError.NotFound("Order not found.");
        if (!CanMove(order.Status, next))
            throw new ApiError(409, $"An order that is {order.Status} cannot be changed to {next}.");

        var changed = next == OrderStatus.Cancelled
            ? await orders.CancelAsync(id, cancellationToken)
            : await orders.TryUpdateStatusAsync(id, order.Status, next, cancellationToken);
        if (!changed) throw new ApiError(409, "This order was just updated. Refresh and try again.");

        return await orders.FindAsync(id, null, cancellationToken)
            ?? throw ApiError.NotFound("Order not found.");
    }

    private static bool CanMove(OrderStatus from, OrderStatus to) => (from, to) switch
    {
        (OrderStatus.Pending, OrderStatus.Preparing) => true,
        (OrderStatus.Preparing, OrderStatus.Ready) => true,
        (OrderStatus.Ready, OrderStatus.Delivered) => true,
        (OrderStatus.Pending or OrderStatus.Preparing, OrderStatus.Cancelled) => true,
        _ => false
    };
}