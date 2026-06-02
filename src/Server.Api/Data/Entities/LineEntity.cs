using System;

namespace Server.Api.Data.Entities;

public sealed class LineEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IP { get; set; }
    public string? MAC { get; set; }
    public int? Type { get; set; }
    public DateTime? Time_Created { get; set; }
    public DateTime? Time_Updated { get; set; }
    public bool? IsDelete { get; set; }
}
