using System.Collections.Generic;

namespace MyPersonalSite.Shared.Models
{
    public class ResumeSection
    {
        public int Id { get; set; }
        public string SectionTitle { get; set; } = string.Empty;
        public List<ResumeEntry> Entries { get; set; } = new();
        public int Order { get; set; }
    }
}
