# Order intelligence follows the active filters

The order measures previously described one independent twelve-delivery sample. Service and date selections changed telemetry without changing that sample, and selecting a delivery only changed the inspector. The revised workspace makes the scope explicit and recalculates order measures from the actual filtered synthetic deliveries.

## Data and selection rules

- Ninety days of deterministic synthetic order deliveries use the same five service labels and calendar as Atlas. Each service and date has twelve deliveries. Amounts vary deterministically by service and date; they are not inferred from request counts or latency. This attribution is an illustration, not operational sales data.
- Service, reporting-window and date filters apply to order measures, scenario comparisons, stage counts and the delivery ledger. Choosing a day in the chart inspector applies that date immediately. Service selections from the dependency map, heatmap, service table and service dialog flow through the same workspace state.
- Selecting a ledger delivery or contribution bar filters the order measures to that delivery. A clear action restores the full filtered dataset and preserves the service/date/window. Quarantined deliveries and duplicate retries contribute zero recognized value.
- Stage previews describe the data available at that boundary: received deliveries have no validated monetary measure; validation includes valid retries; deduplication, model and publish use accepted unique orders. Model and publish intentionally reconcile to the same result.
- The ledger renders twelve deliveries at a time. Paging changes the visible ledger and contribution bars, while the aggregate scope remains explicit. Metric switches, table ordering, theme and latency sensitivity modeling retain their respective meanings and do not invent changes to order amounts.
- Scenario comparison runs all three scenarios within the active workspace scope. Selecting a scenario opens an excluded delivery for inspection while showing that scenario's full filtered published result.
- Allowlisted `order=selected` and bounded global delivery indices retain selection alongside existing workspace and journey state. The journey restores its state before Atlas renders on browser history events, preventing an older view from overwriting the URL. Reset restores all services, thirty days, healthy delivery and published aggregate measures.

## Validation

All 74 Node/JSDOM checks pass. New checks cover exact service/date/window subsets, integer-cent reconciliation, per-batch deduplication and validation, selected-record totals, stage semantics, URL restoration, filter changes, ledger paging, scenario comparison, reset and plain Resume labels. Existing privacy, API rejection, static packaging, asset budgets, keyboard and semantic accessibility checks pass.

Chromium review covers dashboard and background pages at simulated 320×720, 390×844, 844×390, 768×1024, 1280×800 and 1920×1080 viewports without document-wide overflow. A landscape browser flow changed service, reporting window, selected day and delivery and verified the updated measures; a narrow-phone screenshot confirmed the aggregate total fits. Physical devices, Safari/Firefox and field performance remain unverified.

The public labels now use plain Resume lettering. The downloadable Word document is unchanged. Contact protections and the existing API are preserved.
