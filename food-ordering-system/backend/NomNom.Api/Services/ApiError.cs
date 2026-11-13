namespace NomNom.Api.Services;

internal sealed class ApiError(int status, string message) : Exception(message)
{
    public int Status { get; } = status;

    public static ApiError Invalid(string message) => new(400, message);
    public static ApiError Unauthorized(string message = "Please log in.") => new(401, message);
}
