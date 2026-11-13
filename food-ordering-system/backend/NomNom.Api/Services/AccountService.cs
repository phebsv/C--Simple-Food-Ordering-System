using System.Net.Mail;
using System.Text;
using System.Text.RegularExpressions;
using NomNom.Api.Contracts;
using NomNom.Api.Models;
using NomNom.Api.Storage;

namespace NomNom.Api.Services;

internal sealed class AccountService(INomNomStore store, ISessionService sessions) : IAccountService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var name = request.Name?.Trim() ?? "";
        var phone = request.Phone?.Trim() ?? "";
        var streetAddress = request.Address?.Trim() ?? "";
        if (name.Length is < 2 or > 50) throw ApiError.Invalid("Enter a name between 2 and 50 characters.");
        if (email.Length > 100 || !MailAddress.TryCreate(email, out var address) ||
            address.Address != email || !address.Host.Contains('.'))
            throw ApiError.Invalid("Please enter a valid email address.");
        if (phone.Length > 20 || (phone.Length > 0 &&
            !Regex.IsMatch(phone.Replace(" ", "").Replace("-", ""), @"^(?:0|\+?63)9[0-9]{9}$")))
            throw ApiError.Invalid("Please enter a valid mobile number.");
        if (streetAddress.Length > 300) throw ApiError.Invalid("Address must fit within 300 characters.");
        var password = request.Password;
        if (password is null || password.Length < 8 || Encoding.UTF8.GetByteCount(password) > 72 ||
            !password.Any(char.IsAsciiLetter) || !password.Any(char.IsAsciiDigit) || password.Contains('\0'))
            throw ApiError.Invalid("Use at least 8 characters with a letter and number, up to 72 UTF-8 bytes.");

        var user = new UserAccount
        {
            Id = Guid.NewGuid().ToString("N"),
            Email = email,
            Name = name,
            Phone = phone,
            Address = streetAddress,
            Role = "user",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, 10)
        };
        await store.UpdateAsync(data =>
        {
            if (data.Users.Any(existing => SameEmail(existing.Email, email)))
                throw ApiError.Invalid("Email already registered.");
            data.Users.Add(user);
            return true;
        }, cancellationToken);
        return await AuthenticateAsync(user, "Account created successfully.", cancellationToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrEmpty(request.Password))
            throw ApiError.Invalid("Email and password are required.");
        var data = await store.ReadAsync(cancellationToken);
        var user = data.Users.Find(user => SameEmail(user.Email, request.Email));
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw ApiError.Unauthorized("Invalid email or password.");
        return await AuthenticateAsync(user, "Login successful.", cancellationToken);
    }

    private async Task<AuthResponse> AuthenticateAsync(UserAccount user, string message, CancellationToken cancellationToken)
    {
        var isAdmin = string.Equals(user.Role, "admin", StringComparison.OrdinalIgnoreCase);
        var token = await sessions.IssueAsync(new AccountIdentity(user.Id, isAdmin), cancellationToken);
        var publicUser = new AuthUser(user.Id, user.Name, user.Email, isAdmin ? "admin" : "user",
            isAdmin, user.Phone, user.Address);
        return new AuthResponse(message, new AuthData(token, publicUser));
    }

    private static bool SameEmail(string left, string right) =>
        string.Equals(left.Trim(), right.Trim(), StringComparison.OrdinalIgnoreCase);
}
