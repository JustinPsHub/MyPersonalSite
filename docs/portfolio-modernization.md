# Modern portfolio frontend

Four static portfolio pages live in `MyPersonalSite/wwwroot/portfolio`. The original .NET host can serve them, and `node scripts/build-static.mjs` packages the same pages for Azure Static Web Apps Free. No frontend compilation, runtime dependency, CDN request, or external data service is required.

## Visitor experience

- A Canvas sculpture morphs between network, flow, and insight shapes. Its frame loop stops when paused, hidden, or off-screen. Rendering caps device pixel ratio at 1.75, targets about 30 frames per second, and reduces geometry on coarse pointers. The operating system's reduced-motion preference takes precedence.
- A local event pipeline demonstrates a typed contract, boundary validation, normalization, and delivery. The invalid-amount scenario quarantines the payload and skips downstream stages. Output is synthetic and inspectable.
- The native search dialog supports Ctrl/Cmd+K, search, arrow keys, Tab, and Enter. Page links remain available in the main navigation.
- Dashboard filters, sorting, and selected chart metric are encoded in an allowlisted URL state. Visitors can copy the filtered view and export the underlying CSV.
- Saved theme preferences apply before the stylesheet paints. Fonts are self-hosted. The content and main navigation remain available without JavaScript.

## Validation

Run `npm --prefix tests ci --ignore-scripts` and `npm --prefix tests test`. See `tests/README.md` for the distinction between DOM contract tests and real-browser verification.

Package the public site:

```sh
node scripts/build-static.mjs
```

Deploy `artifacts/static-site` with its `staticwebapp.config.json`. The package includes the public pages, their scripts/styles/fonts, the existing Word résumé, robots.txt, and sitemap.xml. It excludes the .NET host, SQLite database, APIs, and host configuration. Exact route rewrites preserve the extensionless pages and `.html` aliases; missing assets remain 404s. Global response headers carry the frontend's Content Security Policy and related protections to the static host.

Smoke-test `/`, `/resume`, `/visuals`, `/platform`, the frontend assets, the Word download, and the interactive controls. The original `/healthz` and `/api/health` endpoints belong to the retained .NET host and are not part of the static release.

The development checks do not assert a Lighthouse score, Core Web Vitals result, or a browser frame-rate guarantee. Those require measurements of the deployed build.
