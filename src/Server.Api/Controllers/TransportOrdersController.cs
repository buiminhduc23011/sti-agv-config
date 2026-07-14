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
public sealed class TransportOrdersController : ControllerBase
{
    private const int PendingStatusId = 0;
    private const int RunningStatusId = 1;
    private const int ProcessTransportType = 0;

    private readonly AppDbContext _dbContext;

    public TransportOrdersController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders(
        [FromQuery] int? lineId,
        [FromQuery] long? processId,
        CancellationToken cancellationToken)
    {
        var query =
            from order in _dbContext.TransOrders.AsNoTracking()
            join process in _dbContext.Processes.AsNoTracking()
                on (long)order.LineId equals process.Id
            join line in _dbContext.Lines.AsNoTracking()
                on process.Line equals line.Id
            join agv in _dbContext.Agvs.AsNoTracking()
                on order.Agv equals agv.Id into agvJoin
            from agv in agvJoin.DefaultIfEmpty()
            where !order.IsDelete
                && order.Type == ProcessTransportType
                && line.IsDelete != true
                && (order.StatusId == PendingStatusId || order.StatusId == RunningStatusId)
            select new
            {
                Order = order,
                Process = process,
                Line = line,
                Agv = agv
            };

        if (lineId.HasValue)
        {
            query = query.Where(x => x.Line.Id == lineId.Value);
        }

        if (processId.HasValue)
        {
            query = query.Where(x => x.Process.Id == processId.Value);
        }

        var items = await query
            .OrderByDescending(x => x.Order.TimeCreated)
            .ThenByDescending(x => x.Order.Id)
            .ToListAsync(cancellationToken);

        var processStepCounts = await GetProcessStepCountsAsync(
            items.Select(x => x.Process.Id).Distinct().ToArray(),
            cancellationToken);

        var response = new TransportOrderQueueResponse
        {
            PendingOrders = items
                .Where(x => x.Order.StatusId == PendingStatusId)
                .Select(x => ToDto(x.Order, x.Process, x.Line, x.Agv, processStepCounts))
                .ToList(),
            RunningOrders = items
                .Where(x => x.Order.StatusId == RunningStatusId)
                .Select(x => ToDto(x.Order, x.Process, x.Line, x.Agv, processStepCounts))
                .ToList()
        };

        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder(
        [FromBody] CreateTransportOrderRequest request,
        CancellationToken cancellationToken)
    {
        if (request.ProcessId <= 0)
        {
            return BadRequest("ProcessId phải lớn hơn 0.");
        }

        if (request.ProcessId > int.MaxValue)
        {
            return BadRequest("ProcessId vượt quá phạm vi cho phép của hệ thống.");
        }

        var processDetails = await (
            from process in _dbContext.Processes.AsNoTracking()
            join line in _dbContext.Lines.AsNoTracking()
                on process.Line equals line.Id
            where process.Id == request.ProcessId && line.IsDelete != true
            select new
            {
                Process = process,
                Line = line
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (processDetails is null)
        {
            return NotFound($"Không tìm thấy quy trình có ID {request.ProcessId}.");
        }

        var totalSteps = await _dbContext.ProcessProcedures
            .AsNoTracking()
            .Where(x => x.ProcessId == (int)request.ProcessId)
            .CountAsync(cancellationToken);

        if (totalSteps == 0)
        {
            return BadRequest("Quy trình chưa có bước thực thi trong PROCESS_PROCEDURE, không thể tạo lệnh.");
        }

        var actorUserId = GetActorUserId();
        var now = DateTime.Now;
        var order = new TransEntity
        {
            Agv = 0,
            LineId = (int)request.ProcessId,
            ReturnPoint = 0,
            FromPoint = 0,
            StatusId = PendingStatusId,
            ProcessId = 0,
            Confirm = 0,
            Task = 0,
            Type = ProcessTransportType,
            Estimate = 0,
            TimeCreated = now,
            UserCreated = actorUserId,
            TimeUpdated = now,
            UserUpdated = actorUserId,
            IsDelete = false
        };

        _dbContext.TransOrders.Add(order);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = ToDto(order, processDetails.Process, processDetails.Line, null, new Dictionary<long, int>
        {
            [processDetails.Process.Id] = totalSteps
        });

        return CreatedAtAction(
            nameof(GetOrders),
            new { lineId = processDetails.Line.Id, processId = processDetails.Process.Id },
            response);
    }

    private async Task<Dictionary<long, int>> GetProcessStepCountsAsync(
        IReadOnlyCollection<long> processIds,
        CancellationToken cancellationToken)
    {
        if (processIds.Count == 0)
        {
            return new Dictionary<long, int>();
        }

        return await _dbContext.ProcessProcedures
            .AsNoTracking()
            .Where(x => processIds.Contains((long)x.ProcessId))
            .GroupBy(x => x.ProcessId)
            .Select(x => new
            {
                ProcessId = (long)x.Key,
                Count = x.Count()
            })
            .ToDictionaryAsync(x => x.ProcessId, x => x.Count, cancellationToken);
    }

    private long? GetActorUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(userId, out var parsedUserId) ? parsedUserId : null;
    }

    private static TransportOrderDto ToDto(
        TransEntity order,
        ProcessEntity process,
        LineEntity line,
        AgvEntity? agv,
        IReadOnlyDictionary<long, int> processStepCounts)
    {
        processStepCounts.TryGetValue(process.Id, out var totalSteps);

        return new TransportOrderDto
        {
            Id = order.Id,
            ProcessId = process.Id,
            ProcessName = process.Name,
            LineId = line.Id,
            LineName = line.Name,
            Priority = process.Priority,
            StatusId = order.StatusId,
            StatusName = ResolveStatusName(order.StatusId),
            CurrentStep = order.ProcessId,
            TotalSteps = totalSteps,
            AgvId = agv?.Id,
            AgvName = agv?.Name,
            CreatedAt = order.TimeCreated,
            UpdatedAt = order.TimeUpdated
        };
    }

    private static string ResolveStatusName(int statusId)
    {
        return statusId switch
        {
            PendingStatusId => "Đang chờ",
            RunningStatusId => "Đang chạy",
            _ => "Không xác định"
        };
    }
}
