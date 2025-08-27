// Shared/DTOs/ResumeDtos.cs
namespace MyPersonalSite.Shared.DTOs;

public record BulletPointDto(int Order, string Text);

public record ResumeEntryDto(
    int Id,
    string Title,
    string? Organization,
    string? Location,
    DateTime StartDate,
    DateTime? EndDate,
    string? Description,
    string? TechStack,                 // ← add this
    List<BulletPointDto> BulletPoints
);

public record ResumeSectionDto(
    int Id,
    string SectionTitle,
    int Order,
    List<ResumeEntryDto> Entries
);
