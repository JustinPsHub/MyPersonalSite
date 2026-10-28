Run from the repository root with Node.js 20 or newer:

```sh
npm --prefix tests ci --ignore-scripts
npm --prefix tests test
```

Pure tests cover event validation, quarantine behavior, transformations, and dashboard URL allowlists. DOM tests exercise the actual four pages: initialization, capability content and employer-project exclusions, mobile navigation and focus restoration, theme persistence, dashboard state and narrow chart geometry, event outcomes, résumé printing, and download links. Release checks verify local assets, font references, route targets, response headers, and exclusion of server files.

JSDOM has no layout engine. Observers and browser printing are stubbed. Verify responsive layout, native disclosure interaction, keyboard behavior, dark mode, and the console in a browser; inspect the deployed routes and Word résumé separately. These checks do not measure rendering performance, Core Web Vitals, or physical-device compatibility. Deploying the retained .NET application requires its own build and HTTP checks.

## Atlas

The dashboard adds pure engine checks for complete period comparisons, weighted metrics, immutable synthetic records, safe state parsing, and dependency propagation; UI checks cover coordinated service/day selections, model isolation, search, native-dialog logic, URL restoration, filtered CSVs, reduced motion, and keyboard focus. Axe-core checks WCAG A/AA semantics for the workspace and service inspector under JSDOM, with color contrast disabled. Separate palette tests check foreground contrast in both themes. Browser layout, native dialog focus, and responsive review remain separate. See [Atlas verification](../docs/atlas-dashboard.md).
