using System.Collections.Generic;

namespace MyPersonalSite.Shared.Models
{
    public class ResumeSection
    {
        public int Id { get; set; }
        public string SectionTitle { get; set; }
        public List<ResumeEntry> Entries { get; set; } = new();
    }
}
