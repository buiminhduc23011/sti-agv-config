using System;

namespace Server.Api.Data.Entities;

public sealed class TransEntity
{
    public long Id { get; set; }
    public int Agv { get; set; }
    public int LineId { get; set; }
    public int ReturnPoint { get; set; }
    public int FromPoint { get; set; }
    public int StatusId { get; set; }
    public int ProcessId { get; set; }
    public int Confirm { get; set; }
    public int Task { get; set; }
    public int Type { get; set; }
    public int Estimate { get; set; }
    public DateTime TimeCreated { get; set; }
    public long? UserCreated { get; set; }
    public DateTime TimeUpdated { get; set; }
    public long? UserUpdated { get; set; }
    public bool IsDelete { get; set; }
}
