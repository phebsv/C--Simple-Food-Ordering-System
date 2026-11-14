using System.Text.Json.Serialization;

namespace NomNom.Api.Contracts;

internal sealed record RegisterRequest(
    string? Name,
    string? Email,
    string? Password,
    string? Phone,
    string? Address);

internal sealed record LoginRequest(string? Email, string? Password);

internal sealed record UpdateProfileRequest(string? Name, string? Phone, string? Address);

internal sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

internal sealed record PublicUser(
    string Id,
    string Name,
    string Email,
    string Role,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Phone,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Address);

internal sealed record AuthUser(
    string Id,
    string Name,
    string Email,
    string Role,
    bool IsAdmin,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Phone,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Address);

internal sealed record AuthData(string Token, AuthUser User);

internal sealed record AuthResponse(string Message, AuthData Data);
