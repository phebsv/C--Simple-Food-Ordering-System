using NomNom.Api.Contracts;

namespace NomNom.Api.Services;

public interface ICartService
{
    Task<IReadOnlyList<CartLine>> ListAsync(AccountIdentity actor, CancellationToken cancellationToken);
    Task<CartLine> AddAsync(AccountIdentity actor, AddCartItemRequest request, CancellationToken cancellationToken);
    Task<CartLine> SetQuantityAsync(
        AccountIdentity actor, string id, UpdateCartItemRequest request, CancellationToken cancellationToken);
    Task RemoveAsync(AccountIdentity actor, string id, CancellationToken cancellationToken);
    Task ClearAsync(AccountIdentity actor, CancellationToken cancellationToken);
}