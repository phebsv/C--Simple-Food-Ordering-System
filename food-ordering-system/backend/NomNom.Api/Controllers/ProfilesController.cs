using Microsoft.AspNetCore.Mvc;
using NomNom.Api.Contracts;
using NomNom.Api.Services;

namespace NomNom.Api.Controllers;

[Route("users/{id}")]
public sealed class ProfilesController(IProfileService profiles) : AuthenticatedController
{
    [HttpGet]
    public async Task<IActionResult> Get([FromRoute] string id, CancellationToken ct) =>
        Ok(await profiles.GetAsync(Actor, id, ct));

    [HttpPatch]
    public async Task<IActionResult> Update(
        [FromRoute] string id, [FromBody] UpdateProfileRequest request, CancellationToken ct) =>
        Ok(await profiles.UpdateAsync(Actor, id, request, ct));

    [HttpPost("password")]
    public async Task<IActionResult> ChangePassword(
        [FromRoute] string id, [FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        await profiles.ChangePasswordAsync(Actor, id, request, ct);
        return NoContent();
    }
}
