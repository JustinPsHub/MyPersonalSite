# Portfolio frontend

The public portfolio uses four static HTML pages, one shared stylesheet, and small native JavaScript modules. The retained ASP.NET Core/Blazor application is separate from the Azure static release.

## Content hierarchy

The homepage has one introduction, three enterprise projects, and a brief business-perspective note. It removes the overlapping strength strip, capability explorer, career timeline, dashboard teaser, source promotion, and oversized contact section. Each project shows a short contribution, technical context, and scoped outcome; native details retain the fuller case study without script-generated dialogs.

Experience, education, and certifications live on the résumé page. The lab keeps working dashboard filters, URL state, sorting, sharing, and exports. Engineering notes retain the `/platform` route and host the event-contract example formerly on the homepage. This secondary page is linked from the lab instead of adding a fourth primary navigation destination.

The sculpture, shape controls, decorative animation loops, reading-progress effect, entrance reveals, command search, duplicate capability content, and interactive architecture tabs were removed. No new features or dependencies replace them. The frontend never hides main content while waiting for a reveal animation.

## Behavior

- The mobile menu supports Escape, outside interaction, link selection, and breakpoint changes. Links stay visible without JavaScript.
- Theme preference is stored defensively. SVG chart colors refresh without discarding filters.
- The dashboard uses one deterministic dataset. Share links allowlist filter values; exports use the selected records. Responsive SVG geometry maintains readable labels.
- The event example validates before transforming or delivering. Invalid amounts are quarantined; downstream stages are skipped. Artificial processing delays have been removed.
- Contact links use `mailto:`. Browser print and original Word download remain available. A print-only contact line preserves identity when site navigation is omitted.

## Responsive design and performance

One stylesheet defines shared spacing, typography, colors, controls, native disclosures, and data layouts. Phone reading text is 16–17px, with 44px or larger primary controls. Narrow service tables become labeled cards. Landscape uses a normal scrolling header and a shorter hero. Safe-area padding supports notched screens. Hover transitions respect reduced motion; there is no continuous animation.

The release script includes only explicit public assets and the résumé download. It preserves all four route targets and security headers. No deployment identifiers, credentials, private host files, database files, or server output belong in the static release.

Automated checks cover contracts, safe URL state, navigation/focus, printable identity, theme and dashboard consistency, narrow chart geometry, case details without scripts, local links, route targets, and compressed asset budgets. Browser viewport review is separate from JSDOM. No physical-device certification, accessibility certification, conversion result, or Core Web Vitals measurement is claimed.
