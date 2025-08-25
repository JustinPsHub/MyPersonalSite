// Data/DbInitializer.cs
using Microsoft.EntityFrameworkCore;
using MyPersonalSite.Data;
using MyPersonalSite.Shared.Models;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext db)
    {
        await db.Database.EnsureCreatedAsync();

        bool hasTreasury = await db.ResumeItems
            .OfType<ResumeEntry>()
            .AnyAsync(x => x.Organization == "U.S. Department of the Treasury"
                        && x.StartDate.Year == 2022 && x.StartDate.Month == 11);

        if (!hasTreasury)
        {
            var treasury = new ResumeEntry
            {
                Title = "Senior Data Engineer / .NET Engineer (Business Intelligence Architect)",
                Organization = "U.S. Department of the Treasury",
                Location = "Washington, DC",
                StartDate = new DateTime(2022, 11, 1),
                EndDate = null,

                // ✅ REQUIRED by your schema
                Description = "Lead engineer for Treasury’s shared analytics platform (600+ users). Ship secure, data-driven .NET solutions, "
                             + "Python/R runtime governance, dimensional models powering 100+ reports, and automation across Azure/Power BI.",

                TechStack = "C#/.NET, SQL Server/SSIS, Power BI (Service & RS), Azure (VMs/DevOps), Python, R, LDAP/AD, REST, Git, CI/CD",
                BulletPoints = Bullets(
                    "Led the shared virtual analytics platform for 600+ devs/analysts; owned Python/R runtime config, governance, automated package deployment, and security reviews in Azure.",
                    "Built an AD password-expiry notification and access dashboard (LDAP + T-SQL + Database Mail) surfacing security groups, nested groups, DB permissions, and SSRS roles.",
                    "Designed daily ETL + dimensional models (SSIS/SQL) for IRS ITM Learning powering 100+ reports/dashboards; documented and transitioned to Azure DevOps for O&M.",
                    "Authored a C#/.NET data-quality comparator that web-scrapes IRS report metadata, cross-checks Treasury’s HR warehouse, persists diffs, and visualizes results in Power BI.",
                    "Upgraded/administered six Power BI Report Server instances (2021 → May 2023); resolved a post-upgrade config bug and adjusted .NET reserved URLs to restore uptime.",
                    "Migrated 600+ projects GitLab → Azure DevOps (Repos/Boards/Wikis/Pipelines), translating custom pipelines/tasks and retiring the GitLab Enterprise license.",
                    "Implemented enterprise RLS patterns in Power BI Service for human-capital models; established reusable roles and dynamic policies.",
                    "Linked SQL Servers across environments to enable live cross-env querying without full ETLs—preserving ownership/security while powering dashboards.",
                    "Delivered recurring enablement sessions (SSMS/Azure Data Studio, Power BI, Visual Studio/Code, RStudio) for data upskilling.",
                    "Modified Microsoft’s RDL Migration Tool (.NET) for GovCloud endpoints to migrate 1,000+ reports/dashboards to Power BI Service."
                )
            };

            db.ResumeItems.Add(treasury);
            await db.SaveChangesAsync();
        }
    }

    private static List<BulletPoint> Bullets(params string[] lines) =>
        lines.Select((text, i) => new BulletPoint { Text = text, Order = i }).ToList();
}
