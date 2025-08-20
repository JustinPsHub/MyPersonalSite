using Microsoft.EntityFrameworkCore;
using MyPersonalSite.Components;
using MyPersonalSite.Data; // <— for AppDbContext
using MyPersonalSite.Client.Pages; // you already had this

var builder = WebApplication.CreateBuilder(args);

// Razor Components with both interactivity modes
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents()
    .AddInteractiveWebAssemblyComponents();

// (Optional) traditional APIs; handy for data endpoints
builder.Services.AddControllers(); // <— add this

// EF Core (SQLite)
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"))); // <— add this

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

app.MapStaticAssets();

app.MapRazorComponents<App>()
   .AddInteractiveServerRenderMode()
   .AddInteractiveWebAssemblyRenderMode()
   .AddAdditionalAssemblies(typeof(MyPersonalSite.Client._Imports).Assembly);

// Map controllers (if you added any)
app.MapControllers(); // <— add this

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();         // ensure database is up to date
    await DbInitializer.SeedAsync(db);        // seed once
}


app.Run();
