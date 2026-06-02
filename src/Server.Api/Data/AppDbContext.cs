using Microsoft.EntityFrameworkCore;
using Server.Api.Data.Entities;

namespace Server.Api.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<LineEntity> Lines => Set<LineEntity>();
    public DbSet<ProcessEntity> Processes => Set<ProcessEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserEntity>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Username).IsUnique();

            entity.Property(x => x.Username).HasMaxLength(100).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(1024).IsRequired();
            entity.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Role).HasMaxLength(50).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();
        });

        modelBuilder.Entity<LineEntity>(entity =>
        {
            // Connect to existing table LINE (case sensitive or insensitive depends on DB, but exact name is LINE)
            entity.ToTable("LINE");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("ID");
            entity.Property(x => x.Name).HasMaxLength(255).IsRequired();
            entity.Property(x => x.IP).HasMaxLength(50);
            entity.Property(x => x.MAC).HasMaxLength(50);
        });

        modelBuilder.Entity<ProcessEntity>(entity =>
        {
            // Connect to existing table PROCESS_LIST
            entity.ToTable("PROCESS_LIST");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("ID");
            entity.Property(x => x.Name).HasMaxLength(255).IsRequired();
            entity.Property(x => x.Line).HasColumnName("Line");
            entity.Property(x => x.Priority).HasColumnName("Priority");
        });
    }
}
