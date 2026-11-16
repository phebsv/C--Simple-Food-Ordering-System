using Microsoft.AspNetCore.Authentication;
using NomNom.Api.Contracts;
using NomNom.Api.Services;
using System.Security.Claims;

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
        app.MapDelete("/menu/{id}", async (string id, IMenuService service, CancellationToken ct) =>
        {
            await service.DeleteAsync(id, ct);
            return Results.NoContent();
        }).RequireAuthorization(AccessPolicies.Administrator);
        app.MapGet("/cart_items", async (ClaimsPrincipal user, ICartService service, CancellationToken ct) =>
            Results.Ok(await service.ListAsync(Actor(user), ct)))
            .RequireAuthorization();
        app.MapPost("/cart_items", async (AddCartItemRequest request, ClaimsPrincipal user, ICartService service, CancellationToken ct) =>
            Results.Ok(await service.AddAsync(Actor(user), request, ct)))
            .RequireAuthorization();
        app.MapPatch("/cart_items/{id}", async (string id, UpdateCartItemRequest request, ClaimsPrincipal user, ICartService service, CancellationToken ct) =>
            Results.Ok(await service.SetQuantityAsync(Actor(user), id, request, ct)))
            .RequireAuthorization();
        app.MapDelete("/cart_items/{id}", async (string id, ClaimsPrincipal user, ICartService service, CancellationToken ct) =>
        {
            await service.RemoveAsync(Actor(user), id, ct);
            return Results.NoContent();
        }).RequireAuthorization();
        app.MapDelete("/cart_items", async (ClaimsPrincipal user, ICartService service, CancellationToken ct) =>
        {
            await service.ClearAsync(Actor(user), ct);
            return Results.NoContent();
        }).RequireAuthorization();

        var profiles = app.MapGroup("/users/{id}").RequireAuthorization();
        profiles.MapGet("", async (string id, ClaimsPrincipal user, IProfileService service, CancellationToken ct) =>
            Results.Ok(await service.GetAsync(Actor(user), id, ct)));
        profiles.MapPatch("", async (string id, UpdateProfileRequest request, ClaimsPrincipal user,
            IProfileService service, CancellationToken ct) =>
            Results.Ok(await service.UpdateAsync(Actor(user), id, request, ct)));
        profiles.MapPost("/password", async (string id, ChangePasswordRequest request, ClaimsPrincipal user,
            IProfileService service, CancellationToken ct) =>
        {
            await service.ChangePasswordAsync(Actor(user), id, request, ct);
            return Results.NoContent();
        });

        var orders = app.MapGroup("/orders").RequireAuthorization();
        orders.MapPost("", async (CheckoutRequest request, ClaimsPrincipal user, ICheckoutService service,
            CancellationToken ct) =>
        {
            var order = await service.PlaceOrderAsync(Actor(user), request, ct);
            return Results.Created($"/orders/{order.Id}", order);
        });
        orders.MapGet("", async (ClaimsPrincipal user, ICustomerOrderService service, CancellationToken ct) =>
            Results.Ok(await service.ListAsync(Actor(user), ct)));
        orders.MapGet("/{id}", async (string id, ClaimsPrincipal user, ICustomerOrderService service,
            CancellationToken ct) =>
            await service.FindAsync(Actor(user), id, ct) is { } order
                ? Results.Ok(order)
                : throw ApiError.NotFound("Order not found."));
    }
    private static AccountIdentity Actor(ClaimsPrincipal user) =>
        new(user.FindFirstValue(ClaimTypes.NameIdentifier)!, user.IsInRole("admin"));
}
