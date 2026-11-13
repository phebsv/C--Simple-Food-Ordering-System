using NomNom.Api.Contracts;
using NomNom.Api.Models;

namespace NomNom.Api.Services;

internal sealed record AccountIdentity(string UserId, bool IsAdmin);

internal interface IAccountService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
}

internal interface ISessionService
{
    Task<string> IssueAsync(AccountIdentity account, CancellationToken cancellationToken);
    Task<AccountIdentity?> ValidateAsync(string token, CancellationToken cancellationToken);
    Task RevokeAsync(string token, CancellationToken cancellationToken);
}

internal interface IProfileService
{
    Task<PublicUser?> GetAsync(AccountIdentity actor, string userId, CancellationToken cancellationToken);

    Task<PublicUser?> UpdateAsync(
        AccountIdentity actor, string userId, UpdateProfileRequest request, CancellationToken cancellationToken);

    Task ChangePasswordAsync(
        AccountIdentity actor, string userId, ChangePasswordRequest request, CancellationToken cancellationToken);
}
