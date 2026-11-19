using NomNom.Api.Models;

namespace NomNom.Api.Services;

internal interface IAdminOrderService
{
    Task<IReadOnlyList<Order>> ListAsync(string? search, string? date, CancellationToken cancellationToken);
    Task<Order> GetAsync(string id, CancellationToken cancellationToken);
}