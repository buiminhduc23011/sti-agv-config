using System;
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
public sealed class ProcessesController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public ProcessesController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetProcesses([FromQuery] int lineId, CancellationToken cancellationToken)
    {
        var processes = await _dbContext.Processes
            .Where(x => x.Line == lineId)
            .OrderBy(x => x.Name)
            .Select(x => new ProcessDto
            {
                Id = x.Id,
                Name = x.Name,
                Line = x.Line,
                Priority = x.Priority
            })
            .ToListAsync(cancellationToken);

        return Ok(processes);
    }

    [HttpPut("{id}/priority")]
    public async Task<IActionResult> UpdatePriority(long id, [FromBody] UpdatePriorityRequest request, CancellationToken cancellationToken)
    {
        if (request.Priority < 1 || request.Priority > 5)
        {
            return BadRequest("Priority must be between 1 and 5.");
        }

        var process = await _dbContext.Processes.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (process is null)
        {
            return NotFound($"Process with ID {id} not found.");
        }

        process.Priority = request.Priority;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new ProcessDto
        {
            Id = process.Id,
            Name = process.Name,
            Line = process.Line,
            Priority = process.Priority
        });
    }
}
