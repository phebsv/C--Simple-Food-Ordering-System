using Microsoft.AspNetCore.Authentication;
using MySqlConnector;
using NomNom.Api;
using NomNom.Api.Services;
using NomNom.Api.Storage;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("NomNom");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Set the ConnectionStrings:NomNom setting before starting the API.");

builder.Services.AddMySqlDataSource(connectionString);
builder.Services.AddSingleton<MySqlAccountStore>();
builder.Services.AddSingleton<MySqlMenuStore>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<ISessionService, SessionService>();
builder.Services.AddAuthentication(SessionAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(
        SessionAuthenticationHandler.SchemeName, _ => { });
builder.Services.AddAuthorization(AccessPolicies.Configure);
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
    catch (MySqlException error) when (!context.Response.HasStarted)
    {
        app.Logger.LogError(error, "MySQL storage operation failed.");
        await Results.Json(new { message = "Data storage is temporarily unavailable." }, statusCode: 503)
            .ExecuteAsync(context);
    }
});

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "Hello World!");
app.MapNomNomRoutes();

app.Run();
