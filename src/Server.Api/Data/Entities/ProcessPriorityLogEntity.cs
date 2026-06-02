using System;

namespace Server.Api.Data.Entities;

public sealed class ProcessPriorityLogEntity
{
    public long Id { get; set; }
    public long ProcessId { get; set; }
    public int LineId { get; set; }
    public int PreviousPriority { get; set; }
    public int NewPriority { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public string UpdatedBy { get; set; } = "System";
}
