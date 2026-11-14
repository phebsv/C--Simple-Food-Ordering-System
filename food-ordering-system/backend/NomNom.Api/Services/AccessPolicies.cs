using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace NomNom.Api.Services;

internal static class AccessPolicies
{
    public const string Administrator = "Administrator";
    public const string Owner = "Owner";
    public const string OwnerOrAdministrator = "OwnerOrAdministrator";

    public static void Configure(AuthorizationOptions options)
    {
        options.AddPolicy(Administrator, policy => policy
            .RequireAuthenticatedUser()
            .RequireRole("admin"));

        // For ownership policies, pass the account ID that owns the resource to AuthorizeAsync.
        // Resolve it from the stored record when the route contains a cart or order ID.
        options.AddPolicy(Owner, policy => policy
            .RequireAuthenticatedUser()
            .RequireAssertion(context => context.Resource is string ownerId && IsOwner(context.User, ownerId)));
        options.AddPolicy(OwnerOrAdministrator, policy => policy
            .RequireAuthenticatedUser()
            .RequireAssertion(context => context.Resource is string ownerId && !string.IsNullOrEmpty(ownerId) &&
                (IsOwner(context.User, ownerId) || context.User.IsInRole("admin"))));
    }

    private static bool IsOwner(ClaimsPrincipal user, string ownerId) =>
        !string.IsNullOrEmpty(ownerId) &&
        string.Equals(user.FindFirstValue(ClaimTypes.NameIdentifier), ownerId, StringComparison.Ordinal);
}
