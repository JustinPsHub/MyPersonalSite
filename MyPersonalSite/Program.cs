using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using MyPersonalSite.Components;
using MyPersonalSite.Data;
using MyPersonalSite.Shared.Models;

var builder = WebApplication.CreateBuilder(args);

// Razor Components with both interactivity modes
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents()
    .AddInteractiveWebAssemblyComponents();

// Optional: traditional APIs (controllers)
builder.Services.AddControllers();

// EF Core (SQLite)
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// HttpClient factory for DI in components (IHttpClientFactory)
builder.Services.AddHttpClient();

// --- Production hardening ---
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
        o.PermitLimit = 60; // 60 req/10s per client
        o.QueueLimit = 0;
    });
});

// Health checks (basic endpoint; remove DB-specific checker to avoid extra package)
builder.Services.AddHealthChecks();

var app = builder.Build();

// --- DB migrate & seed on startup ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();   // ensure DB schema
    await DbInitializer.SeedAsync(db);  // seed sample data (idempotent)
}

if (app.Environment.IsDevelopment())
{
    app.UseWebAssemblyDebugging();

    // Dev CSP: allow inline for the Blazor import map / tooling noise
    app.Use(async (ctx, next) =>
    {
        var h = ctx.Response.Headers;
        h["Content-Security-Policy"] =
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " + // dev: allow inline import map
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; font-src 'self' data:; " +
            "connect-src 'self' wss: https:; " +
            "base-uri 'self'; frame-ancestors 'none'";
        h["X-Content-Type-Options"] = "nosniff";
        h["Referrer-Policy"] = "strict-origin-when-cross-origin";
        h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        await next();
    });
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();

    // Prod CSP: strict (no inline scripts)
    app.Use(async (ctx, next) =>
    {
        var h = ctx.Response.Headers;
        h["Content-Security-Policy"] =
            "default-src 'self'; " +
            "script-src 'self' https://cdn.jsdelivr.net; " + // drop jsdelivr if you serve D3 locally
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; font-src 'self' data:; " +
            "connect-src 'self' wss: https:; " +
            "base-uri 'self'; frame-ancestors 'none'";
        h["X-Content-Type-Options"] = "nosniff";
        h["Referrer-Policy"] = "strict-origin-when-cross-origin";
        h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        await next();
    });
}

app.UseHttpsRedirection();
app.UseResponseCompression();
app.UseAntiforgery();

app.UseRateLimiter();
app.UseOutputCache();

// Serve static assets (wwwroot and referenced RCLs)
app.MapStaticAssets();

// ---- API GROUP (all /api/* gets rate-limited) ----
var api = app.MapGroup("/api").RequireRateLimiting("api");

// Health (infra probes)
app.MapHealthChecks("/healthz");

// Simple health for UI
api.MapGet("/health", () => Results.Ok(new { ok = true }));

// Debug stats
api.MapGet("/debug/db-stats", async (AppDbContext db) =>
{
    var items = await db.ResumeItems.CountAsync();
    var sections = await db.ResumeSections.CountAsync();
    var entries = await db.ResumeItems.OfType<ResumeEntry>().CountAsync();
    return Results.Json(new { items, sections, entries });
}).CacheOutput(p => p.Expire(TimeSpan.FromMinutes(1)));

// Metrics (used by your D3 page)
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

api.MapGet("/metrics/entries-by-org", async (AppDbContext db) =>
{
    var data = await db.ResumeItems
        .OfType<ResumeEntry>()
        .AsNoTracking()
        .GroupBy(e => e.Organization ?? "(Unspecified)")
        .Select(g => new OrgCount(g.Key, g.Count()))
        .OrderByDescending(x => x.count)
        .Take(25)
        .ToListAsync();

    if (data.Count == 0)
    {
        data = new() { new("(Demo) Acme", 3), new("(Demo) Contoso", 2), new("(Demo) Fabrikam", 1) };
    }
    return Results.Json(data);
}).CacheOutput(p => p.Expire(TimeSpan.FromMinutes(5)));

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
