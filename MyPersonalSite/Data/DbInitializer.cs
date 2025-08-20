using MyPersonalSite.Shared.Models;

namespace MyPersonalSite.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (db.ResumeSections.Any()) return;

        var section = new ResumeSection
        {
            SectionTitle = "Work Experience",
            Entries =
            [
                new ResumeEntry
                {
                    Title = ".NET Developer",
                    Organization = "Acme Corp",
                    StartDate = new DateTime(2021,1,1),
                    Location = "Remote",
                    BulletPoints = [ new BulletPoint { Text = "Built secure Blazor apps with EF Core & SQLite" } ],
                    Description = "Focused on clean architecture and performance."
                }
            ]
        };

        db.ResumeSections.Add(section);
        await db.SaveChangesAsync();
    }
}
