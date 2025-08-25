using Microsoft.EntityFrameworkCore;
using MyPersonalSite.Shared.Models;

namespace MyPersonalSite.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<ResumeItemBase> ResumeItems => Set<ResumeItemBase>();
    public DbSet<ResumeSection> ResumeSections => Set<ResumeSection>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // TPH for inheritance
        mb.Entity<ResumeItemBase>()
          .HasDiscriminator<string>("ItemType")
          .HasValue<ResumeEntry>("ResumeEntry")
          .HasValue<Skill>("Skill")
          .HasValue<Milestone>("Milestone");

        // ResumeSection -> ResumeEntry (1:N)
        mb.Entity<ResumeSection>()
          .HasMany(s => s.Entries)
          .WithOne()
          .OnDelete(DeleteBehavior.Cascade);

        // BulletPoints owned collection for ResumeEntry
        mb.Entity<ResumeEntry>()
          .OwnsMany(e => e.BulletPoints, bp =>
          {
              bp.ToTable("ResumeEntryBulletPoints");
              bp.WithOwner().HasForeignKey("ResumeEntryId");
              bp.Property<int>("Id");
              bp.HasKey("Id");
              bp.Property(p => p.Text).HasMaxLength(400).HasColumnName("BulletPoint");
          });


    }
}
