using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyPersonalSite.Data;

namespace MyPersonalSite.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResumeController(AppDbContext db) : ControllerBase
{
    [HttpGet("sections")]
    public async Task<IActionResult> GetSections()
    {
        var data = await db.ResumeSections
                           .Include(s => s.Entries)
                           .ThenInclude(e => e.BulletPoints)
                           .ToListAsync();
        return Ok(data);
    }
}
