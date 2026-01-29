using System;
using System.Collections.Generic;

namespace MyPersonalSite.Shared.Models
{
    public class ResumeEntry : ResumeItemBase
    {
        public string? Organization { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Location { get; set; }
        public List<BulletPoint> BulletPoints { get; set; } = new();

        public string? TechStack { get; set; }
    }
}
