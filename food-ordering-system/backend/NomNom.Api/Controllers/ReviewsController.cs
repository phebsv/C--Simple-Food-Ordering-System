using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNom.Api.Contracts;
using NomNom.Api.Services;

namespace NomNom.Api.Controllers;

[Route("reviews")]
public sealed class ReviewsController(IReviewService reviews) : AuthenticatedController
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) =>
        Ok(await reviews.ListAsync(ct));

    [Authorize(Policy = AccessPolicies.Administrator)]
    [HttpGet("deleted")]
    public async Task<IActionResult> ListDeleted(CancellationToken ct) =>
        Ok(await reviews.ListDeletedAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddReviewRequest request, CancellationToken ct)
    {
        var review = await reviews.AddAsync(Actor, request, ct);
        return Created($"/reviews/{review.Id}", review);
    }

    [Authorize(Policy = AccessPolicies.Administrator)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete([FromRoute] string id, CancellationToken ct)
    {
        await reviews.DeleteAsync(id, ct);
        return NoContent();
    }

    [Authorize(Policy = AccessPolicies.Administrator)]
    [HttpPost("{id}/restore")]
    public async Task<IActionResult> Restore([FromRoute] string id, CancellationToken ct)
    {
        await reviews.RestoreAsync(id, ct);
        return NoContent();
    }
}
