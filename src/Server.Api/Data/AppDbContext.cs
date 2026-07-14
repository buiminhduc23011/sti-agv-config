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
    public DbSet<AgvEntity> Agvs => Set<AgvEntity>();
    public DbSet<LineEntity> Lines => Set<LineEntity>();
    public DbSet<ProcessEntity> Processes => Set<ProcessEntity>();
    public DbSet<ProcessProcedureEntity> ProcessProcedures => Set<ProcessProcedureEntity>();
    public DbSet<ProcessPriorityLogEntity> ProcessPriorityLogs => Set<ProcessPriorityLogEntity>();
    public DbSet<TransEntity> TransOrders => Set<TransEntity>();

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
            entity.Property(x => x.Email).HasMaxLength(255);
            entity.Property(x => x.Role).HasMaxLength(50).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();
            entity.Property(x => x.CreatedBy).HasMaxLength(150).IsRequired();
            entity.Property(x => x.UpdatedBy).HasMaxLength(150).IsRequired();
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
            entity.Property(x => x.LINK_ID).HasColumnName("LINK_ID");
            entity.Property(x => x.LINK_STEP).HasColumnName("LINK_STEP");
            entity.Property(x => x.Priority).HasColumnName("Priority");
            entity.Property(x => x.Created_Time).HasColumnName("Created_Time");
        });

        modelBuilder.Entity<ProcessProcedureEntity>(entity =>
        {
            entity.ToTable("PROCESS_PROCEDURE");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.ProcessId).HasColumnName("PROCESS_ID");
            entity.Property(x => x.Step).HasColumnName("Step");
            entity.Property(x => x.Target).HasColumnName("Target");
            entity.Property(x => x.Task).HasColumnName("Task");
            entity.Property(x => x.CovNum).HasColumnName("CovNum");
            entity.Property(x => x.CreatedTime).HasColumnName("Created_time");
        });

        modelBuilder.Entity<AgvEntity>(entity =>
        {
            entity.ToTable("AGV");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("ID");
            entity.Property(x => x.Name).HasColumnName("Name").HasMaxLength(255);
        });

        modelBuilder.Entity<TransEntity>(entity =>
        {
            entity.ToTable("TRANS");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("ID");
            entity.Property(x => x.Agv).HasColumnName("AGV");
            entity.Property(x => x.LineId).HasColumnName("Line_ID");
            entity.Property(x => x.ReturnPoint).HasColumnName("Return_Point");
            entity.Property(x => x.FromPoint).HasColumnName("From_Point");
            entity.Property(x => x.StatusId).HasColumnName("StatusID");
            entity.Property(x => x.ProcessId).HasColumnName("ProcessID");
            entity.Property(x => x.Confirm).HasColumnName("Confirm");
            entity.Property(x => x.Task).HasColumnName("Task");
            entity.Property(x => x.Type).HasColumnName("Type");
            entity.Property(x => x.Estimate).HasColumnName("Estimate");
            entity.Property(x => x.TimeCreated).HasColumnName("Time_Created");
            entity.Property(x => x.UserCreated).HasColumnName("User_Created");
            entity.Property(x => x.TimeUpdated).HasColumnName("Time_Updated");
            entity.Property(x => x.UserUpdated).HasColumnName("User_Updated");
            entity.Property(x => x.IsDelete).HasColumnName("IsDelete");
        });

        modelBuilder.Entity<ProcessPriorityLogEntity>(entity =>
        {
            entity.ToTable("ProcessPriorityLogs");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.ProcessId, x.UpdatedAtUtc, x.Id });

            entity.Property(x => x.ProcessId).IsRequired();
            entity.Property(x => x.LineId).IsRequired();
            entity.Property(x => x.PreviousPriority).IsRequired();
            entity.Property(x => x.NewPriority).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedBy).HasMaxLength(150).IsRequired();
        });
    }
}
