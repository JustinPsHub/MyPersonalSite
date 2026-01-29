<div align="center">

# Justin Palmer — Personal Site

**Software Engineering • Data/Cloud Platforms • Production‑ready delivery**

![.NET 9](https://img.shields.io/badge/.NET-9-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Blazor](https://img.shields.io/badge/Blazor-Interactive_Server-512BD4?style=for-the-badge&logo=blazor&logoColor=white)
![EF Core](https://img.shields.io/badge/EF_Core-SQLite-6DB33F?style=for-the-badge&logo=sqlite&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-visuals-F9A03C?style=for-the-badge&logo=d3dotjs&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)

[Live site](https://justinraypalmer.com) • [GitHub profile](https://github.com/JustinPsHub)

</div>

This repo is my public portfolio and the primary showcase of how I build software products and data/cloud platforms. It is intentionally production‑minded: clean UI/UX, structured content, API‑backed data, and interactive visuals.

## Why this exists
Most of my professional work is in federal environments behind a firewall, so I cannot share those projects publicly. This site is the open, end-to-end artifact that demonstrates how I design, build, and ship software in a real-world setting.

## Highlights
![Dual Track](https://img.shields.io/badge/Focus-Software_Engineering_%2B_Data_Platforms-0F766E?style=flat-square)
![Architecture](https://img.shields.io/badge/Architecture-Enterprise--scale-0F766E?style=flat-square)
![Security](https://img.shields.io/badge/Security-Defense--in--Depth-0F766E?style=flat-square)
![Observability](https://img.shields.io/badge/Delivery-Production--ready-0F766E?style=flat-square)
![RAG](https://img.shields.io/badge/GenAI-Azure_OpenAI_RAG-0F766E?style=flat-square)

- Dual‑track positioning: software engineering + data/cloud platform engineering
- Blazor Interactive Server with reusable components and responsive layout
- API‑backed data and seeded telemetry for dashboards
- D3 visualizations with filters and deterministic redraws
- Production‑minded runtime: output caching, rate limiting, security headers
- Resume page is fully web‑based (no phone number shown)

## Tech stack
![C#](https://img.shields.io/badge/C%23-Modern-512BD4?style=flat-square&logo=csharp&logoColor=white)
![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-9-512BD4?style=flat-square&logo=dotnet&logoColor=white)
![Blazor](https://img.shields.io/badge/Blazor-Interactive_Server-512BD4?style=flat-square&logo=blazor&logoColor=white)
![EF Core](https://img.shields.io/badge/EF_Core-SQLite-6DB33F?style=flat-square&logo=sqlite&logoColor=white)
![D3](https://img.shields.io/badge/D3.js-Visuals-F9A03C?style=flat-square&logo=d3dotjs&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?style=flat-square&logo=bootstrap&logoColor=white)

- .NET 9 (ASP.NET Core)
- Blazor (Interactive Server + optional WebAssembly components)
- EF Core + SQLite (seeded data)
- D3.js for charts and dashboards
- Bootstrap 5 for layout and UI utilities
- Application Insights (optional)

## Local setup
Prerequisites:
- .NET 9 SDK

Run locally:
```bash
# from repo root

dotnet restore

dotnet run --project MyPersonalSite
```
The app will print the local URL in the console (typically https://localhost:xxxx).

## Data & confidentiality
- Resume and site data is seeded into a local SQLite database on startup.
- Visuals use seeded/mock telemetry to mimic real-world signals.
- Metrics and outcomes are anonymized/aggregated due to federal confidentiality restrictions.

## Architecture overview
```mermaid
flowchart LR
    Browser[User Browser] -->|HTTPS| App[ASP.NET Core Host]
    App -->|Blazor Interactive Server| UI[Components & Pages]
    App -->|Minimal APIs| Api[/api/metrics & /api/resume/]
    Api --> Db[(SQLite)]
    UI --> D3[D3.js Visuals]
    UI --> Assets[Static Assets\nCSS/JS/Images]
```

## Data inputs & outputs
```mermaid
flowchart TB
    Seed[Seeded Data (DbInitializer)] --> Db[(SQLite)]
    Db --> Resume[Resume Page]
    Db --> Visuals[Visuals Page]
    Visuals --> D3[D3 Charts]
    Resume --> Export[Export (Word/PDF if present)]
    UI[Blazor UI] --> User[Hiring Manager / Bot]
```

## Project structure
- MyPersonalSite/ - Server host (ASP.NET Core + Blazor)
- MyPersonalSite.Client/ - Client project (WebAssembly components)
- MyPersonalSite.Shared/ - Shared DTOs and models
- MyPersonalSite/Components/ - UI pages and layout
- MyPersonalSite/wwwroot/ - Static assets, CSS, JS (including D3)

## Notable pages
- / - Overview and impact summary
- /visuals - Interactive dashboards (seeded telemetry)
- /platform - Architecture and delivery approach
- /resume - Resume content with export options

## Layout note
- Avoid `MyPersonalSite/Components/Layout/MainLayout.razor.css`. It can override the global layout and cause the main content to stack under the left nav. Keep layout rules centralized in `MyPersonalSite/wwwroot/app.css`.

## Contact
- Email: justinraypalmer@gmail.com
- GitHub: https://github.com/JustinPsHub/MyPersonalSite
