using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using MyPersonalSite.Components;
using MyPersonalSite.Data;
using MyPersonalSite.Shared.Models;
using MyPersonalSite.Shared.DTOs; // add this


var builder = WebApplication.CreateBuilder(args);

// Razor Components (Server + WASM interactivity)
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents()
    .AddInteractiveWebAssemblyComponents();

// Optional: traditional APIs (controllers)
builder.Services.AddControllers();

// EF Core (SQLite)
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// HttpClient factory for DI in components
builder.Services.AddHttpClient();

// Compression / caching / ratelimiting / health
builder.Services.AddResponseCompression(o =>
{
    o.EnableForHttps = true;
    o.Providers.Add<BrotliCompressionProvider>();
    o.Providers.Add<GzipCompressionProvider>();
});
builder.Services.AddOutputCache();

builder.Services.AddRateLimiter(_ =>
{
    _.AddFixedWindowLimiter("api", o =>
    {
        o.Window = TimeSpan.FromSeconds(10);
        o.PermitLimit = 60;
        o.QueueLimit = 0;
    });
});

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>();

// Optional: App Insights
builder.Services.AddApplicationInsightsTelemetry();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseWebAssemblyDebugging();
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

// --- DB migrate & seed on startup ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DbInitializer.SeedAsync(db);
}

app.UseHttpsRedirection();
app.UseResponseCompression();
app.UseAntiforgery();

// --- Static files (ensure .avif served with correct MIME) ---
var provider = new FileExtensionContentTypeProvider();
provider.Mappings[".avif"] = "image/avif"; // safety: older stacks may miss this
app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = provider });

// --- Security headers / CSP ---
app.Use(async (ctx, next) =>
{
    var h = ctx.Response.Headers;

    // If ALL your JS (site.js, d3Interop.js, d3.min.js) is served locally from wwwroot, use this:
    h["Content-Security-Policy"] =
        "default-src 'self'; " +
        "script-src 'self'; " +                  // local JS only
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "img-src 'self' data:; " +
        "connect-src 'self' wss: https:; " +     // Blazor circuit + APIs
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "object-src 'none'; " +
        "frame-ancestors 'none'";

    // If you DO keep a CDN for d3, swap script-src line to:
    // "script-src 'self' https://cdn.jsdelivr.net; "

    h["X-Content-Type-Options"] = "nosniff";
    h["Referrer-Policy"] = "strict-origin-when-cross-origin";
    h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    h["X-Frame-Options"] = "DENY";
    await next();
});

app.UseRateLimiter();
app.UseOutputCache();

// Static assets and referenced RCLs
app.MapStaticAssets();

// ---- API GROUP (rate-limited) ----
var api = app.MapGroup("/api").RequireRateLimiting("api");

// Health (probes)
api.MapGet("/health", () => Results.Ok(new { ok = true }));
app.MapHealthChecks("/healthz");

// Debug stats (used on Home)
api.MapGet("/debug/db-stats", async (AppDbContext db) =>
{
    var items = await db.ResumeItems.CountAsync();
    var sections = await db.ResumeSections.CountAsync();
    var entries = await db.ResumeItems.OfType<ResumeEntry>().CountAsync();
    return Results.Json(new { items, sections, entries });
}).CacheOutput(p => p.Expire(TimeSpan.FromMinutes(1)));

// Metrics for visuals - change events by year (seeded mock data)
api.MapGet("/metrics/entries-per-year", () =>
{
    var rng = new Random(42);
    var startYear = DateTime.UtcNow.Year - 4;
    var baseValue = 160;
    var data = Enumerable.Range(0, 5).Select(i =>
    {
        var jitter = rng.Next(-12, 18);
        var value = baseValue + (i * 40) + jitter;
        return new YearCount(startYear + i, value);
    }).ToList();

    return Results.Json(data);
}).CacheOutput(p => p.Expire(TimeSpan.FromMinutes(5)));

// Metrics for visuals - service portfolio activity (seeded mock data)
api.MapGet("/metrics/entries-by-org", () =>
{
    var services = new[]
    {
        "Identity & Access",
        "Payments API",
        "Edge Gateway",
        "Data Platform",
        "Observability",
        "Compute Fleet",
        "Messaging",
        "Search",
        "Security Posture",
        "Storage Core",
        "CI/CD",
        "Networking",
        "Cost Insights",
        "Streaming"
    };

    var rng = new Random(77);
    var data = services
        .Select(name => new OrgCount(name, rng.Next(40, 160)))
        .OrderByDescending(x => x.count)
        .ToList();

    return Results.Json(data);
}).CacheOutput(p => p.Expire(TimeSpan.FromMinutes(5)));



app.MapGet("/api/metrics/velocity", () => Results.Ok(new[]{
   new { period="2024-Q1", apps=6, funcs=8, adf=4, pbi=3 },
   new { period="2024-Q2", apps=7, funcs=9, adf=5, pbi=4 },
   new { period="2024-Q3", apps=8, funcs=10, adf=6, pbi=4 },
   new { period="2024-Q4", apps=9, funcs=11, adf=7, pbi=5 },
   new { period="2025-Q1", apps=8, funcs=12, adf=7, pbi=6 },
   new { period="2025-Q2", apps=10, funcs=13, adf=8, pbi=6 },
   new { period="2025-Q3", apps=11, funcs=14, adf=9, pbi=7 },
   new { period="2025-Q4", apps=12, funcs=14, adf=9, pbi=7 }
})); // List<VelocityItem>

app.MapGet("/api/metrics/migrations", () => Results.Ok(new[]{
   new { date=new DateTime(2024,1,1), migrated=180, target=600 },
   new { date=new DateTime(2024,7,1), migrated=520, target=600 },
   new { date=new DateTime(2025,7,1), migrated=612, target=600 }
})); // List<MigrationItem>

app.MapGet("/api/metrics/bi-coverage", () => Results.Ok(new[]{
   new { label="RLS adoption", value=82, target=90 },
   new { label="Refresh automation", value=76, target=85 }
})); // List<BiItem>

app.MapGet("/api/metrics/security-coverage", () => Results.Ok(new[]{
   new { feature="CSP",          target="Web Apps", pct=100 },
   new { feature="CSP",          target="APIs",     pct=92  },
   new { feature="CSP",          target="Functions",pct=88  },
   new { feature="Antiforgery",  target="Web Apps", pct=100 },
   new { feature="Antiforgery",  target="APIs",     pct=68  },
   new { feature="Validation",   target="Web Apps", pct=100 },
   new { feature="Validation",   target="APIs",     pct=96  },
   new { feature="Rate limiting",target="APIs",     pct=82  },
   new { feature="Headers",      target="Web Apps", pct=100 },
   new { feature="Headers",      target="APIs",     pct=94  }
})); // List<SecItem>

app.MapGet("/api/metrics/reliability-90d", () => {
    var start = DateTime.UtcNow.Date.AddDays(-90);
    var rnd = new Random(42);
    var rows = Enumerable.Range(0, 90).Select(i => {
        var ok = 15000 + rnd.Next(0, 4000);
        var fail = (rnd.NextDouble() < 0.12) ? rnd.Next(0, 8) : 0;
        return new { date = start.AddDays(i), ok, fail };
    });
    return Results.Ok(rows);
}); // List<RelItem>

app.MapGet("/api/metrics/skills-rolling", () => Results.Ok(new[]{
   new { skill="Blazor", count=22 },
   new { skill="EF Core", count=19 },
   new { skill="Azure Functions", count=17 },
   new { skill="SQL/SQLite", count=16 },
   new { skill="Azure DevOps", count=15 },
   new { skill="Power BI (DAX)", count=13 },
   new { skill="PowerShell", count=12 },
   new { skill="REST APIs", count=12 },
   new { skill="LINQ", count=11 }
})); // List<SkillItem>

var metrics = app.MapGroup("/api/metrics");

// KPIs (with tiny sparkline series)
metrics.MapGet("/kpis", () =>
{
    var list = new List<KpiItem>
    {
        new() { label = "SLO compliance", value = 99, suffix = "%", spark = new[]{98,98,99,99,99,99,99,99} },
        new() { label = "IaC coverage", value = 92, suffix = "%", spark = new[]{78,82,84,88,90,91,92,92} },
        new() { label = "Patch compliance", value = 97, suffix = "%", spark = new[]{92,93,95,96,96,97,97,97} },
        new() { label = "FinOps savings (QTD)", value = 320, prefix = "$", suffix = "k", spark = new[]{120,160,200,240,270,290,310,320} }
    };
    return Results.Ok(list);
});

// Delivery velocity — sample last 48 months (replace with real data when ready)
metrics.MapGet("/velocity-monthly", () =>
{
    var now = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
    var months = Enumerable.Range(0, 48).Select(i => now.AddMonths(-47 + i));
    var rng = new Random(42);

    var series = months.Select((dt, i) => new MonthCount
    {
        month = $"{dt:yyyy-MM}",
        count = i switch
        {
            < 12 => rng.Next(18, 36),
            < 24 => rng.Next(28, 52),
            < 36 => rng.Next(40, 70),
            _ => rng.Next(55, 95)
        }
    }).ToList();

    return Results.Ok(series);
});

// ADO migrations — bullet (actual vs goal)
metrics.MapGet("/ado-migrations", () =>
{
    var model = new BulletModel { value = 78, target = 85, max = 100 };
    return Results.Ok(model);
});


api.MapGet("/resume", async (AppDbContext db) =>
{
    var sections = await db.ResumeSections
        .AsNoTracking()
        .Include(s => s.Entries)
            .ThenInclude(e => e.BulletPoints)
        .OrderBy(s => s.Order)
        .Select(s => new ResumeSectionDto(
            s.Id,
            s.SectionTitle,
            s.Order,
            s.Entries
                .OrderBy(e => e.StartDate)
                .ThenBy(e => e.Title)
                .Select(e => new ResumeEntryDto(
                    e.Id,
                    e.Title,
                    e.Organization,
                    e.Location,
                    e.StartDate,
                    e.EndDate,
                    e.Description,
                    e.TechStack, // ← now projected
                    e.BulletPoints
                        .OrderBy(bp => bp.Order)
                        .Select(bp => new BulletPointDto(bp.Order, bp.Text))
                        .ToList()
                ))
                .ToList()
        ))
        .ToListAsync();

    return Results.Json(sections);
}).CacheOutput(p => p.Expire(TimeSpan.FromMinutes(10)));

// Controllers (if any) — also rate-limit
app.MapControllers().RequireRateLimiting("api");

// Razor Components host mapping
app.MapRazorComponents<App>()
   .AddInteractiveServerRenderMode()
   .AddInteractiveWebAssemblyRenderMode()
   .AddAdditionalAssemblies(typeof(MyPersonalSite.Client._Imports).Assembly);

app.Run();

// DTOs for minimal API serialization
public record YearCount(int year, int count);
public record OrgCount(string org, int count);


public sealed class KpiItem
{
    public string label { get; set; } = "";
    public int value { get; set; }
    public string? prefix { get; set; }
    public string? suffix { get; set; }
    public int[] spark { get; set; } = Array.Empty<int>();
    public double? target { get; set; }
}
public sealed class MonthCount
{
    public string month { get; set; } = "";
    public int count { get; set; }
}
public sealed class BulletModel
{
    public double value { get; set; }
    public double? target { get; set; }
    public double? max { get; set; }
}
