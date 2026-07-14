using System;

namespace Server.Api.Data.Entities;

public sealed class ProcessProcedureEntity
{
    public long Id { get; set; }
    public int ProcessId { get; set; }
    public int Step { get; set; }
    public int Target { get; set; }
    public int Task { get; set; }
    public int CovNum { get; set; }
    public DateTime? CreatedTime { get; set; }
}
