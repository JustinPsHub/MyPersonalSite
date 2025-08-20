namespace MyPersonalSite.Shared.Models
{
    public class Skill : ResumeItemBase
    {
        public int ProficiencyLevel { get; set; }     // 1-10 scale
        public int YearsExperience { get; set; }
        public string Category { get; set; }
    }
}
