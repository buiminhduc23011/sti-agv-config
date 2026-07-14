using System;

namespace Shared.Models.Dtos;

public sealed class TransportOrderDto
{
    public long Id { get; set; }
    public long ProcessId { get; set; }
    public string ProcessName { get; set; } = string.Empty;
    public int LineId { get; set; }
    public string LineName { get; set; } = string.Empty;
    public int Priority { get; set; }
    public int StatusId { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public int CurrentStep { get; set; }
    public int TotalSteps { get; set; }
    public int? AgvId { get; set; }
    public string? AgvName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
