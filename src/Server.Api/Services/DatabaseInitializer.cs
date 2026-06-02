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
                CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
            );
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
            UpdatedAtUtc = now
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
            UpdatedAtUtc = now
        };
        technician.PasswordHash = _passwordHasher.HashPassword(technician, _seedOptions.TechnicianPassword);

        _dbContext.Users.AddRange(admin, technician);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
