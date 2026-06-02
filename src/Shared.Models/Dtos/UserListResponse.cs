using System.Collections.Generic;

namespace Shared.Models.Dtos;

public sealed class UserListResponse
{
    public IReadOnlyList<UserDto> Items { get; set; } = [];
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
