namespace Shared.Models.Dtos;

public sealed class UpdateUserRequest
{
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string? NewPassword { get; set; }
}
