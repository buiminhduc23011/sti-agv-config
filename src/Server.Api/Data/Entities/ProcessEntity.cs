using System;

namespace Server.Api.Data.Entities;

public sealed class ProcessEntity
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Line { get; set; }
    public int? LINK_ID { get; set; }
    public int? LINK_STEP { get; set; }
    public int Priority { get; set; }
    public DateTime? Created_Time { get; set; }

    // Navigation property (Optional, but let's avoid it unless needed, mapping direct foreign keys is cleaner if LINE is in another table and we don't have FK constraint in DB)
}
