using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Server.Api.Data.Entities;
using Shared.Models.Dtos;

namespace Server.Api.Services;

public interface IAuthService
{
    Task<AuthenticatedSession?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    Task<UserEntity?> GetCurrentUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default);
}
