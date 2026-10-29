# Systems Studio

The homepage makes the engineering lab a first-class destination: a concise introduction, résumé and contact actions, an interactive architecture study, and two visual entry points into Atlas. Capability descriptions remain short and transferable. No employer-specific project narratives or unverified accomplishments were added.

## Behavior

- Software, Data, and Delivery controls change the highlighted paths, accessible caption, tool references, and relevant lab destination. Diagram nodes activate the same state. Controls preserve keyboard focus and selected state.
- The pointer light responds to fine-pointer events, queues at most one animation frame, and cancels pending work on pointer leave, page hiding, or reduced-motion changes. There is no continuous rendering loop, autoplay, new package, or external runtime asset.
- Visual previews are illustrative and explicitly labeled synthetic. They link to the functional analytics workspace and Data journey rather than running a second dashboard on the homepage.
- Data journey adds an initially collapsed scenario comparison. All three outcomes run through `JourneyEngine.run`, the same validator, deduplication, and integer-cent aggregation used by the inspector. Buttons select the scenario, first excluded event, and relevant processing stage; update allowlisted URL state; and focus the inspector heading. Service telemetry remains independent.
- The existing contact API, recipient configuration, privacy boundaries, CSP, résumé document, and authentication behavior are unchanged. The package includes the existing API together with the static site when deploying to Azure.

## Verification

67 Node/JSDOM checks pass after the change, including existing analytical, provenance, contact-security, résumé-privacy, and packaging checks. New checks cover Studio focus/selected state/deep links, reduced motion, scenario comparison reconciliation and inspector state, homepage axe-core semantics, and isolated asset budgets. Semantic axe-core checks disable color contrast because JSDOM has no rendering engine; they are not accessibility certification.

Chromium layout review uses same-origin iframe viewports at 320×720, 390×844, 844×390, 768×1024, 1280×800, and 1920×1080. All five public pages were measured. The tablet header overflow introduced by the fourth navigation link was identified and fixed. Mobile menu opening/closing, architecture selection, native disclosure, scenario inspection, focus movement, and dark theme were exercised in the browser. These are viewport simulations, not physical-device or native touch testing.

The new homepage scripts and stylesheet have separate compressed budgets. No dashboard engine loads on the homepage. The complete static release is under 440 KB, including self-hosted fonts and the existing Word résumé. Asset size is not a claim about measured load time or Core Web Vitals.

Physical-device, Safari/Firefox, screen-reader, Lighthouse, and field performance results remain unverified. Actual production publication must be confirmed independently; local build and browser tests do not establish deployment.
