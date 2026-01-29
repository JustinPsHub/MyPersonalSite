namespace MyPersonalSite.Shared.Models
{
    public abstract class ResumeItemBase
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
