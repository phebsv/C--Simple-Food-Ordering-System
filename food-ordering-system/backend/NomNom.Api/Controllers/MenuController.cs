using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNom.Api.Contracts;
using NomNom.Api.Services;

namespace NomNom.Api.Controllers;

[ApiController]
[Route("menu")]
public sealed class MenuController(IMenuService menu) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? category, [FromQuery] string? search, CancellationToken ct) =>
        Ok(await menu.ListAsync(category, search, ct));

    [HttpGet("{id}")]
    public async Task<IActionResult> Get([FromRoute] string id, CancellationToken ct) =>
        Ok(await menu.GetAsync(id, ct));

    [Authorize(Policy = AccessPolicies.Administrator)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMenuItemRequest request, CancellationToken ct) =>
        new JsonResult(await menu.CreateAsync(request, ct))
        {
            StatusCode = StatusCodes.Status201Created
        };

    [Authorize(Policy = AccessPolicies.Administrator)]
    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(
        [FromRoute] string id, [FromBody] UpdateMenuItemRequest request, CancellationToken ct) =>
        Ok(await menu.UpdateAsync(id, request, ct));

    [Authorize(Policy = AccessPolicies.Administrator)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete([FromRoute] string id, CancellationToken ct)
    {
        await menu.DeleteAsync(id, ct);
        return NoContent();
    }
}
