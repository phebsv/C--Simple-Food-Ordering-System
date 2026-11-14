using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace NomNom.Api.Services;

internal sealed class SessionService : ISessionService
{
    private readonly ConcurrentDictionary<string, Session> sessions = new();
    private sealed record Session(AccountIdentity Account, DateTimeOffset ExpiresAt);

    public Task<string> IssueAsync(AccountIdentity account, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var now = DateTimeOffset.UtcNow;
        foreach (var (key, session) in sessions)
        {
            if (session.ExpiresAt <= now) sessions.TryRemove(key, out _);
        }

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        sessions[token] = new Session(account, now.AddHours(24));
        return Task.FromResult(token);
    }

    public Task<AccountIdentity?> ValidateAsync(string token, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!sessions.TryGetValue(token, out var session)) return Task.FromResult<AccountIdentity?>(null);
        if (session.ExpiresAt > DateTimeOffset.UtcNow) return Task.FromResult<AccountIdentity?>(session.Account);
        sessions.TryRemove(token, out _);
        return Task.FromResult<AccountIdentity?>(null);
    }

    public Task RevokeAsync(string token, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        sessions.TryRemove(token, out _);
        return Task.CompletedTask;
    }
}
