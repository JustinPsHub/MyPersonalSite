// Data/DbInitializer.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MyPersonalSite.Data;
using MyPersonalSite.Shared.Models;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // Program.cs handles MigrateAsync; no EnsureCreated here.

        // ---------- EXPERIENCE ----------
        var experience = await db.ResumeSections
            .Include(s => s.Entries)
            .ThenInclude(e => e.BulletPoints)
            .FirstOrDefaultAsync(s => s.SectionTitle == "Experience");

        if (experience is null)
        {
            experience = new ResumeSection
            {
                SectionTitle = "Experience",
                Entries = new List<ResumeEntry>()
            };
            db.ResumeSections.Add(experience);
        }

        // Treasury — Senior Cloud Engineer / Technical Lead (Nov 2022 – Present)
        UpsertExperience(
            experience,
            start: new DateTime(2022, 11, 1),
            org: "U.S. Department of the Treasury",
            () => new ResumeEntry
            {
                Title = "Senior Cloud Engineer / Technical Lead",
                Organization = "U.S. Department of the Treasury",
                Location = "Washington, DC",
                StartDate = new DateTime(2022, 11, 1),
                EndDate = null,
                Description =
                    "Lead cloud architect for enterprise Azure data platforms serving HR, budget, cyber, procurement, and other Treasury domains.",
                TechStack = "Azure Synapse (Dedicated Pools), Azure Data Factory, Azure SQL, Data Lake Gen2, Event Grid, Blob Storage, Azure OpenAI, RAG, .NET, Node.js, Python, REST, Swagger, Azure DevOps",
                BulletPoints = Bullets(
                    "Architected an Azure OpenAI RAG solution in the enterprise Blazor portal, indexing millions of Power BI audit log events for natural language diagnostics.",
                    "Serve as lead cloud architect for enterprise big data processing using Azure Synapse Dedicated Pools and Azure SQL.",
                    "Designed low-code ETL pipelines in Data Factory with high-code Azure Functions in .NET, Node, and Python for complex transformations.",
                    "Engineered secure network architectures with advanced ingress/egress controls, private endpoints, and API gateways.",
                    "Built and maintained the agency API ecosystem with ASP.NET Core and comprehensive Swagger/OpenAPI documentation.",
                    "Automated security operations with AI-augmented PowerShell, integrating Nexus scans to quarantine vulnerable VMs.",
                    "Architected a Human Capital Tabular Model (25 fact tables, 90 dimensions) with incremental refresh and partition management.",
                    "Delivered a Blazor administrative hub for platform health, access visibility, and compliance monitoring."
                )
            });

        // IRS — Senior Data Engineer / Analyst (Jun 2019 – Nov 2022)
        UpsertExperience(
            experience,
            start: new DateTime(2019, 6, 1),
            org: "Internal Revenue Service",
            () => new ResumeEntry
            {
                Title = "Senior Data Engineer / Analyst",
                Organization = "Internal Revenue Service",
                Location = "Cincinnati, OH",
                StartDate = new DateTime(2019, 6, 1),
                EndDate = new DateTime(2022, 11, 1),
                Description =
                    "Modernized HR analytics and data integration for IRS enterprise reporting.",
                TechStack = "C#/.NET, SQL, PL/SQL, Power BI, Python, REST APIs, Azure DevOps",
                BulletPoints = Bullets(
                    "Managed the transition of training analytics to Treasury’s warehouse; consolidated 20+ PL/SQL scripts into a unified model processing 20M+ rows daily.",
                    "Built .NET/SQL reconciliation utilities across three HR/payroll systems, improving institutional data integrity.",
                    "Engineered Python and API data pipelines (CDC/JHU) to ingest, transform, and publish COVID-19 tracking data with zero manual intervention.",
                    "Developed HR dashboards with 500k+ views to 500+ stakeholders, reducing ad-hoc data requests."
                )
            });

        // IRS — Operations Research Analyst (Nov 2017 – Jun 2019)
        UpsertExperience(
            experience,
            start: new DateTime(2017, 11, 1),
            org: "Internal Revenue Service",
            () => new ResumeEntry
            {
                Title = "Operations Research Analyst",
                Organization = "Internal Revenue Service",
                Location = "Cincinnati, OH",
                StartDate = new DateTime(2017, 11, 1),
                EndDate = new DateTime(2019, 6, 1),
                Description =
                    "Modernized workforce analytics and organizational tooling for leadership decision support.",
                TechStack = "R, SQL, Tableau, VBA",
                BulletPoints = Bullets(
                    "Replaced a $3M legacy organizational tool with a custom, governed solution encoding complex hierarchy rules.",
                    "Implemented R-based outlier detection and forecasting models to automate ingestion and analysis of complex paginated records."
                )
            });

        var experienceKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "U.S. Department of the Treasury|2022-11",
            "Internal Revenue Service|2019-06",
            "Internal Revenue Service|2017-11"
        };
        experience.Entries.RemoveAll(e =>
        {
            var key = $"{e.Organization}|{e.StartDate:yyyy-MM}";
            return !experienceKeys.Contains(key);
        });

        // ---------- EDUCATION (leave as-is if you already seeded it) ----------
        var education = await db.ResumeSections
            .Include(s => s.Entries)
            .ThenInclude(e => e.BulletPoints)
            .FirstOrDefaultAsync(s => s.SectionTitle == "Education");

        if (education is null)
        {
            education = new ResumeSection
            {
                SectionTitle = "Education",
                Entries = new List<ResumeEntry>()
            };
            db.ResumeSections.Add(education);
        }

        EnsureEducationEntry(
            education,
            start: new DateTime(2010, 12, 1),
            title: "Master of Business Administration (MBA) | Finance & Analytics",
            org: "Murray State University",
            () => new ResumeEntry
            {
                Title = "Master of Business Administration (MBA) | Finance & Analytics",
                Organization = "Murray State University",
                Location = "Murray, KY, United States",
                StartDate = new DateTime(2010, 12, 1),
                EndDate = new DateTime(2012, 12, 1),
                Description = "MBA with a 4.0 GPA.",
                BulletPoints = Bullets(
                    "GPA: 4.0 / 4.0"
                )
            });

        EnsureEducationEntry(
            education,
            start: new DateTime(2006, 8, 1),
            title: "Bachelor of Science (BS) | Accounting",
            org: "University of Kentucky",
            () => new ResumeEntry
            {
                Title = "Bachelor of Science (BS) | Accounting",
                Organization = "University of Kentucky",
                Location = "Lexington, KY, United States",
                StartDate = new DateTime(2006, 8, 1),
                EndDate = new DateTime(2009, 8, 1),
                Description = "Bachelor of Science in Accounting.",
                BulletPoints = Bullets()
            });

        var educationKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Murray State University|2010-12",
            "University of Kentucky|2006-08"
        };
        education.Entries.RemoveAll(e =>
        {
            var key = $"{e.Organization}|{e.StartDate:yyyy-MM}";
            return !educationKeys.Contains(key);
        });
        RemoveDuplicateEducation(education);

        await db.SaveChangesAsync();
    }

    // Upsert experience by Organization + StartDate (most stable anchors)
    private static void UpsertExperience(ResumeSection section, DateTime start, string org, Func<ResumeEntry> factory)
    {
        var existing = section.Entries.FirstOrDefault(e =>
            e.Organization == org && e.StartDate.Year == start.Year && e.StartDate.Month == start.Month);

        if (existing is null)
        {
            section.Entries.Add(factory());
            return;
        }

        // If it already exists, refresh text/bullets/tech for better on-page quality
        var updated = factory();
        existing.Title = updated.Title;
        existing.Location = updated.Location;
        existing.EndDate = updated.EndDate;
        existing.Description = updated.Description;
        existing.TechStack = updated.TechStack;

        // Replace bullets in order
        existing.BulletPoints ??= new List<BulletPoint>();
        existing.BulletPoints.Clear();
        foreach (var bp in updated.BulletPoints.OrderBy(b => b.Order))
            existing.BulletPoints.Add(new BulletPoint { Text = bp.Text, Order = bp.Order });
    }

    private static void EnsureEducationEntry(
        ResumeSection education,
        DateTime start,
        string title,
        string org,
        Func<ResumeEntry> factory)
    {
        var existing = education.Entries.FirstOrDefault(e =>
            e.Organization == org && e.StartDate.Year == start.Year && e.StartDate.Month == start.Month);
        if (existing is null)
        {
            education.Entries.Add(factory());
            return;
        }

        var updated = factory();
        existing.Title = updated.Title;
        existing.Location = updated.Location;
        existing.EndDate = updated.EndDate;
        existing.Description = updated.Description;
        existing.BulletPoints ??= new List<BulletPoint>();
        existing.BulletPoints.Clear();
        foreach (var bp in updated.BulletPoints.OrderBy(b => b.Order))
            existing.BulletPoints.Add(new BulletPoint { Text = bp.Text, Order = bp.Order });
    }

    private static List<BulletPoint> Bullets(params string[] lines) =>
        lines.Select((text, i) => new BulletPoint { Text = text, Order = i }).ToList();

    private static void RemoveDuplicateEducation(ResumeSection education)
    {
        var dupes = education.Entries
            .GroupBy(e => $"{e.Organization}|{e.StartDate:yyyy-MM}")
            .Where(g => g.Count() > 1);

        foreach (var group in dupes)
        {
            var keep = group.OrderBy(e => e.Id).First();
            foreach (var entry in group)
            {
                if (entry != keep)
                    education.Entries.Remove(entry);
            }
        }
    }
}
