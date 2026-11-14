using Microsoft.AspNetCore.Authentication;
using NomNom.Api.Contracts;
using NomNom.Api.Services;

namespace NomNom.Api;

internal static class NomNomRoutes
{
    public static void MapNomNomRoutes(this WebApplication app)
    {
        app.MapPost("/auth/register", async (RegisterRequest request, IAccountService service, CancellationToken ct) =>
            Results.Json(await service.RegisterAsync(request, ct), statusCode: 201));
        app.MapPost("/auth/login", (LoginRequest request, IAccountService service, CancellationToken ct) =>
            service.LoginAsync(request, ct));
        app.MapPost("/auth/logout", async (HttpContext context, ISessionService sessions, CancellationToken ct) =>
        {
            var token = await context.GetTokenAsync(SessionAuthenticationHandler.SchemeName,
                SessionAuthenticationHandler.SessionTokenName);
            if (token is null) return Results.Challenge();

            await sessions.RevokeAsync(token, ct);
            context.Response.Headers.CacheControl = "no-store";
            return Results.NoContent();
        }).RequireAuthorization();
        app.MapGet("/auth/session", (HttpContext context) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            return Results.NoContent();
        }).RequireAuthorization();
        app.MapGet("/menu", async (string? category, string? search, IMenuService service, CancellationToken ct) =>
            Results.Ok(await service.ListAsync(category, search, ct)));
        app.MapGet("/menu/{id}", async (string id, IMenuService service, CancellationToken ct) =>
            Results.Ok(await service.GetAsync(id, ct)));
        app.MapPost("/menu", async (CreateMenuItemRequest request, IMenuService service, CancellationToken ct) =>
            Results.Json(await service.CreateAsync(request, ct), statusCode: 201))
            .RequireAuthorization(AccessPolicies.Administrator);
        app.MapPatch("/menu/{id}", async (string id, UpdateMenuItemRequest request, IMenuService service, CancellationToken ct) =>
            Results.Ok(await service.UpdateAsync(id, request, ct)))
            .RequireAuthorization(AccessPolicies.Administrator);
    }
}
