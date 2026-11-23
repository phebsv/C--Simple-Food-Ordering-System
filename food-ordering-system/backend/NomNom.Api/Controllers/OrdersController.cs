using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNom.Api.Contracts;
using NomNom.Api.Services;

namespace NomNom.Api.Controllers;

[Route("orders")]
public sealed class OrdersController(
    ICheckoutService checkout, ICustomerOrderService customerOrders, IAdminOrderService adminOrders)
    : AuthenticatedController
{
    [HttpPost]
    public async Task<IActionResult> Place([FromBody] CheckoutRequest request, CancellationToken ct)
    {
        var order = await checkout.PlaceOrderAsync(Actor, request, ct);
        return Created($"/orders/{order.Id}", order);
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? search, [FromQuery] string? date, CancellationToken ct)
    {
        var actor = Actor;
        return Ok(actor.IsAdmin
            ? await adminOrders.ListAsync(search, date, ct)
            : await customerOrders.ListAsync(actor, ct));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get([FromRoute] string id, CancellationToken ct)
    {
        var actor = Actor;
        if (actor.IsAdmin) return Ok(await adminOrders.GetAsync(id, ct));

        var order = await customerOrders.FindAsync(actor, id, ct)
            ?? throw ApiError.NotFound("Order not found.");
        return Ok(order);
    }

    [Authorize(Policy = AccessPolicies.Administrator)]
    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateStatus(
        [FromRoute] string id, [FromBody] UpdateOrderStatusRequest request, CancellationToken ct) =>
        Ok(await adminOrders.UpdateStatusAsync(id, request, ct));
}
