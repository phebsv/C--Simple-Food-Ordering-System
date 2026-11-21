using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNom.Api.Services;

namespace NomNom.Api.Controllers;

[ApiController]
[Authorize]
public abstract class AuthenticatedController : ControllerBase
{
    protected AccountIdentity Actor =>
        new(User.FindFirstValue(ClaimTypes.NameIdentifier)!, User.IsInRole("admin"));
}
