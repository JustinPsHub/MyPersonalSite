# Architecture labs and portfolio boundaries

The homepage presents technical capability and two working, explicitly synthetic browser labs. Employers, experience duration, location, education and credentials appear only on the background page and its downloads. Every page exposes Overview, Atlas Lab, Event Lab, Resume and Contact in the same accessible navigation.

## Shared logic

`lab-previews.js` uses AtlasEngine selectors, summaries and dependency modeling, plus PortfolioEngine event presets and batch processing. Preview values are computed, rather than independent chart fixtures or fake live counters. Full Atlas UI assets remain isolated to its workspace; only the small pure engine is shared.

## Guided Atlas states

Each preset replaces all telemetry filters, the search, and stale order selections. Oct 08 selects Storage in the seven-day snapshot with observed latency and no injected delay. Storage +150 ms selects all services over 30 days and models a fixed added latency. SLO burn selects the 30-day portfolio, failed-request metric and lowest-success sorting. State-based pressed indicators reflect URL restoration and manual filter changes. Reset restores the default workspace and linked order measures. All scenario announcements use a polite live region.

The model multiplies exposure along directed synchronous paths, sums paths (capped at one), and weights portfolio impact by request volume. Asynchronous telemetry does not add latency. Throughput, failure counts, queueing and retry amplification are not modeled. Error-budget consumption is scoped to the selected observed records.

Initialization messages are inserted into empty alert hosts only after a runtime failure. Static HTML contains architecture context and a JavaScript-disabled explanation.

## Event simulation

`PortfolioEngine.processEvent` validates the ingress contract. `eventPreset` creates reproducible input batches and `processBatch` generates immutable receipts. Validation precedes per-run duplicate suppression: an invalid event never reserves an ID. Only the first valid ID is delivered; rejected and repeated deliveries have no downstream output.

The 100-event fixture reconciles 80 delivered, 10 dead-lettered and 10 duplicate deliveries. The UI exposes every receipt, paged ten at a time, with original input, validation, canonical transformation and routing result. Dead letters retain their source and validation reasons. Presets replace the current run and Reset clears it. No broker, server throughput, durable queue or retry scheduling is represented.

## Resume PDF

`scripts/build-resume-pdf.py` renders the existing public Word document into a two-page PDF with embedded fonts, a contact-page hyperlink and no email address. The static build packages both formats. PDF and Word downloads remain noindex/noarchive; the background page remains indexable.

## Verification

Node/JSDOM tests cover contract math, deduplication, all presets, state restoration, navigation, biography boundaries, PDF privacy, links/fragments, semantic accessibility, color tokens and compressed asset budgets. Browser QA checks six viewport sizes (320x720, 390x844, 844x390, 768x1024, 1280x800, 1920x1080), both themes, menu keyboard behavior and scenario interactions. Physical devices, Safari/Firefox, assistive-technology certification and field Core Web Vitals are outside these checks.
