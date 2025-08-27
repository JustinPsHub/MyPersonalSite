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
        "style-src 'self' 'unsafe-inline'; " +   // Bootstrap inline styles
        "img-src 'self' data:; font-src 'self' data:; " +
        "connect-src 'self' wss: https:; " +     // Blazor circuit + APIs
        "base-uri 'self'; frame-ancestors 'none'";

    // If you DO keep a CDN for d3, swap script-src line to:
    // "script-src 'self' https://cdn.jsdelivr.net; "

    h["X-Content-Type-Options"] = "nosniff";
    h["Referrer-Policy"] = "strict-origin-when-cross-origin";
    h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
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

// Metrics for visuals - entries per year
api.MapGet("/metrics/entries-per-year", async (AppDbContext db) =>
{
    var data = await db.ResumeItems
        .OfType<ResumeEntry>()
        .AsNoTracking()
        .GroupBy(e => e.StartDate.Year)
        .OrderBy(g => g.Key)
        .Select(g => new YearCount(g.Key, g.Count()))
        .ToListAsync();

    if (data.Count == 0)
    {
        var y = DateTime.UtcNow.Year;
        data = new List<YearCount> { new(y - 3, 1), new(y - 2, 2), new(y - 1, 3), new(y, 2) };
    }
    return Results.Json(data);
}).CacheOutput(p => p.Expire(TimeSpan.FromMinutes(5)));

// Metrics for visuals - entries by org (fixed translation)
api.MapGet("/metrics/entries-by-org", async (AppDbContext db) =>
{
    // 1) Query provider-friendly shape
    var rows = await db.ResumeItems
        .OfType<ResumeEntry>()
        .AsNoTracking()
        .GroupBy(e => e.Organization) // no coalesce here
        .Select(g => new { org = g.Key, count = g.Count() })
        .OrderByDescending(x => x.count)
        .Take(25)
        .ToListAsync();

    // 2) Coalesce in memory
    var data = rows.Select(x => new OrgCount(x.org ?? "(Unspecified)", x.count)).ToList();

    if (data.Count == 0)
    {
        data = new()
        {
            new("(Demo) Acme", 3),
            new("(Demo) Contoso", 2),
            new("(Demo) Fabrikam", 1),
        };
    }
    return Results.Json(data);
}).CacheOutput(p => p.Expire(TimeSpan.FromMinutes(5)));

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


