using NomNom.Api.Contracts;

namespace NomNom.Api.Services;

internal interface ICartService
{
    Task<IReadOnlyList<CartLine>> ListAsync(AccountIdentity actor, CancellationToken cancellationToken);
    Task<CartLine> AddAsync(AccountIdentity actor, AddCartItemRequest request, CancellationToken cancellationToken);
    Task<CartLine> SetQuantityAsync(
        AccountIdentity actor, string id, UpdateCartItemRequest request, CancellationToken cancellationToken);
}