using NomNom.Api.Models;

namespace NomNom.Api.Services;

internal interface IMenuService
{
    Task<IReadOnlyList<MenuItem>> ListAsync(string? category, string? search, CancellationToken cancellationToken);
    Task<MenuItem> GetAsync(string id, CancellationToken cancellationToken);
}