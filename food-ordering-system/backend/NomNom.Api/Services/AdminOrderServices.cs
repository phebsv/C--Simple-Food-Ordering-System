using NomNom.Api.Contracts;
using NomNom.Api.Models;

namespace NomNom.Api.Services;

public interface IAdminOrderService
{
    Task<IReadOnlyList<Order>> ListAsync(string? search, string? date, CancellationToken cancellationToken);
    Task<Order> GetAsync(string id, CancellationToken cancellationToken);
    Task<Order> UpdateStatusAsync(string id, UpdateOrderStatusRequest request, CancellationToken cancellationToken);
}