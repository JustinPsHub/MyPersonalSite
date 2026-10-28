# Contact privacy

The portfolio intentionally publishes professional experience. It does not publish its recipient email address in initial HTML, frontend JavaScript, metadata, or its downloadable résumé. The résumé instead links to the contact page; its accomplishments remain intact.

Contact uses the visitor’s own email app. The site does not accept or forward messages, store submissions, or send automatic emails. A successful deliberate contact action releases the address to that visitor. A determined interactive scraper can still obtain it; this reduces passive harvesting and is not a guarantee of secrecy.

## Server behavior

The existing Azure Static Web Apps Free site hosts one managed Node 22 API, `/api/contact`:

- GET returns a short-lived signed token and an HttpOnly, Secure, SameSite=Strict session cookie. Initial HTML and JSON contain no recipient address.
- POST validates the allowed Origin, Fetch Metadata, body type and size, signed session binding, token signature, expiry, minimum elapsed time, and an empty honeypot. It accepts no visitor-selected recipient or message payload.
- Successful actions return a mailto target and a copyable address. Native HTML forms provide an equivalent path without JavaScript.
- API responses use `no-store`, `noindex`, and a restrictive Content Security Policy. There is no cross-origin access allowance.
- Bounded, expiring counters limit requests by session, best-effort platform client identity, and worker-wide volume. Raw client addresses are not stored or logged by application code. Replay tracking and limits are **per worker**, reset on restarts, and are not a distributed anti-DDoS guarantee. No browser identity or rate counter is treated as authentication.

`CONTACT_EMAIL` and a random `CONTACT_SESSION_SECRET` of at least 32 characters are configured only in encrypted Azure application settings. Optional `CONTACT_ALLOWED_ORIGINS` is a comma-separated list of additional exact HTTPS origins for staging. Never add secrets to public assets, Git, command-line arguments, or local settings committed to source.

## Deploy and verify

Run `npm --prefix api ci --ignore-scripts`, the existing tests, and `node scripts/build-static.mjs`. Deploy both parts together using the existing authenticated SWA CLI workflow:

```
swa deploy artifacts/static-site --api-location api --api-language node --api-version 22 --env production --no-use-keychain
```

Use a staging environment before production. Check GET nondisclosure, one intentional contact action, rejection paths locally, résumé access, mobile layout, and response headers. No automated tests should send email or flood the live endpoint. The static build has an address-leak guard; security tests inspect the résumé’s XML and relationships.

Professional pages remain indexable. Only the contact interaction and downloadable document have `noindex` response directives; robots.txt permits crawlers to fetch those directives. This does not force existing search caches to refresh. Old Git commits, third-party caches, previous downloads, and existing contact databases may retain the former address. The audit did not establish the source of any particular recruiting message.
