using Microsoft.AspNetCore.Mvc;
using NomNom.Api.Contracts;
using NomNom.Api.Services;

namespace NomNom.Api.Controllers;

[Route("cart_items")]
public sealed class CartController(ICartService cart) : AuthenticatedController
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) =>
        Ok(await cart.ListAsync(Actor, ct));

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddCartItemRequest request, CancellationToken ct) =>
        Ok(await cart.AddAsync(Actor, request, ct));

    [HttpPatch("{id}")]
    public async Task<IActionResult> SetQuantity(
        [FromRoute] string id, [FromBody] UpdateCartItemRequest request, CancellationToken ct) =>
        Ok(await cart.SetQuantityAsync(Actor, id, request, ct));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Remove([FromRoute] string id, CancellationToken ct)
    {
        await cart.RemoveAsync(Actor, id, ct);
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> Clear(CancellationToken ct)
    {
        await cart.ClearAsync(Actor, ct);
        return NoContent();
    }
}
