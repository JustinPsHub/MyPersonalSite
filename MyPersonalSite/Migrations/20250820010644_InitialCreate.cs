using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyPersonalSite.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ResumeSections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SectionTitle = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResumeSections", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ResumeItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    ItemType = table.Column<string>(type: "TEXT", maxLength: 21, nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Organization = table.Column<string>(type: "TEXT", nullable: true),
                    StartDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    EndDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Location = table.Column<string>(type: "TEXT", nullable: true),
                    ResumeSectionId = table.Column<int>(type: "INTEGER", nullable: true),
                    ProficiencyLevel = table.Column<int>(type: "INTEGER", nullable: true),
                    YearsExperience = table.Column<int>(type: "INTEGER", nullable: true),
                    Category = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResumeItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResumeItems_ResumeSections_ResumeSectionId",
                        column: x => x.ResumeSectionId,
                        principalTable: "ResumeSections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ResumeEntryBulletPoints",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BulletPoint = table.Column<string>(type: "TEXT", maxLength: 400, nullable: false),
                    ResumeEntryId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResumeEntryBulletPoints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResumeEntryBulletPoints_ResumeItems_ResumeEntryId",
                        column: x => x.ResumeEntryId,
                        principalTable: "ResumeItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResumeEntryBulletPoints_ResumeEntryId",
                table: "ResumeEntryBulletPoints",
                column: "ResumeEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_ResumeItems_ResumeSectionId",
                table: "ResumeItems",
                column: "ResumeSectionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResumeEntryBulletPoints");

            migrationBuilder.DropTable(
                name: "ResumeItems");

            migrationBuilder.DropTable(
                name: "ResumeSections");
        }
    }
}
