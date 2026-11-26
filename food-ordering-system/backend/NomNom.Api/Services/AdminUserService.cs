using NomNom.Api.Contracts;
using NomNom.Api.Repositories;

namespace NomNom.Api.Services;

internal sealed class AdminUserService(IAccountRepository users) : IAdminUserService
{
    public Task<IReadOnlyList<DeletedUser>> ListDeletedAsync(
        AccountIdentity actor, CancellationToken cancellationToken)
    {
        EnsureAdministrator(actor);
        return users.ListDeletedAsync(cancellationToken);
    }

    public async Task DeleteAsync(
        AccountIdentity actor, string userId, CancellationToken cancellationToken)
    {
        EnsureAdministrator(actor);
        if (string.Equals(actor.UserId, userId, StringComparison.Ordinal))
            throw ApiError.Invalid("You cannot deactivate your own account.");

        var target = await users.FindByIdAsync(userId, cancellationToken)
            ?? throw ApiError.NotFound("Account not found.");
        if (string.Equals(target.Role, "admin", StringComparison.OrdinalIgnoreCase))
            throw ApiError.Invalid("Administrator accounts cannot be deactivated here.");
        if (!await users.SoftDeleteAsync(userId, cancellationToken))
            throw ApiError.NotFound("Account not found.");
    }

    public async Task RestoreAsync(
        AccountIdentity actor, string userId, CancellationToken cancellationToken)
    {
        EnsureAdministrator(actor);
        if (!await users.RestoreAsync(userId, cancellationToken))
            throw ApiError.NotFound("Deleted account not found.");
    }

    private static void EnsureAdministrator(AccountIdentity actor)
    {
        if (!actor.IsAdmin) throw new ApiError(403, "Administrator access is required.");
    }
}
