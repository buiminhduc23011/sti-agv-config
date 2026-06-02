namespace Server.Api.Options;

public sealed class SeedDataOptions
{
    public const string SectionName = "SeedData";

    public string AdminUsername { get; set; } = "admin";
    public string AdminPassword { get; set; } = "Admin@123";
    public string AdminFullName { get; set; } = "System Administrator";

    public string TechnicianUsername { get; set; } = "technician";
    public string TechnicianPassword { get; set; } = "Technician@123";
    public string TechnicianFullName { get; set; } = "Maintenance Technician";
}
