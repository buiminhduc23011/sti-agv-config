using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Server.Api.Data;
using Server.Api.Data.Entities;
using Server.Api.Options;

namespace Server.Api.Services;

public sealed class DatabaseInitializer
{
    private const string SqlServerSchemaBootstrap = """
        IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NULL
        BEGIN
            CREATE TABLE [dbo].[Users]
            (
                [Id] INT IDENTITY(1,1) NOT NULL,
                [Username] NVARCHAR(100) NOT NULL,
                [PasswordHash] NVARCHAR(1024) NOT NULL,
                [FullName] NVARCHAR(150) NOT NULL,
                [Email] NVARCHAR(255) NULL,
                [Role] NVARCHAR(50) NOT NULL,
                [IsActive] BIT NOT NULL,
                [IsSystemAccount] BIT NOT NULL,
                [CreatedAtUtc] DATETIMEOFFSET NOT NULL,
                [UpdatedAtUtc] DATETIMEOFFSET NOT NULL,
                [CreatedBy] NVARCHAR(100) NOT NULL CONSTRAINT [DF_Users_CreatedBy] DEFAULT N'System',
                [UpdatedBy] NVARCHAR(100) NOT NULL CONSTRAINT [DF_Users_UpdatedBy] DEFAULT N'System',
                CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
            );
        END;

        IF COL_LENGTH(N'dbo.Users', N'Email') IS NULL
        BEGIN
            ALTER TABLE [dbo].[Users]
                ADD [Email] NVARCHAR(255) NULL;
        END;

        IF COL_LENGTH(N'dbo.Users', N'IsActive') IS NULL
        BEGIN
            ALTER TABLE [dbo].[Users]
                ADD [IsActive] BIT NOT NULL CONSTRAINT [DF_Users_IsActive] DEFAULT 1;
        END;

        IF COL_LENGTH(N'dbo.Users', N'IsSystemAccount') IS NULL
        BEGIN
            ALTER TABLE [dbo].[Users]
                ADD [IsSystemAccount] BIT NOT NULL CONSTRAINT [DF_Users_IsSystemAccount] DEFAULT 0;
        END;

        IF COL_LENGTH(N'dbo.Users', N'CreatedAtUtc') IS NULL
        BEGIN
            ALTER TABLE [dbo].[Users]
                ADD [CreatedAtUtc] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_Users_CreatedAtUtc] DEFAULT SYSDATETIMEOFFSET();
        END;

        IF COL_LENGTH(N'dbo.Users', N'UpdatedAtUtc') IS NULL
        BEGIN
            ALTER TABLE [dbo].[Users]
                ADD [UpdatedAtUtc] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_Users_UpdatedAtUtc] DEFAULT SYSDATETIMEOFFSET();
        END;

        IF COL_LENGTH(N'dbo.Users', N'CreatedBy') IS NULL
        BEGIN
            ALTER TABLE [dbo].[Users]
                ADD [CreatedBy] NVARCHAR(100) NOT NULL CONSTRAINT [DF_Users_CreatedBy] DEFAULT N'System';
        END;

        IF COL_LENGTH(N'dbo.Users', N'UpdatedBy') IS NULL
        BEGIN
            ALTER TABLE [dbo].[Users]
                ADD [UpdatedBy] NVARCHAR(100) NOT NULL CONSTRAINT [DF_Users_UpdatedBy] DEFAULT N'System';
        END;

        IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE name = N'IX_Users_Username'
              AND object_id = OBJECT_ID(N'[dbo].[Users]', N'U'))
        BEGIN
            CREATE UNIQUE INDEX [IX_Users_Username]
                ON [dbo].[Users] ([Username]);
        END;
        """;

    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher<UserEntity> _passwordHasher;
    private readonly SeedDataOptions _seedOptions;

    public DatabaseInitializer(
        AppDbContext dbContext,
        IPasswordHasher<UserEntity> passwordHasher,
        IOptions<SeedDataOptions> seedOptions)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _seedOptions = seedOptions.Value;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        if (string.Equals(_dbContext.Database.ProviderName, "Microsoft.EntityFrameworkCore.InMemory", StringComparison.Ordinal))
        {
            await _dbContext.Database.EnsureCreatedAsync(cancellationToken);
        }
        else
        {
            // We do NOT use EnsureCreatedAsync because LINE and PROCESS_LIST tables ALREADY exist.
            // Using EnsureCreatedAsync would try to create them, causing errors, or it would do nothing if ANY table exists.
            // Actually, if we connect to an existing database, EF Core's EnsureCreatedAsync does NOTHING if the database already has tables.
            // So we manually execute our schema bootstrap for Users table.
            if (string.Equals(_dbContext.Database.ProviderName, "Microsoft.EntityFrameworkCore.SqlServer", StringComparison.Ordinal))
            {
                await _dbContext.Database.ExecuteSqlRawAsync(SqlServerSchemaBootstrap, cancellationToken);
            }
        }

        await SeedUsersAsync(cancellationToken);
        await ProtectSeedUsersAsync(cancellationToken);
    }

    private async Task SeedUsersAsync(CancellationToken cancellationToken)
    {
        if (await _dbContext.Users.AnyAsync(cancellationToken))
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;

        var admin = new UserEntity
        {
            Username = _seedOptions.AdminUsername.Trim(),
            FullName = _seedOptions.AdminFullName.Trim(),
            Role = AppRoles.Admin,
            IsActive = true,
            IsSystemAccount = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = "System",
            UpdatedBy = "System"
        };
        admin.PasswordHash = _passwordHasher.HashPassword(admin, _seedOptions.AdminPassword);

        var technician = new UserEntity
        {
            Username = _seedOptions.TechnicianUsername.Trim(),
            FullName = _seedOptions.TechnicianFullName.Trim(),
            Role = AppRoles.Technician,
            IsActive = true,
            IsSystemAccount = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = "System",
            UpdatedBy = "System"
        };
        technician.PasswordHash = _passwordHasher.HashPassword(technician, _seedOptions.TechnicianPassword);

        _dbContext.Users.AddRange(admin, technician);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task ProtectSeedUsersAsync(CancellationToken cancellationToken)
    {
        var seedUsernames = new[]
        {
            _seedOptions.AdminUsername.Trim(),
            _seedOptions.TechnicianUsername.Trim()
        };

        var seedUsers = await _dbContext.Users
            .Where(x => seedUsernames.Contains(x.Username))
            .ToListAsync(cancellationToken);

        var changed = false;
        foreach (var user in seedUsers)
        {
            if (!user.IsSystemAccount)
            {
                user.IsSystemAccount = true;
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(user.CreatedBy))
            {
                user.CreatedBy = "System";
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(user.UpdatedBy))
            {
                user.UpdatedBy = "System";
                changed = true;
            }
        }

        if (changed)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
