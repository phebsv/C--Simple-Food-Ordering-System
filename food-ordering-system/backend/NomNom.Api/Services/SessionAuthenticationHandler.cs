using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using NomNom.Api.Repositories;

namespace NomNom.Api.Services;

internal sealed class SessionAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    ISessionService sessions,
    IAccountRepository accounts) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Bearer";
    public const string SessionTokenName = "access_token";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorization = Request.Headers.Authorization;
        if (authorization.Count == 0) return AuthenticateResult.NoResult();

        if (authorization.Count != 1 ||
            !AuthenticationHeaderValue.TryParse(authorization[0], out var header) ||
            !string.Equals(header.Scheme, SchemeName, StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrEmpty(header.Parameter))
            return AuthenticateResult.Fail("Invalid authorization header.");

        var account = await sessions.ValidateAsync(header.Parameter, Context.RequestAborted);
        if (account is null) return AuthenticateResult.Fail("Invalid or expired session.");
        if (await accounts.FindByIdAsync(account.UserId, Context.RequestAborted) is null)
            return AuthenticateResult.Fail("Account is inactive.");

        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, account.UserId),
            new Claim(ClaimTypes.Role, account.IsAdmin ? "admin" : "user")
        ], Scheme.Name);
        var properties = new AuthenticationProperties();
        properties.StoreTokens([new AuthenticationToken { Name = SessionTokenName, Value = header.Parameter }]);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), properties, Scheme.Name));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.Headers.WWWAuthenticate = SchemeName;
        Response.Headers.CacheControl = "no-store";
        return Results.Json(new { message = "Invalid or expired session. Please log in." },
            statusCode: StatusCodes.Status401Unauthorized).ExecuteAsync(Context);
    }

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        Response.Headers.CacheControl = "no-store";
        return Results.Json(new { message = "Forbidden." },
            statusCode: StatusCodes.Status403Forbidden).ExecuteAsync(Context);
    }
}
