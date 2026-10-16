Run from the repository root with Node.js 20 or newer:

```sh
npm --prefix tests ci --ignore-scripts
npm --prefix tests test
```

The pure tests cover event contracts, rejection paths, URL allowlists, and finite Canvas geometry. The DOM integration tests load the actual four HTML pages and their scripts, then exercise search and keyboard actions, successful and rejected event flows, linked dashboard filters, and animation cancellation.

JSDOM has no layout engine. Canvas, observers, and native dialog opening are stubbed; these tests do not establish visual layout, native focus containment, frame rate, or browser rendering performance. Before release, check desktop and mobile layouts, keyboard focus and Escape behavior, reduced motion, and the console in a real browser. Run a Release publish and HTTP smoke checks against the .NET host before Azure deployment.
