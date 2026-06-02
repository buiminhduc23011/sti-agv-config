using System.Threading;
using System.Threading.Tasks;
using Server.Api.Data.Entities;
using Shared.Models.Dtos;

namespace Server.Api.Services;

public interface IUserManagementService
{
    Task<UserListResponse> ListUsersAsync(
        int page,
        int pageSize,
        string? search,
        string? role,
        bool? isActive,
        CancellationToken cancellationToken = default);

    Task<UserEntity?> GetUserAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default);

    Task<UserMutationResult> CreateUserAsync(
        CreateUserRequest request,
        string actor,
        CancellationToken cancellationToken = default);

    Task<UserMutationResult> UpdateUserAsync(
        int id,
        UpdateUserRequest request,
        string actor,
        CancellationToken cancellationToken = default);
}

public sealed record UserMutationResult(UserMutationStatus Status, UserEntity? User);

public enum UserMutationStatus
{
    Success,
    NotFound,
    SystemAccountLocked,
    DuplicateUsername,
    InvalidRole,
    InvalidPassword
}
