using System.Text.Json.Serialization;

namespace NomNom.Api.Contracts;

public sealed record RegisterRequest(
    string? Name,
    string? Email,
    string? Password,
    string? Phone,
    string? Address);

public sealed record LoginRequest(string? Email, string? Password);

public sealed record UpdateProfileRequest(string? Name, string? Phone, string? Address);

public sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

public sealed record PublicUser(
    string Id,
    string Name,
    string Email,
    string Role,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Phone,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Address);

public sealed record AuthUser(
    string Id,
    string Name,
    string Email,
    string Role,
    bool IsAdmin,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Phone,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Address);

public sealed record AuthData(string Token, AuthUser User);

public sealed record AuthResponse(string Message, AuthData Data);

public sealed record DeletedUser(string Id, string Name, string Email, string Role, string? DeletedAt);
