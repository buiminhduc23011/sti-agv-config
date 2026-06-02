using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Api.Data.Entities;
using Server.Api.Services;
using Shared.Models.Dtos;

namespace Server.Api.Controllers;

[ApiController]
[Authorize(Roles = AppRoles.Admin)]
[Route("api/[controller]")]
public sealed class UsersController : ControllerBase
{
    private readonly IUserManagementService _userManagementService;

    public UsersController(IUserManagementService userManagementService)
    {
        _userManagementService = userManagementService;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] bool? isActive = null,
        CancellationToken cancellationToken = default)
    {
        var response = await _userManagementService.ListUsersAsync(
            page,
            pageSize,
            search,
            role,
            isActive,
            cancellationToken);

        return Ok(response);
    }

    [HttpGet("availability")]
    public async Task<IActionResult> CheckUsernameAvailability([FromQuery] string? username, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return BadRequest("Tên đăng nhập là bắt buộc.");
        }

        var exists = await _userManagementService.UsernameExistsAsync(username, cancellationToken);
        return Ok(new UsernameAvailabilityResponse
        {
            Exists = exists
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var user = await _userManagementService.GetUserAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFound("Không tìm thấy tài khoản người dùng.");
        }

        return Ok(ToUserDto(user));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest? request, CancellationToken cancellationToken)
    {
        var validationError = ValidateCreateRequest(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var result = await _userManagementService.CreateUserAsync(
            request!,
            GetActor(),
            cancellationToken);

        return result.Status switch
        {
            UserMutationStatus.Success => CreatedAtAction(
                nameof(GetById),
                new { id = result.User!.Id },
                ToUserDto(result.User!)),
            UserMutationStatus.DuplicateUsername => Conflict("Tên đăng nhập đã tồn tại."),
            UserMutationStatus.InvalidRole => BadRequest("Vai trò tài khoản không hợp lệ."),
            UserMutationStatus.InvalidPassword => BadRequest("Mật khẩu phải có ít nhất 6 ký tự."),
            _ => BadRequest("Không thể tạo tài khoản người dùng.")
        };
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest? request, CancellationToken cancellationToken)
    {
        var validationError = ValidateUpdateRequest(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var result = await _userManagementService.UpdateUserAsync(
            id,
            request!,
            GetActor(),
            cancellationToken);

        return result.Status switch
        {
            UserMutationStatus.Success => Ok(ToUserDto(result.User!)),
            UserMutationStatus.NotFound => NotFound("Không tìm thấy tài khoản người dùng."),
            UserMutationStatus.SystemAccountLocked => StatusCode(403, "Tài khoản seed mặc định không được phép chỉnh sửa."),
            UserMutationStatus.InvalidRole => BadRequest("Vai trò tài khoản không hợp lệ."),
            UserMutationStatus.InvalidPassword => BadRequest("Mật khẩu mới phải có ít nhất 6 ký tự."),
            _ => BadRequest("Không thể cập nhật tài khoản người dùng.")
        };
    }

    private string GetActor()
    {
        var fullName = User.FindFirstValue(ClaimTypes.GivenName);
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            return fullName.Trim();
        }

        return User.FindFirstValue(ClaimTypes.Name) ?? User.Identity?.Name ?? "System";
    }

    private static string? ValidateCreateRequest(CreateUserRequest? request)
    {
        if (request is null)
        {
            return "Dữ liệu tạo tài khoản là bắt buộc.";
        }

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            return "Tên đăng nhập là bắt buộc.";
        }

        if (request.Username.Trim().Length > 100)
        {
            return "Tên đăng nhập không được vượt quá 100 ký tự.";
        }

        var sharedError = ValidateSharedFields(request.FullName, request.Email, request.Role);
        if (sharedError is not null)
        {
            return sharedError;
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            return "Mật khẩu phải có ít nhất 6 ký tự.";
        }

        return null;
    }

    private static string? ValidateUpdateRequest(UpdateUserRequest? request)
    {
        if (request is null)
        {
            return "Dữ liệu cập nhật tài khoản là bắt buộc.";
        }

        var sharedError = ValidateSharedFields(request.FullName, request.Email, request.Role);
        if (sharedError is not null)
        {
            return sharedError;
        }

        if (!string.IsNullOrWhiteSpace(request.NewPassword) && request.NewPassword.Length < 6)
        {
            return "Mật khẩu mới phải có ít nhất 6 ký tự.";
        }

        return null;
    }

    private static string? ValidateSharedFields(string? fullName, string? email, string? role)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            return "Họ và tên là bắt buộc.";
        }

        if (fullName.Trim().Length > 150)
        {
            return "Họ và tên không được vượt quá 150 ký tự.";
        }

        if (!string.IsNullOrWhiteSpace(email) && email.Trim().Length > 255)
        {
            return "Email không được vượt quá 255 ký tự.";
        }

        var normalizedRole = role?.Trim();
        if (normalizedRole != AppRoles.Admin && normalizedRole != AppRoles.Technician)
        {
            return "Vai trò tài khoản không hợp lệ.";
        }

        return null;
    }

    private static UserDto ToUserDto(UserEntity user)
    {
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
            CreatedBy = user.CreatedBy,
            UpdatedBy = user.UpdatedBy
        };
    }
}
