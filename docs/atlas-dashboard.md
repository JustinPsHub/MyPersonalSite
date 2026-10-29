# Atlas operational intelligence workspace

Atlas replaces the `/visuals` example with a connected operational analytics experience. The public portfolio remains a concise introduction; the lab is where visitors can explore engineering depth. It is an independent demonstration with no employer, employee, customer, or live infrastructure data.

## Audit and design direction

The previous dashboard already had deterministic data, shared filters, safe URL parsing, CSV exports, a mobile table alternative, and a small self-hosted runtime. Its large introductory section pushed useful content below the fold. A single aggregate line, noninteractive service bars, and a static totals table did little to support investigation. There was no prior-period comparison, daily cross-filter, dependency context, or details-on-demand workflow.

The redesign keeps the portfolio's forest and sage identity and self-hosted typography, with a denser application scale, a workspace rail, scoped surface/color tokens, tabular numbers, coordinated selection, and explicit analytical scope. It uses native controls and a native modal dialog. Restrained state transitions honor reduced motion. No chart framework, animation library, new service, or runtime package was introduced.

## User workflow

- The overview reports service-level requests, volume-weighted success, volume-weighted average latency, releases, period changes, and error budget use against a 99.9% success target.
- The SVG trend compares equal reporting windows. Pointer exploration and the keyboard-accessible daily slider expose exact values. Focusing a day updates the overview, failure contributions, service details, and exports.
- Failure contribution buttons and dependency nodes select a service while retaining portfolio comparison context. Search and sorting refine the explorer table only; its scope is stated next to it.
- **Investigate incident** selects Storage on October 8, changes the chart to latency, opens the dependency section, and initializes an explicitly illustrative +125 ms model. This is a preset analytical workflow, not a claim that the model reproduces the observed incident.
- The dependency lens reveals synchronous callers exposed to the selected node. The slider estimates added latency through the directed graph; observed metrics and CSV records never change because of a model setting.
- The service inspector supports direct relationship navigation and daily drilldown. Native modal behavior provides Escape, focus containment, and return to the opening control.
- Share URLs preserve service, reporting window, metric, sort, day, model root, added latency, search, and section. CSVs identify every row as synthetic and contain only selected observations.

## Data and definitions

`atlas-engine.js` produces 900 immutable daily records: five fictional services over 180 UTC days ending **October 14, 2026**. The snapshot is deliberately fixed and visibly dated. Each reporting window has a complete preceding equal window, including the 90-day comparison. Weekday/weekend traffic, gradual volume growth, service-specific baselines, release cadence, and an October 7–9 storage incident follow deterministic rules.

Metrics count **service requests**, not unique user actions. Calls across services can therefore count more than once. Success is `(requests − errors) / requests`; latency is weighted by request volume. Error budget consumption is `errors / (requests × 0.001)`. A selected day's comparison uses the day exactly one reporting-window length earlier.

The model propagates a latency increment from the selected service to upstream callers. Synchronous edge exposure weights are gateway → data 65%, gateway → identity 35%, data → storage 80%, identity → storage 50%. Storage therefore has 69.5% exposure in API Gateway, 80% in Data Platform, and 50% in Identity. Telemetry delivery is asynchronous and has zero synchronous latency exposure. The portfolio estimate weights the modeled increment by observed service request volumes. The on-screen disclosure explains that retries, queueing, saturation, changes in volume, and changes in failure rate are not modeled. This is sensitivity analysis, not forecasting or causal inference.

## Architecture

| File | Responsibility |
| --- | --- |
| `atlas-engine.js` | Immutable synthetic data, allowlisted state parsing, period/date/service selectors, aggregation, daily series, dependency propagation, model calculations. Runs in the browser and under Node tests. |
| `atlas.js` | URL-backed state, coordinated rendering, native SVG interaction, scoped table search, accessible inspection, sharing and CSV export. One delegated listener handles replaced visual nodes. |
| `atlas.css` | Lab-scoped design tokens, responsive application layouts, chart/map states, native dialog, reduced-motion rules. |
| `app.js` | Shared theme, toast, and print behavior. Dashboard logic has been removed from this shared file. |
| `visuals.html` | Semantic workspace structure, meaningful no-script message, initial loading state and recoverable initialization error. |

Only the lab loads the Atlas engine, UI, and styles. Other pages retain their existing assets. The static build explicitly allowlists the new assets and scans their JavaScript for exposed email addresses. Contact API code, security headers, contact UI, and the protected résumé are unchanged from the previously deployed branch. No credentials, deployment identifiers, database files, or retained .NET host files are included in the release.

## Verification

The Node/JSDOM suite covers data integrity, weighted metrics, complete comparison windows, exact incident records, safe URL values, dependency propagation, asynchronous isolation, immutable observations, coordinated filters, model behavior, search recovery, dialog drilldown, CSV selection, reduced motion, keyboard focus, static packaging, contact API rejection paths, recipient nondisclosure, and résumé privacy. Axe-core checks the initialized workspace and service dialog for WCAG A/AA semantic issues; JSDOM color-contrast checks are disabled because it has no layout engine. Separate token tests check text contrast (4.5:1) and chart colors (3:1) in both themes.

Browser QA uses the cloud Chromium browser and same-origin iframe viewports at 320×720, 390×844, 844×390, 768×1024, 1280×800, and 1920×1080. No document overflow was observed. Phone portrait uses a readable dependency list and labeled service cards. Phone landscape uses a full-width trend and two-column service cards with 16 px metrics. Dialog layout and scrolling were reviewed at the short landscape height. Native Escape returned focus to the opening service; arrow-key day inspection updated exact values; theme switching retained analytical state.

These checks do not establish physical-device certification, screen-reader certification, Safari/Firefox test coverage, Core Web Vitals, or a Lighthouse score. The demo is a small fixed scenario rather than a load test of a production telemetry backend. Larger datasets would merit preaggregation, pagination/virtualization, and a different graph layout strategy.
