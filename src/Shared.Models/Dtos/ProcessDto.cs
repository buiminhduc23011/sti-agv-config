namespace Shared.Models.Dtos;

public sealed class ProcessDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Line { get; set; }
    public int Priority { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public string? UpdatedBy { get; set; }
}
