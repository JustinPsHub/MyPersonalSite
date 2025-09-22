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

        // Treasury — Business Intelligence Architect (Nov 2022 – Present)
        UpsertExperience(
            experience,
            start: new DateTime(2022, 11, 1),
            org: "U.S. Department of the Treasury",
            () => new ResumeEntry
            {
                Title = "Senior Data Engineer / .NET Engineer (Business Intelligence Architect)",
                Organization = "U.S. Department of the Treasury",
                Location = "Washington, DC",
                StartDate = new DateTime(2022, 11, 1),
                EndDate = null,
                Description =
                    "Lead engineer for Treasury’s shared virtual analytics environment (250+ users). " +
                    "Deliver secure, data-driven .NET solutions, Python/R runtime governance, dimensional modeling, " +
                    "and automation across Azure/Power BI.",
                TechStack = "C#/.NET, SQL Server/SSIS, Power BI (Service & RS), Azure (VMs/DevOps), Python, R, LDAP/AD, REST, Git, CI/CD",
                BulletPoints = Bullets(
                    "Own configuration, governance, testing, and packaging for Python/R across Azure VMs; automate secure package deployments and present change requests to Cybersecurity.",
                    "Built an AD password-expiry notification service + access dashboard (LDAP + T-SQL + Database Mail) showing security groups (incl. nested), DB permissions, and SSRS roles—used for audits and self-service troubleshooting.",
                    "Designed daily ETL + dimensional models (SSIS/SQL) for IRS ITM Learning powering 100+ reports/dashboards; documented in Markdown and transitioned to Azure DevOps for O&M.",
                    "Wrote a C#/.NET data-quality comparator that web-scrapes IRS report metadata, reconciles Treasury’s HR warehouse, persists diffs to SQL, and visualizes KPIs via Power BI.",
                    "Upgraded/administered six Power BI Report Server instances (2021 → May 2023), resolved post-upgrade config bug, and corrected reserved URL settings to restore uptime.",
                    "Led migration of 600+ projects from GitLab to Azure DevOps (Repos/Boards/Wikis/Pipelines); standardized patterns, ported atypical pipelines, and retired an enterprise GitLab license.",
                    "Implemented enterprise row-level security patterns for human-capital models in Power BI Service—reusable roles, dynamic policies, least-privilege by default.",
                    "Linked SQL Servers across environments to enable live cross-env querying without full ETLs, preserving data ownership/security while powering real-time dashboards.",
                    "Secured three Microsoft Azure certs (AZ-900, DP-900, AI-900, FY23) and deliver recurring enablement sessions (SSMS/ADS, Power BI, VS/VS Code, RStudio).",
                    "Customized Microsoft’s RDL Migration Tool (.NET) for GovCloud endpoints to migrate 1,000+ reports/dashboards to Power BI Service."
                )
            });

        // IRS — Management & Program Analyst (Jun 2019 – Nov 2022)
        UpsertExperience(
            experience,
            start: new DateTime(2019, 6, 1),
            org: "Internal Revenue Service",
            () => new ResumeEntry
            {
                Title = "Management & Program Analyst",
                Organization = "Internal Revenue Service",
                Location = "Cincinnati, OH",
                StartDate = new DateTime(2019, 6, 1),
                EndDate = new DateTime(2022, 11, 1),
                Description =
                    "Drove HR analytics modernization and enterprise reporting—architected data models, " +
                    "automated ETL, and delivered high-impact dashboards consumed by executives and analysts.",
                TechStack = "C#/.NET, T-SQL, SSIS, Power BI, GitLab/Azure DevOps, REST/JSON, Tableau, VBA",
                BulletPoints = Bullets(
                    "Led the transition of IRS training analytics to Treasury’s warehouse; authored deltas/ETL requirements and consolidated 20+ PL/SQL scripts into a daily SQL model powering 50+ Power BI dashboards over 20M rows.",
                    "Developed .NET + SQL programs to reconcile HR payroll data across three enterprise systems; bi-weekly diffs drove architecture fixes and improved data integrity across platforms.",
                    "Published and maintained six HR dashboards with 50k+ cumulative views by 500+ stakeholders—self-service analytics reduced ad-hoc requests and cycle time.",
                    "Built automated COVID-19 data pipelines (JHU GitHub + CDC APIs) to ingest, transform, and publish datasets via SQL jobs/shared drives.",
                    "Integrated CFO/HCO data via SSIS + C# to match every NFC employee bi-weekly; reduced non-match rate from >5% to 0% with robust validation/clean-up routines.",
                    "Created/maintained a VBA org-charting application (Excel + Visio/PDF) supporting Requests for Organizational Change (ROC), including approved/temporary positions.",
                    "Embedded and automated Tableau visuals; served as primary data architect for dynamic T-SQL used by report and Tableau developers."
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
                    "Built decision-support tools, automated analytics, and workforce visualization used by leadership each pay period.",
                TechStack = "R (tidyverse/caret/mlr3), Tableau, VBA, SQL, SharePoint, Visio",
                BulletPoints = Bullets(
                    "Replaced ~$3M legacy tool with a custom org-charting app (Visio/SharePoint/Excel/VBA) encoding IRS HR hierarchy rules; trained teams and drove adoption.",
                    "Automated the ‘Workforce Snapshot’ Tableau product—ten charts previously compiled quarterly now refresh every pay period.",
                    "Delivered R-based analyses and automation for outliers/forecasts; scripted performance-plan timeliness reporting from SharePoint flat files.",
                    "Built a UI-Automation + HTML Object Library scraper to ingest 457 paginated HR records automatically into curated datasets.",
                    "Produced SQL for monthly Access-based reporting and designed an Excel/VBA hiring projection model used by management.",
                    "Monitored HP-PPM resource logs, identified widespread executive code misclassification, and drove system corrections."
                )
            });

        // IRS — Internal Revenue Agent (Sep
        // – Nov 2017)
        UpsertExperience(
            experience,
            start: new DateTime(2009, 9, 1),
            org: "Internal Revenue Service",
            () => new ResumeEntry
            {
                Title = "Internal Revenue Agent",
                Organization = "Internal Revenue Service",
                Location = "Cincinnati, OH",
                StartDate = new DateTime(2009, 9, 1),
                EndDate = new DateTime(2017, 11, 1),
                Description =
                    "Subject-matter expert and knowledge-management leader for the Exempt Organizations program; training, policy, and process improvement.",
                TechStack = "Excel/VBA, Lean Six Sigma, Knowledge Mgmt",
                BulletPoints = Bullets(
                    "Led knowledge network analysis and training for EO; delivered technical training to 250+ agents, cutting related field questions by >50%.",
                    "Automated KM metrics/reporting (monthly/quarterly/annual) enabling program effectiveness tracking.",
                    "Authored official guidance adopted by the Service (guide sheets + three issue snapshots) and released publicly.",
                    "Acted as front-line manager and SME across multiple 501(c) domains; briefed senior leaders and coordinated complex resolutions.",
                    "Core team member on a Lean Six Sigma project that eliminated a 71-day bottleneck and removed 50+ days from average case cycle time.",
                    "Presented CPE on automatic revocation and procedural requirements to a 300+ agent program unit."
                )
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
            title: "Master of Business Administration (MBA)",
            org: "Murray State University",
            () => new ResumeEntry
            {
                Title = "Master of Business Administration (MBA)",
                Organization = "Murray State University",
                Location = "Murray, KY, United States",
                StartDate = new DateTime(2010, 12, 1),
                EndDate = new DateTime(2012, 12, 1),
                Description = "MBA with a 4.0 GPA; emphasis in finance, strategy, and analytics.",
                BulletPoints = Bullets(
                    "GPA: 4.0 / 4.0 (30 semester hours)",
                    "Selected coursework: Managerial Finance; Managerial Economics; Quantitative Financial Control; Organizational Behavior; Strategic Management; HR Staffing; Marketing Strategy; Conflict Resolution; Managerial Decision Making"
                )
            });

        EnsureEducationEntry(
            education,
            title: "Bachelor of Science, Accounting",
            org: "University of Kentucky",
            () => new ResumeEntry
            {
                Title = "Bachelor of Science, Accounting",
                Organization = "University of Kentucky",
                Location = "Lexington, KY, United States",
                StartDate = new DateTime(2006, 8, 1),
                EndDate = new DateTime(2009, 8, 1),
                Description = "BS in Accounting with strong foundations in financial reporting, auditing, taxation, and information systems.",
                BulletPoints = Bullets(
                    "GPA: 3.4 / 4.0 (136 semester hours)",
                    "Selected coursework: Financial & Managerial Accounting; Accounting Information Systems; Intermediate Accounting I & II; Auditing; Income Taxation; Cost Management; NFP & Regulatory Accounting; Corporate Finance; Strategic Management; Quantitative Analysis; Information Systems in the Modern Enterprise"
                )
            });

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
        string title,
        string org,
        Func<ResumeEntry> factory)
    {
        var exists = education.Entries.Any(e => e.Title == title && e.Organization == org);
        if (!exists) education.Entries.Add(factory());
    }

    private static List<BulletPoint> Bullets(params string[] lines) =>
        lines.Select((text, i) => new BulletPoint { Text = text, Order = i }).ToList();
}
