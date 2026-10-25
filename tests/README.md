Run from the repository root with Node.js 20 or newer:

```sh
npm --prefix tests ci --ignore-scripts
npm --prefix tests test
```

Pure tests cover event validation, quarantine behavior, transformations, and dashboard URL allowlists. DOM tests exercise the actual four pages: initialization, native case-study content, mobile navigation and focus restoration, theme persistence, dashboard state and narrow chart geometry, event outcomes, résumé printing, and download links. Release checks verify local assets, font references, route targets, response headers, and exclusion of server files.

JSDOM has no layout engine. Observers and browser printing are stubbed. Verify responsive layout, native disclosure interaction, keyboard behavior, dark mode, and the console in a browser; inspect the deployed routes and Word résumé separately. These checks do not measure rendering performance, Core Web Vitals, or physical-device compatibility. Deploying the retained .NET application requires its own build and HTTP checks.
