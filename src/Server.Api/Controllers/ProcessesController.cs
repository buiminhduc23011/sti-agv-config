using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Api.Data;
using Server.Api.Data.Entities;
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
            .AsNoTracking()
            .Where(x => x.Line == lineId)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var latestLogsByProcessId = await GetLatestLogsByProcessIdAsync(
            processes.Select(x => x.Id).ToArray(),
            cancellationToken);
        var actorDisplayNames = await GetActorDisplayNamesByUsernameAsync(
            latestLogsByProcessId.Values.Select(x => x.UpdatedBy),
            cancellationToken);

        var response = processes.Select(process =>
        {
            latestLogsByProcessId.TryGetValue(process.Id, out var latestLog);
            return ToProcessDto(process, latestLog, actorDisplayNames);
        }).ToList();

        return Ok(response);
    }

    [HttpPut("{id}/priority")]
    public async Task<IActionResult> UpdatePriority(long id, [FromBody] UpdatePriorityRequest request, CancellationToken cancellationToken)
    {
        if (request.Priority < 0 || request.Priority > 5)
        {
            return BadRequest("Priority must be between 0 and 5.");
        }

        var process = await _dbContext.Processes.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (process is null)
        {
            return NotFound($"Process with ID {id} not found.");
        }

        var previousPriority = process.Priority;
        var latestLog = new ProcessPriorityLogEntity
        {
            ProcessId = process.Id,
            LineId = process.Line,
            PreviousPriority = previousPriority,
            NewPriority = request.Priority,
            UpdatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedBy = GetActor()
        };

        process.Priority = request.Priority;
        _dbContext.ProcessPriorityLogs.Add(latestLog);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToProcessDto(process, latestLog));
    }

    private async Task<Dictionary<long, ProcessPriorityLogEntity>> GetLatestLogsByProcessIdAsync(
        IReadOnlyCollection<long> processIds,
        CancellationToken cancellationToken)
    {
        if (processIds.Count == 0)
        {
            return new Dictionary<long, ProcessPriorityLogEntity>();
        }

        var logs = await _dbContext.ProcessPriorityLogs
            .AsNoTracking()
            .Where(x => processIds.Contains(x.ProcessId))
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ThenByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

        return logs
            .GroupBy(x => x.ProcessId)
            .ToDictionary(x => x.Key, x => x.First());
    }

    private string GetActor()
    {
        var fullName = User.FindFirstValue(ClaimTypes.GivenName);
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            return fullName.Trim();
        }

        return User.FindFirstValue(ClaimTypes.Name) ?? User.Identity?.Name ?? "System";
    }

    private async Task<Dictionary<string, string>> GetActorDisplayNamesByUsernameAsync(
        IEnumerable<string?> actorNames,
        CancellationToken cancellationToken)
    {
        var usernames = actorNames
            .Select(x => x?.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x) && !string.Equals(x, "System", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (usernames.Length == 0)
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        var users = await _dbContext.Users
            .AsNoTracking()
            .Where(x => usernames.Contains(x.Username))
            .Select(x => new { x.Username, x.FullName })
            .ToListAsync(cancellationToken);

        return users.ToDictionary(x => x.Username, x => x.FullName, StringComparer.OrdinalIgnoreCase);
    }

    private static string? ResolveActorDisplayName(string? actor, IReadOnlyDictionary<string, string> actorDisplayNames)
    {
        var normalizedActor = actor?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedActor))
        {
            return actor;
        }

        return actorDisplayNames.TryGetValue(normalizedActor, out var fullName) && !string.IsNullOrWhiteSpace(fullName)
            ? fullName
            : actor;
    }

    private static ProcessDto ToProcessDto(
        ProcessEntity process,
        ProcessPriorityLogEntity? latestLog,
        IReadOnlyDictionary<string, string>? actorDisplayNames = null)
    {
        actorDisplayNames ??= new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        return new ProcessDto
        {
            Id = process.Id,
            Name = process.Name,
            Line = process.Line,
            Priority = process.Priority,
            UpdatedAtUtc = latestLog?.UpdatedAtUtc,
            UpdatedBy = ResolveActorDisplayName(latestLog?.UpdatedBy, actorDisplayNames)
        };
    }
}
