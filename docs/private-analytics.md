# Palmer Observatory

Open `/admin/telemetry` and sign in as the GitHub owner. The existing Azure platform session establishes the account, and a verified passkey unlocks a separate 30-minute dashboard session. On first use, the authorized owner registers one passkey. Use a device or synced password manager you can recover. The service pins the Azure identity and rejects a replacement enrollment. Loss of the credential requires a controlled reset by the service administrator.

The page and APIs require the exact GitHub account, Azure platform authentication, and the bound passkey session. Credential challenges expire in five minutes and are tied to the owner and origin. Passkey assertions require user verification, and accepted challenges cannot be replayed. Data and settings never ship with the public site. The app uses Secure, HttpOnly, SameSite cookies, same-origin write checks, no-store responses, and bounded request processing. The owner’s browser is excluded from public analytics after opening the administration page.

## Measurements

- Opted-in page views, per-tab sessions, approximate browser counts, first-observed and repeat browser activity, navigation, foreground engagement, résumé clicks, lab interactions and redacted browser errors. Browser identifiers rotate after 30 days. Historical identifiers rotated daily. IDs and sessions approximate browser activity. They do not identify a person or organization.
- Approximate edge country, region and city when supplied, coarse device/browser/OS, referrer domains, campaign labels, and supported Web Vitals. Geography can reflect VPN and proxy exits. Referrer suppression can make a visit appear direct. Web Vitals coverage varies by browser.
- Contact rejection, honeypots, early challenge use, rate limits, address reveals, selected probe routes and application-level authorization outcomes. Security records may include a keyed, day-rotated network label, coarse automation hints, status and processing time. No raw addresses, user agents, tokens, message bodies, or unrestricted URLs are retained. Security samples cannot estimate the full bot share of Azure edge traffic.
- The contact flow opens the visitor’s mail app after a guarded address reveal. No mail is sent by the website. The Security tab can compare a manually entered email time against the prior hour of observed activity. The comparison stays in the browser and timing does not establish attribution. Azure edge logs, provider sign-in failures, mailbox data, continuous uptime and legacy .NET server health are outside the collection path.

## Retention and deployment

Azure Static Web Apps Free continues to serve the portfolio and existing API. Palmer Observatory reuses the existing Cloudflare Worker and D1 database. The bridge uses signed, expiring requests. Its machine diagnostics scope can write only bounded events. The Worker’s standalone dashboard is disabled in production so data access goes through the portfolio passkey flow.

Detailed usage is queryable for 30 days, aggregated usage for 365 days, security details for seven days and daily audit counters for 90 days. Traffic-triggered cleanup may physically delete expired rows later. Application caps include 3,000 browser events, 6,000 validated batches and 1,200 security observations per UTC day. Dashboard results disclose truncation. The release adds no new paid resources or subscription. Hosting-provider billing beyond the known Azure Free plan is outside the application.

Run `npm --prefix tests ci`, `npm --prefix api ci`, `npm --prefix tests test`, and `node scripts/build-static.mjs`. Deploy the static and API artifacts together. Deploy the Observatory Worker migration before activating the corresponding Azure API.
