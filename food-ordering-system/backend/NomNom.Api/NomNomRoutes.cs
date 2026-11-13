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
    }
}
