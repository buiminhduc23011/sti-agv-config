namespace Server.Api.Options;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "StiAgvConfig.Server";
    public string Audience { get; set; } = "StiAgvConfig.Web";
    public string SigningKey { get; set; } = "StiAgvConfig.SigningKey.2026.06.02.DefaultKeyPleaseReplace";
    public int ExpirationMinutes { get; set; } = 480;
}
