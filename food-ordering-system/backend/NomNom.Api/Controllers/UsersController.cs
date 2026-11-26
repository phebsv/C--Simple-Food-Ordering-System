using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNom.Api.Services;

namespace NomNom.Api.Controllers;

[ApiController]
[Route("users")]
[Authorize(Policy = AccessPolicies.Administrator)]
public sealed class UsersController(IAdminUserService users) : AuthenticatedController
{
    [HttpGet("deleted")]
    public async Task<IActionResult> ListDeleted(CancellationToken ct) =>
        Ok(await users.ListDeletedAsync(Actor, ct));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete([FromRoute] string id, CancellationToken ct)
    {
        await users.DeleteAsync(Actor, id, ct);
        return NoContent();
    }

    [HttpPost("{id}/restore")]
    public async Task<IActionResult> Restore([FromRoute] string id, CancellationToken ct)
    {
        await users.RestoreAsync(Actor, id, ct);
        return NoContent();
    }
}
