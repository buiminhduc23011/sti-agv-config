using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Server.Api.Data;
using Server.Api.Data.Entities;
using Shared.Models.Dtos;

namespace Server.Api.Services;

public sealed class UserManagementService : IUserManagementService
{
    private const int MaxPageSize = 100;

    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher<UserEntity> _passwordHasher;

    public UserManagementService(AppDbContext dbContext, IPasswordHasher<UserEntity> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task<UserListResponse> ListUsersAsync(
        int page,
        int pageSize,
        string? search,
        string? role,
        bool? isActive,
        CancellationToken cancellationToken = default)
    {
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 1, MaxPageSize);
        var query = _dbContext.Users.AsNoTracking();

        var keyword = search?.Trim();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(x =>
                x.Username.Contains(keyword) ||
                x.FullName.Contains(keyword) ||
                (x.Email != null && x.Email.Contains(keyword)));
        }

        var normalizedRole = NormalizeRole(role);
        if (!string.IsNullOrWhiteSpace(normalizedRole))
        {
            query = query.Where(x => x.Role == normalizedRole);
        }

        if (isActive.HasValue)
        {
            query = query.Where(x => x.IsActive == isActive.Value);
        }

        var total = await query.CountAsync(cancellationToken);
        var userEntities = await query
            .OrderByDescending(x => x.IsSystemAccount)
            .ThenBy(x => x.Username)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .ToListAsync(cancellationToken);

        var actorDisplayNames = await GetActorDisplayNamesByUsernameAsync(
            userEntities.SelectMany(x => new[] { x.CreatedBy, x.UpdatedBy }),
            cancellationToken);

        var users = userEntities
            .Select(x => ToUserDto(x, actorDisplayNames))
            .ToList();

        return new UserListResponse
        {
            Items = users,
            Total = total,
            Page = safePage,
            PageSize = safePageSize
        };
    }

    public Task<UserEntity?> GetUserAsync(int id, CancellationToken cancellationToken = default)
    {
        return _dbContext.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default)
    {
        var normalizedUsername = username.Trim();
        return _dbContext.Users
            .AsNoTracking()
            .AnyAsync(x => x.Username == normalizedUsername, cancellationToken);
    }

    public async Task<UserMutationResult> CreateUserAsync(
        CreateUserRequest request,
        string actor,
        CancellationToken cancellationToken = default)
    {
        var role = NormalizeRole(request.Role);
        if (!IsValidRole(role))
        {
            return new UserMutationResult(UserMutationStatus.InvalidRole, null);
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            return new UserMutationResult(UserMutationStatus.InvalidPassword, null);
        }

        var username = request.Username.Trim();
        if (await _dbContext.Users.AnyAsync(x => x.Username == username, cancellationToken))
        {
            return new UserMutationResult(UserMutationStatus.DuplicateUsername, null);
        }

        var now = DateTimeOffset.UtcNow;
        var user = new UserEntity
        {
            Username = username,
            FullName = request.FullName.Trim(),
            Email = NormalizeNullable(request.Email),
            Role = role,
            IsActive = request.IsActive,
            IsSystemAccount = false,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = actor,
            UpdatedBy = actor
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new UserMutationResult(UserMutationStatus.Success, user);
    }

    public async Task<UserMutationResult> UpdateUserAsync(
        int id,
        UpdateUserRequest request,
        string actor,
        CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (user is null)
        {
            return new UserMutationResult(UserMutationStatus.NotFound, null);
        }

        if (user.IsSystemAccount)
        {
            return new UserMutationResult(UserMutationStatus.SystemAccountLocked, user);
        }

        var role = NormalizeRole(request.Role);
        if (!IsValidRole(role))
        {
            return new UserMutationResult(UserMutationStatus.InvalidRole, user);
        }

        if (!string.IsNullOrWhiteSpace(request.NewPassword) && request.NewPassword.Length < 6)
        {
            return new UserMutationResult(UserMutationStatus.InvalidPassword, user);
        }

        user.FullName = request.FullName.Trim();
        user.Email = NormalizeNullable(request.Email);
        user.Role = role;
        user.IsActive = request.IsActive;
        user.UpdatedAtUtc = DateTimeOffset.UtcNow;
        user.UpdatedBy = actor;

        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new UserMutationResult(UserMutationStatus.Success, user);
    }

    private static bool IsValidRole(string role)
    {
        return role == AppRoles.Admin || role == AppRoles.Technician;
    }

    private static string NormalizeRole(string? role)
    {
        return (role ?? string.Empty).Trim();
    }

    private static string? NormalizeNullable(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private async Task<Dictionary<string, string>> GetActorDisplayNamesByUsernameAsync(
        IEnumerable<string?> actorNames,
        CancellationToken cancellationToken)
    {
        var usernames = actorNames
            .Select(x => x?.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x) && !string.Equals(x, "System", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (usernames.Length == 0)
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        var users = await _dbContext.Users
            .AsNoTracking()
            .Where(x => usernames.Contains(x.Username))
            .Select(x => new { x.Username, x.FullName })
            .ToListAsync(cancellationToken);

        return users.ToDictionary(x => x.Username, x => x.FullName, StringComparer.OrdinalIgnoreCase);
    }

    private static string ResolveActorDisplayName(string actor, IReadOnlyDictionary<string, string> actorDisplayNames)
    {
        var normalizedActor = actor.Trim();
        return actorDisplayNames.TryGetValue(normalizedActor, out var fullName) && !string.IsNullOrWhiteSpace(fullName)
            ? fullName
            : actor;
    }

    private static UserDto ToUserDto(UserEntity user, IReadOnlyDictionary<string, string>? actorDisplayNames = null)
    {
        actorDisplayNames ??= new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            IsActive = user.IsActive,
            IsSystemAccount = user.IsSystemAccount,
            CreatedAtUtc = user.CreatedAtUtc,
            UpdatedAtUtc = user.UpdatedAtUtc,
            CreatedBy = ResolveActorDisplayName(user.CreatedBy, actorDisplayNames),
            UpdatedBy = ResolveActorDisplayName(user.UpdatedBy, actorDisplayNames)
        };
    }
}
