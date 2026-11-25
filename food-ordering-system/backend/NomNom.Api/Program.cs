using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;
using MySqlConnector;
using NomNom.Api.Services;
using NomNom.Api.Repositories;

var builder = WebApplication.CreateBuilder(args);
builder.Services
    .AddControllers(options =>
    {
        options.AllowEmptyInputInBodyModelBinding = true;
        options.InputFormatters.OfType<SystemTextJsonInputFormatter>().Single()
            .SupportedMediaTypes.Remove("text/json");
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.SuppressMapClientErrors = true;
        options.InvalidModelStateResponseFactory = _ =>
            new BadRequestObjectResult(new { message = "Invalid request." });
    });

var connectionString = builder.Configuration.GetConnectionString("NomNom");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Set the ConnectionStrings:NomNom setting before starting the API.");

builder.Services.AddMySqlDataSource(connectionString);
builder.Services.AddSingleton<MySqlAccountRepository>();
builder.Services.AddSingleton<MySqlMenuRepository>();
builder.Services.AddSingleton<MySqlCartRepository>();
builder.Services.AddSingleton<MySqlOrderRepository>();
builder.Services.AddSingleton<MySqlReviewRepository>();
builder.Services.AddSingleton<IAccountRepository>(services =>
    services.GetRequiredService<MySqlAccountRepository>());
builder.Services.AddSingleton<IMenuRepository>(services =>
    services.GetRequiredService<MySqlMenuRepository>());
builder.Services.AddSingleton<ICartRepository>(services =>
    services.GetRequiredService<MySqlCartRepository>());
builder.Services.AddSingleton<IOrderRepository>(services =>
    services.GetRequiredService<MySqlOrderRepository>());
builder.Services.AddSingleton<IReviewRepository>(services =>
    services.GetRequiredService<MySqlReviewRepository>());
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<ISessionService, SessionService>();
builder.Services.AddAuthentication(SessionAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(
        SessionAuthenticationHandler.SchemeName, _ => { });
builder.Services.AddAuthorization(AccessPolicies.Configure);
builder.Services.AddSingleton<AccountService>();
builder.Services.AddSingleton<IAccountService>(services => services.GetRequiredService<AccountService>());
builder.Services.AddSingleton<IProfileService>(services => services.GetRequiredService<AccountService>());
builder.Services.AddSingleton<ICheckoutService, CheckoutService>();
builder.Services.AddSingleton<ICustomerOrderService, CustomerOrderService>();
builder.Services.AddSingleton<IMenuService, MenuService>();
builder.Services.AddSingleton<ICartService, CartService>();
builder.Services.AddSingleton<IAdminOrderService, AdminOrderService>();
builder.Services.AddSingleton<IReviewService, ReviewService>();
var origins = builder.Configuration.GetSection("NomNom:AllowedOrigins").Get<string[]>()
    ?? (builder.Environment.IsDevelopment() ? ["http://localhost:5173", "http://127.0.0.1:5173"] : []);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));
var app = builder.Build();

app.UseCors();
app.Use(async (context, next) =>
{
    try
    {
        await next(context);

        if (!context.Response.HasStarted &&
            context.Response.StatusCode == StatusCodes.Status415UnsupportedMediaType &&
            string.IsNullOrEmpty(context.Request.ContentType))
        {
            await context.Response.WriteAsJsonAsync(new { message = "Invalid request." });
        }
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

app.MapControllers();

app.Run();
