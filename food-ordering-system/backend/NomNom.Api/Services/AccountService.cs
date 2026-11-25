using System.Net.Mail;
using System.Text;
using System.Text.RegularExpressions;
using NomNom.Api.Contracts;
using NomNom.Api.Models;
using NomNom.Api.Repositories;

namespace NomNom.Api.Services;

internal sealed class AccountService(IAccountRepository store, ISessionService sessions) : IAccountService, IProfileService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var name = request.Name?.Trim() ?? "";
        var phone = request.Phone?.Trim() ?? "";
        var streetAddress = request.Address?.Trim() ?? "";
        if (name.Length is < 2 or > 50) throw ApiError.Invalid("Enter a name between 2 and 50 characters.");
        if (email.Length > 100 || !MailAddress.TryCreate(email, out var address) ||
            address.Address != email || !address.Host.Contains('.'))
            throw ApiError.Invalid("Please enter a valid email address.");
        ValidatePhone(phone);
        if (streetAddress.Length > 300) throw ApiError.Invalid("Address must fit within 300 characters.");
        var password = ValidatePassword(request.Password);

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
        if (!await store.TryCreateAsync(user, cancellationToken))
            throw ApiError.Invalid("Email already registered.");
        return await AuthenticateAsync(user, "Account created successfully.", cancellationToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrEmpty(request.Password))
            throw ApiError.Invalid("Email and password are required.");
        var user = await store.FindByEmailAsync(NormalizeEmail(request.Email), cancellationToken);
        if (user is null || !VerifyPassword(request.Password, user.PasswordHash))
            throw ApiError.Unauthorized("Invalid email or password.");
        return await AuthenticateAsync(user, "Login successful.", cancellationToken);
    }

    public async Task<PublicUser?> GetAsync(AccountIdentity actor, string userId, CancellationToken ct) =>
        ToPublicUser(await GetOwnedAccountAsync(actor, userId, ct));

    public async Task<PublicUser?> UpdateAsync(
        AccountIdentity actor, string userId, UpdateProfileRequest request, CancellationToken ct)
    {
        var user = await GetOwnedAccountAsync(actor, userId, ct);
        var name = request.Name?.Trim() ?? user.Name;
        var phone = request.Phone?.Trim() ?? user.Phone;
        var address = request.Address?.Trim() ?? user.Address;
        if (name.Length is < 2 or > 50) throw ApiError.Invalid("Enter a name between 2 and 50 characters.");
        ValidatePhone(phone ?? "");
        if (address?.Length > 300) throw ApiError.Invalid("Address must fit within 300 characters.");
        await store.UpdateProfileAsync(userId, request.Name is null ? null : name,
            request.Phone is null ? null : phone, request.Address is null ? null : address, ct);
        return await GetAsync(actor, userId, ct);
    }

    public async Task ChangePasswordAsync(
        AccountIdentity actor, string userId, ChangePasswordRequest request, CancellationToken ct)
    {
        var user = await GetOwnedAccountAsync(actor, userId, ct);
        if (!VerifyPassword(request.CurrentPassword, user.PasswordHash))
            throw ApiError.Invalid("Current password is incorrect.");
        var password = ValidatePassword(request.NewPassword);
        if (VerifyPassword(password, user.PasswordHash))
            throw ApiError.Invalid("Choose a different password.");
        var hash = BCrypt.Net.BCrypt.HashPassword(password, 10);
        if (!await store.TryChangePasswordAsync(userId, user.PasswordHash, hash, ct))
            throw new ApiError(409, "Your password changed. Enter your current password and try again.");
    }

    private async Task<UserAccount> GetOwnedAccountAsync(AccountIdentity actor, string userId, CancellationToken ct)
    {
        if (!string.Equals(actor.UserId, userId, StringComparison.Ordinal))
            throw ApiError.NotFound("Account not found.");
        return await store.FindByIdAsync(userId, ct) ?? throw ApiError.NotFound("Account not found.");
    }

    private static PublicUser ToPublicUser(UserAccount user) =>
        new(user.Id, user.Name, user.Email, user.Role, user.Phone, user.Address);

    internal static void ValidatePhone(string phone)
    {
        if (phone.Length > 20 || (phone.Length > 0 &&
            !Regex.IsMatch(phone.Replace(" ", "").Replace("-", ""), @"^(?:0|\+?63)9[0-9]{9}$")))
            throw ApiError.Invalid("Please enter a valid mobile number.");
    }

    private static bool VerifyPassword(string? password, string hash) =>
        !string.IsNullOrEmpty(password) && !password.Contains('\0') && BCrypt.Net.BCrypt.Verify(password, hash);

    private static string ValidatePassword(string? password)
    {
        if (password is null || password.Length < 8 || Encoding.UTF8.GetByteCount(password) > 72 ||
            !password.Any(char.IsAsciiLetter) || !password.Any(char.IsAsciiDigit) || password.Contains('\0'))
            throw ApiError.Invalid("Use at least 8 characters with a letter and number, up to 72 UTF-8 bytes.");
        return password;
    }

    private async Task<AuthResponse> AuthenticateAsync(UserAccount user, string message, CancellationToken cancellationToken)
    {
        var isAdmin = string.Equals(user.Role, "admin", StringComparison.OrdinalIgnoreCase);
        var token = await sessions.IssueAsync(new AccountIdentity(user.Id, isAdmin), cancellationToken);
        var publicUser = new AuthUser(user.Id, user.Name, user.Email, isAdmin ? "admin" : "user",
            isAdmin, user.Phone, user.Address);
        return new AuthResponse(message, new AuthData(token, publicUser));
    }

    private static string NormalizeEmail(string? email) => email?.Trim().ToLowerInvariant() ?? "";
}
