# Data journey and coordinated reliability exploration

Release date: October 29, 2026. Builds on the production Atlas workspace, preserving its synthetic service telemetry, analytical definitions, dependency sensitivity model, contact protections, résumé and routes.

## Product audit and outcome

Atlas already supported weighted metrics, comparison periods, linked service/day selection, service details, CSV export and a dependency graph. The missing connection was an inspectable example of how data contracts and application behavior produce trustworthy analytical measures. Navigating directly to engineering evidence from the portfolio also required reaching the bottom of the page.

The updated entry adds a visible engineering-lab link in the portfolio introduction and three concise exploration paths in Atlas. A reliability heatmap reveals the shared October 7–9 failure pattern across five services using the existing records. A new Data journey follows synthetic order deliveries through receive, validate, deduplicate, model and publish. A native keyboard command menu connects views, service selections, incident investigation and reset. All four workspace sections share the active navigation indicator.

## Processing and provenance

`journey-engine.js` reuses `PortfolioEngine.processEvent` for the contract boundary. Twelve deterministic deliveries have IDs, `order.created` types, USD currency and integer cents. Healthy input publishes twelve unique orders totaling $1,729.00. Schema drift quarantines three violations and publishes nine orders totaling $1,340.50. Delivery retries skip two repeated IDs and publish ten orders totaling $1,356.00. First valid ID wins. Each dataset satisfies `received = accepted + quarantined + duplicates`.

The analytical product is explicitly a calculated preview. Stage selection changes the representation of an inspected delivery; it does not rerun a backend. Rejected events and skipped retries expose their exclusion reason at subsequent stages and contribute nothing additional. Accepted contribution bars and the complete delivery ledger open the same provenance inspector. Pausable replay walks the stages; scenario changes cancel a pending replay. Reduced motion completes replay immediately and leaves manual inspection available.

The order dataset is independent of the service telemetry. The on-screen processing disclosure states this, together with the absence of a backend, queue, authentication, payments, persistence and external calls. The existing service latency model remains a sensitivity illustration; it does not claim causal inference.

## Coordination and state

`journey.js` owns event inspection, heatmap interaction and command-menu behavior. Atlas exposes two small event contracts: `atlas:select` validates a service ID and in-window date before updating shared analytical state; `atlas:render` refreshes the matrix. `atlas:reset` restores the event view too. Existing model and observed data remain separate.

The heatmap shows the last min(14, selected-window-days) daily records for every service, regardless of service/day focus. Its scope is visible. Color and symbols distinguish within-budget, over-budget and at-least-five-times-budget cells. Every button has exact success/error values in its accessible label; pointer and keyboard inspection display a textual readout. Roving tab order, arrow keys and Home/End keep the 70-cell matrix manageable. A narrow, labeled scrolling region contains genuine analytical width.

Allowlisted URL parameters `journey`, `stage` and `event` retain scenario, stage and selected delivery while Atlas changes service, date, reporting window or model. Values are clamped; arbitrary scenario keys fall back. Native modal behavior provides focus containment and Escape dismissal for command search. Search content is never inserted into HTML.

## Design and responsive behavior

New components reuse Atlas's forest/sage theme tokens, native controls, typography and scoped light/dark surfaces. The desktop data path becomes a vertical, full-width sequence on portrait phones. Short landscape retains a five-stage path, 14 px principal labels and 13 px chart text. The 320 px scenario control takes a full row. Workspace links retain 44 px height. Dialogs fit the short viewport and scroll internally. Motion honors `prefers-reduced-motion`; nothing auto-plays on entry.

## Verification and limits

The full release suite has 62 passing Node/JSDOM checks. New tests cover reconciliation, exact integer totals, quarantine reasons, deduplication, immutable results, URL allowlists/restoration, replay cancellation, reduced motion, matrix keyboard selection/focus, linked analytical filtering, command-menu keyboard behavior and empty states. Axe-core checks the workspace and native dialog semantics under JSDOM; layout-based contrast is not available there. Existing token contrast, API origin/session/timing rejection, contact nondisclosure, public résumé privacy and static packaging checks also pass.

Chromium review used local same-origin iframe viewports at 320×720, 390×844, 844×390, 768×1024, 1280×800 and 1920×1080, with no document-wide horizontal overflow. Visual review covered light/dark surfaces, portrait stage stacking, short-landscape controls, the command dialog, exact Storage/October 8 heatmap selection and rejected-event provenance. QA wrappers are excluded by the clean build.

There are no added runtime packages, network integrations or paid services. The new scripts are about 6.5 KB gzip and their stylesheet about 4.7 KB gzip before formatting, with checked budgets of 8 KB and 6 KB respectively. The dataset is deliberately small; this is not a distributed-system load test. Physical devices, Safari/Firefox, screen-reader certification and Core Web Vitals remain unverified.

Production publication and exact artifact checks must be confirmed separately before claiming deployment success.
