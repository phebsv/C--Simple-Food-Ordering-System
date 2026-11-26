using NomNom.Api.Contracts;
using NomNom.Api.Models;

namespace NomNom.Api.Services;

public interface IReviewService
{
    Task<IReadOnlyList<Review>> ListAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<Review>> ListDeletedAsync(CancellationToken cancellationToken);
    Task<Review> AddAsync(AccountIdentity actor, AddReviewRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(string id, CancellationToken cancellationToken);
    Task RestoreAsync(string id, CancellationToken cancellationToken);
}
