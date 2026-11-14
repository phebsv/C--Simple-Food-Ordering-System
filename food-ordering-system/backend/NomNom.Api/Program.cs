using System.Text.Json;
using NomNom.Api;
using NomNom.Api.Services;
using NomNom.Api.Storage;

var builder = WebApplication.CreateBuilder(args);
var databasePath = builder.Configuration["NomNom:DatabasePath"] ?? "data/db.json";
builder.Services.AddSingleton<INomNomStore>(new JsonNomNomStore(
    Path.GetFullPath(databasePath, builder.Environment.ContentRootPath)));
builder.Services.AddSingleton<ISessionService, SessionService>();
builder.Services.AddSingleton<IAccountService, AccountService>();
builder.Services.AddSingleton<IMenuService, MenuService>();
var origins = builder.Configuration.GetSection("NomNom:AllowedOrigins").Get<string[]>()
    ?? (builder.Environment.IsDevelopment() ? ["http://localhost:5173", "http://127.0.0.1:5173"] : []);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));
builder.Services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = true);
var app = builder.Build();

app.UseCors();
app.Use(async (context, next) =>
{
    try
    {
        await next(context);
    }
    catch (ApiError error) when (!context.Response.HasStarted)
    {
        await Results.Json(new { message = error.Message }, statusCode: error.Status).ExecuteAsync(context);
    }
    catch (BadHttpRequestException error) when (!context.Response.HasStarted)
    {
        await Results.Json(new { message = "Invalid request." }, statusCode: error.StatusCode).ExecuteAsync(context);
    }
    catch (Exception error) when (!context.Response.HasStarted && error is IOException or JsonException or UnauthorizedAccessException)
    {
        app.Logger.LogError(error, "JSON storage operation failed.");
        await Results.Json(new { message = "Data storage is temporarily unavailable." }, statusCode: 503)
            .ExecuteAsync(context);
    }
});

app.MapGet("/", () => "Hello World!");
app.MapNomNomRoutes();

app.Run();
