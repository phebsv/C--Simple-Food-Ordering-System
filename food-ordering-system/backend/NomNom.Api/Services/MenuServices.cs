using NomNom.Api.Models;
using NomNom.Api.Contracts;

namespace NomNom.Api.Services;

internal interface IMenuService
{
    Task<IReadOnlyList<MenuItem>> ListAsync(string? category, string? search, CancellationToken cancellationToken);
    Task<MenuItem> GetAsync(string id, CancellationToken cancellationToken);
    Task<MenuItem> CreateAsync(CreateMenuItemRequest request, CancellationToken cancellationToken);
}