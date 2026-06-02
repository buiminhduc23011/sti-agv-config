using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Api.Data;
using Shared.Models.Dtos;

namespace Server.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class LinesController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public LinesController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetLines(CancellationToken cancellationToken)
    {
        var lines = await _dbContext.Lines
            .Where(x => x.IsDelete != true)
            .OrderBy(x => x.Name)
            .Select(x => new LineDto
            {
                Id = x.Id,
                Name = x.Name
            })
            .ToListAsync(cancellationToken);

        return Ok(lines);
    }
}
