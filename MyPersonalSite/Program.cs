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

app.UseHttpsRedirection();
app.UseAntiforgery();

// Serve static assets (wwwroot and referenced RCLs)
app.MapStaticAssets();

// Razor Components host mapping
app.MapRazorComponents<App>()
   .AddInteractiveServerRenderMode()
   .AddInteractiveWebAssemblyRenderMode()
   .AddAdditionalAssemblies(typeof(MyPersonalSite.Client._Imports).Assembly);

// Controllers (if you add any)
app.MapControllers();

//
// --- Diagnostics ---
app.MapGet("/api/health", () => Results.Ok(new { ok = true }));

app.MapGet("/api/debug/db-stats", async (AppDbContext db) =>
{
    var items = await db.ResumeItems.CountAsync();
    var sections = await db.ResumeSections.CountAsync();
    var entries = await db.ResumeItems.OfType<ResumeEntry>().CountAsync();
    return Results.Json(new { items, sections, entries });
});

//
// --- Metrics (used by your D3 page) ---
app.MapGet("/api/metrics/entries-per-year", async (AppDbContext db) =>
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
        // Fallback demo data so the chart still renders
        var y = DateTime.UtcNow.Year;
        data = new List<YearCount>
        {
            new(y - 3, 1),
            new(y - 2, 2),
            new(y - 1, 3),
            new(y,     2),
        };
    }

    return Results.Json(data);
});

app.MapGet("/api/metrics/entries-by-org", async (AppDbContext db) =>
{
    var data = await db.ResumeItems
        .OfType<ResumeEntry>()
        .AsNoTracking()
        .GroupBy(e => e.Organization ?? "(Unspecified)")
        .Select(g => new OrgCount(g.Key, g.Count()))
        .OrderByDescending(x => x.count)
        .Take(10)
        .ToListAsync();

    return Results.Json(data);
});

// --- Migrate & seed on startup ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();   // ensure DB schema
    await DbInitializer.SeedAsync(db);  // seed sample data (idempotent)
}

app.Run();

// DTOs for minimal API serialization
public record YearCount(int year, int count);
public record OrgCount(string org, int count);
