<div align="center">

# Justin Palmer

Software engineer & data architect

**[Portfolio ↗](https://www.justinraypalmer.com/)** · [Experience](https://www.justinraypalmer.com/resume) · [Lab](https://www.justinraypalmer.com/visuals) · [Email](mailto:justinraypalmer@gmail.com)

</div>

A focused portfolio of .NET applications, Azure data platforms, and governed analytics. Selected work presents the contribution, design choices, and project-specific outcomes. The original ASP.NET Core/Blazor solution remains in this repository; the public site is a small static frontend.

## Explore

| Page | Purpose |
| --- | --- |
| **Work** | A short introduction and three enterprise projects. Native disclosures expose deeper case details without requiring JavaScript. |
| **Experience** | Professional history, education, certifications, Word résumé, and browser printing. |
| **Lab** | A working synthetic-data dashboard with linked filters, shareable views, and CSV exports. |
| **Engineering notes** | A secondary page, linked from the lab, with a conceptual architecture and event-validation example. Existing `/platform` links remain valid. |

The interface uses self-hosted DM Sans and Manrope, restrained colors, responsive type, keyboard-accessible controls, and a persistent light/dark preference. It has no decorative animation loop or frontend framework. Motion is limited to short hover transitions and respects the operating system's reduced-motion preference.

## Implementation

| Layer | Source |
| --- | --- |
| Public pages, CSS, JavaScript, SVG charts | [`MyPersonalSite/wwwroot/portfolio`](MyPersonalSite/wwwroot/portfolio) |
| Pure event validation and dashboard URL parsing | [`engine.js`](MyPersonalSite/wwwroot/portfolio/engine.js) |
| Dashboard and theme behavior | [`app.js`](MyPersonalSite/wwwroot/portfolio/app.js) |
| Navigation disclosure and event example | [`modern.js`](MyPersonalSite/wwwroot/portfolio/modern.js) |
| Static packaging and routes | [`scripts/build-static.mjs`](scripts/build-static.mjs), [`staticwebapp.config.json`](staticwebapp.config.json) |
| Contract, interaction, and packaging checks | [`tests`](tests) |
| Retained .NET application | `MyPersonalSite`, `MyPersonalSite.Client`, `MyPersonalSite.Shared` |

The static release needs no server process, API keys, database, or data service. The retained .NET 9 application uses ASP.NET Core, Blazor, EF Core, and SQLite and can be run independently.

## Run and verify

Use Node.js 20 or newer:

```sh
npm --prefix tests ci --ignore-scripts
npm --prefix tests test
node scripts/build-static.mjs
npx --yes @azure/static-web-apps-cli start artifacts/static-site
```

Open **http://localhost:4280**. The emulator applies the same static routes as hosting.

To run the retained .NET host with the .NET 9 SDK:

```sh
dotnet restore
dotnet run --project MyPersonalSite --launch-profile http
```

The host applies migrations and seeds a local SQLite database on startup. Its data and server features are not part of the public static release.

## Publish

Deploy `artifacts/static-site`, including `staticwebapp.config.json`, through an authenticated Azure Static Web Apps deployment workflow. Keep credentials in hosting or CI secret storage. The site uses the **Free** plan; domain registration and unrelated resources have separate costs.

Verify the four routes, project disclosures, theme switching, dashboard, event example, and résumé download after publication. Automated JSDOM tests verify behavior without a browser layout engine; separate browser review is needed for responsive rendering, native focus, and printing. The tests do not establish Core Web Vitals or a Lighthouse score.

## Data and attribution

Enterprise case studies summarize the published résumé without exposing production systems. The dashboard and event example use deterministic synthetic data and run locally in the browser. The Azure OpenAI case describes professional work, not a live AI backend on this site. Self-hosted font licenses are included beside the font files.

[Frontend notes](docs/portfolio-modernization.md) · [Test details](tests/README.md)
