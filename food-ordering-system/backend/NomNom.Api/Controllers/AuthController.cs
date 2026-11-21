using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNom.Api.Contracts;
using NomNom.Api.Services;

namespace NomNom.Api.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthController(IAccountService accounts, ISessionService sessions) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct) =>
        new JsonResult(await accounts.RegisterAsync(request, ct))
        {
            StatusCode = StatusCodes.Status201Created
        };

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct) =>
        Ok(await accounts.LoginAsync(request, ct));

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var token = await HttpContext.GetTokenAsync(SessionAuthenticationHandler.SchemeName,
            SessionAuthenticationHandler.SessionTokenName);
        if (token is null) return Challenge();

        await sessions.RevokeAsync(token, ct);
        Response.Headers.CacheControl = "no-store";
        return NoContent();
    }

    [Authorize]
    [HttpGet("session")]
    public IActionResult Session()
    {
        Response.Headers.CacheControl = "no-store";
        return NoContent();
    }
}
