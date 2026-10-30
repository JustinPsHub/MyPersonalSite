# Private analytics integration

The portfolio stays on Azure Static Web Apps Free, with its existing Node 22 contact API and anti-scraping protections. No DNS migration, GoDaddy API change, paid plan, Application Insights or Log Analytics resource is required.

The isolated service, Palmer Observatory, is maintained through the connected Sites source repository and D1 migrations. Origin: `https://palmer-observatory.happy-mink-8142.chatgpt.site`. `/admin` on the portfolio is a noindex convenience redirect. It excludes this browser before redirecting and contains no private data. The service requires the owner's ChatGPT identity, exact email allowlist, pinned Site-scoped user ID and a signed 30-minute session for every data query.

## Collection and privacy

Shared `telemetry.js` starts only after opt-in. Do Not Track, Global Privacy Control, local/test hosts and automated browsers disable it. `/privacy` discloses fields, providers, retention and controls. Declining analytics does not affect any portfolio feature. Browser IDs rotate after 24 hours, and per-tab sessions expire after 30 minutes of inactivity.

Events cover page opens, lab opens, deliberately named interactions, simulation start/completion from actual run code, résumé interest/file clicks, contact interest/actions, visible active time, supported performance entries and redacted first-party error categories. Payloads include allowed paths, limited campaign labels, entry referrer origin, coarse dimensions and random IDs. Contact tokens, addresses, form contents, exception messages, stacks and sensitive query strings never enter telemetry.

The tracker is approximately 4 KB gzip, batches, limits its queue/session volume, supports navigation-safe delivery and absorbs collector failure. No replay or advertising SDK is loaded. Only the collector origin is added to connect-src; existing script restrictions remain.

## Interpretation and capacity

Visitor-days count distinct random IDs per UTC day, not people. New/returning people are unavailable. Active counts mean recently observed sessions. Acquisition is partial when referrers are stripped; email needs utm_medium=email. Geography is approximate trusted edge metadata when available. The map plots country centroids, not precise visitor positions. LCP/CLS use browser observers; largest observed interaction latency approximates INP and is labeled accordingly. These are not comprehensive Azure server, WAF, contact or uptime logs.

Résumé clicks do not confirm downloads; contact actions do not confirm sent email. The funnel requires ordered actions within a session. Details are retained for 30 days, aggregates 365 days and audit counters 90 days. Traffic-triggered cleanup may physically delete later during inactivity; expired details are excluded from queries immediately.

Application caps: 3,000 stored events and 6,000 admitted batches per UTC day, 12 events / 12 KiB per batch, 60 batches per source per 10 minutes, 120 events per browser session. An atomic SQL trigger enforces the event cap. Detailed queries stop at 12,000 events and disclose truncation. Audit counts cap at 500 per signal/day.

Managed hosting billing and account-wide quotas are not exposed by this connection. No paid or metered Azure telemetry resource was enabled. Published Cloudflare Free allowances are reference limits, not a verified managed-account plan; the dashboard states this. A paid Cloudflare account can bill overages and must not be substituted under the $0 requirement.

## Release

Run `npm --prefix tests test` and `node scripts/build-static.mjs`; publish static output and `api` together through the existing Azure SWA CLI workflow. Build on the newer deployed architecture-labs revision, not an older main-branch snapshot.

After activation, verify both domains, privacy/administration routes, non-consent and opt-in, a real lab journey and owner login. Verify denial with another identity and forged-header stripping at the platform boundary before claiming complete end-to-end authorization verification. Never seed fake production traffic.

Authoring status: Azure CLI access encountered a network approval cancellation, and the Azure browser is at sign-in. Passing source tests does not prove the public instrumentation is deployed. Refer to the deployment handoff for actual completion state.
