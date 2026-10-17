<div align="center">

# Justin Palmer

### Complex systems. Clear solutions.

Software engineering · Data platforms · Cloud architecture

![.NET 9](https://img.shields.io/badge/.NET-9-512BD4?style=flat-square&logo=dotnet&logoColor=white)
![Native web](https://img.shields.io/badge/Frontend-HTML%20%C2%B7%20CSS%20%C2%B7%20JavaScript-1B4332?style=flat-square)
![Azure App Service](https://img.shields.io/badge/Hosting-Azure%20App%20Service-0078D4?style=flat-square)

**[Explore the site ↗](https://www.justinraypalmer.com/)** · [Interactive lab](https://www.justinraypalmer.com/visuals) · [Résumé](https://www.justinraypalmer.com/resume) · [Get in touch](mailto:justinraypalmer@gmail.com)

</div>

[![Justin Palmer’s portfolio: clear typography, a green Canvas sculpture, and an overview of software and data engineering experience.](docs/images/portfolio-preview.jpg)](https://www.justinraypalmer.com/)

A personal portfolio that makes complex engineering approachable through selected work, interactive demonstrations, and a readable résumé. The public experience combines native browser graphics and thoughtful motion with an existing ASP.NET Core host, deployed to Azure App Service.

Much of my professional work lives in federal environments. This repository provides a public example of how I turn engineering ideas into usable software; the demonstrations use synthetic data.

## Explore the experience

| Page | What to try |
| --- | --- |
| **[Overview](https://www.justinraypalmer.com/)** | Switch the Canvas sculpture between Network, Flow, and Insight; explore selected work; run an event through validation, transformation, and delivery. |
| **[Interactive lab](https://www.justinraypalmer.com/visuals)** | Filter services and date windows, compare requests, average latency, and failures, copy a view link, and export the filtered CSV. |
| **[Approach](https://www.justinraypalmer.com/platform)** | Explore the experience, services, data, and integration layers of an architecture. |
| **[Résumé](https://www.justinraypalmer.com/resume)** | Read the web version, print it or save it as PDF through the browser, or download the Word document. |

**Across the site:** Ctrl/Cmd+K opens the search dialog, Escape closes it, and theme and motion preferences persist in the browser.

## Engineering highlights

- **Native browser graphics.** Canvas renders the morphing hero sculpture; SVG renders the dashboard charts. The public frontend requires no charting library or JavaScript framework.
- **Controlled animation.** The sculpture uses a single animation loop, targets roughly 30 fps, caps device pixel ratio at 1.75, and reduces point density for coarse pointers. Its loop stops when paused, off-screen, or in a hidden tab. OS reduced motion takes precedence.
- **Inspectable behavior.** The event playground exposes its contract and transformed output. Invalid amounts enter a quarantine path and skip downstream stages.
- **Shareable state.** Allowlisted URL parameters restore dashboard filters, sorting, and metric selection. CSV export uses the same filtered rows as the view.
- **Progressive enhancement.** Main content and navigation are present in HTML. Skip navigation, labeled controls, native dialogs, and keyboard interactions support usability; JavaScript adds the interactive demos.
- **Small, self-hosted assets.** Scripts, styles, and DM Sans/Manrope fonts are served locally. Automated budgets limit the combined gzip size of the four frontend scripts to under 16 KiB and the stylesheet to under 12 KiB, excluding HTML, fonts, and other assets.

## How it is built

| Layer | Implementation |
| --- | --- |
| Public frontend | Four HTML pages, CSS, vanilla JavaScript, Canvas, SVG, native `<dialog>`, IntersectionObserver, and browser history/clipboard APIs. No frontend build step. |
| Web host | .NET 9 / ASP.NET Core. `Program.cs` maps the public page routes and their `.html` aliases to `wwwroot/portfolio`. |
| Existing application | Razor/Blazor Server and WebAssembly components, shared models, and earlier D3/Bootstrap assets remain in the solution. The current public pages use the native frontend above. |
| Data and APIs | EF Core + SQLite, startup migrations/seeding, retained demo APIs, and health endpoints. The public dashboard generates its synthetic dataset in the browser. |
| Hosting | Azure App Service; the host includes response compression, security headers, and caching/rate-limiting policies on selected API endpoints. |
| Frontend verification | Node’s built-in test runner with JSDOM as a development dependency. Node is needed for these tests only. |

### Source map

| Path | Purpose |
| --- | --- |
| [`MyPersonalSite/Program.cs`](MyPersonalSite/Program.cs) | Host configuration, public routes, APIs, and health checks. |
| [`wwwroot/portfolio/`](MyPersonalSite/wwwroot/portfolio) | Current public pages, styles, scripts, and licensed self-hosted fonts. |
| [`engine.js`](MyPersonalSite/wwwroot/portfolio/engine.js) | Pure event validation, dashboard URL parsing, and sculpture geometry. |
| [`app.js`](MyPersonalSite/wwwroot/portfolio/app.js) / [`modern.js`](MyPersonalSite/wwwroot/portfolio/modern.js) | Page interactions, dashboard rendering, search, animation, and event playground. |
| [`MyPersonalSite/Components/`](MyPersonalSite/Components) | Retained Razor/Blazor components. |
| [`MyPersonalSite/Data/`](MyPersonalSite/Data) | EF Core context and seed data. |
| [`MyPersonalSite.Client/`](MyPersonalSite.Client) / [`MyPersonalSite.Shared/`](MyPersonalSite.Shared) | Blazor WebAssembly project and shared types. |
| [`tests/`](tests) | Frontend contract, DOM integration, and asset budget checks. |

## Run locally

Install the **.NET 9 SDK**, then run:

```bash
git clone https://github.com/JustinPsHub/MyPersonalSite.git
cd MyPersonalSite
dotnet restore
dotnet run --project MyPersonalSite --launch-profile http
```

Open **http://localhost:5202**. The host applies migrations and seeds its SQLite database on startup; the default connection string is `Data Source=app.db`. The frontend demos need no external data service or API key.

For development with hot reload:

```bash
dotnet watch --project MyPersonalSite --launch-profile http
```

## Verify changes

With **Node.js 20 or newer**, run from the repository root:

```bash
npm --prefix tests ci --ignore-scripts
npm --prefix tests test
```

The suite covers event contracts and rejection paths, safe URL-state defaults, finite geometry, page initialization, search and keyboard actions, pipeline outcomes, dashboard totals, animation cancellation, reduced motion, and compressed asset budgets.

JSDOM checks behavior without a layout engine; Canvas, observers, and dialog opening are stubbed. Verify desktop/mobile layouts, native focus behavior, motion settings, and the browser console separately. These tests do not establish a Lighthouse score, Core Web Vitals result, or rendering frame rate. See [test details](tests/README.md) and [frontend implementation notes](docs/portfolio-modernization.md).

## Build and deploy

Publish the ASP.NET Core host, which includes the public frontend:

```bash
dotnet publish MyPersonalSite/MyPersonalSite.csproj -c Release -o ./publish --nologo -p:CompressionEnabled=false
```

Deploy the publish output to an appropriately configured Azure App Service using your team's approved release process. Keep the generated static-asset manifests with their files; replacing assets without matching manifests can break responses. Supply environment-specific settings and persistent storage through the hosting environment rather than committing them here. After deployment, verify the site and its health checks in the target environment.

## Demo data and confidentiality

The dashboard’s request counts, latency, failures, and deployment metrics are **deterministic synthetic data**, separate from the retained server demo APIs. The event pipeline is a local simulation; it does not send real orders or messages. Selected-work descriptions summarize professional experience without exposing production systems or employer telemetry. The Azure OpenAI/RAG case study describes prior work; it is not a live AI backend for this site.

---

**Justin Palmer** · [Website](https://www.justinraypalmer.com/) · [GitHub](https://github.com/JustinPsHub) · [Email](mailto:justinraypalmer@gmail.com)
