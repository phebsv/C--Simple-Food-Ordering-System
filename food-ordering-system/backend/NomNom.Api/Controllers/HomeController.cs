using Microsoft.AspNetCore.Mvc;

namespace NomNom.Api.Controllers;

public sealed class HomeController : ControllerBase
{
    [HttpGet("/")]
    public ContentResult Index() => Content("Hello World!", "text/plain; charset=utf-8");
}
