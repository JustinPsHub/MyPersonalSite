using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyPersonalSite.Migrations
{
    /// <inheritdoc />
    public partial class Resume_BulletPointsOwned : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "ResumeSections",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TechStack",
                table: "ResumeItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "ResumeEntryBulletPoints",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Order",
                table: "ResumeSections");

            migrationBuilder.DropColumn(
                name: "TechStack",
                table: "ResumeItems");

            migrationBuilder.DropColumn(
                name: "Order",
                table: "ResumeEntryBulletPoints");
        }
    }
}
