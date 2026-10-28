# Portfolio frontend

The public portfolio uses four static HTML pages, one shared stylesheet, and small native JavaScript modules. The retained ASP.NET Core/Blazor application is separate from the Azure static release.

## Content hierarchy

The homepage is a professional introduction, with a short statement of positioning and three capability rows: software engineering, data architecture, and technical leadership. It omits employer names, internal systems, project case studies, implementation disclosures, and project-specific dimensions or event counts.

The Background page preserves accurate employer names, role titles, dates, education, certifications, and one defensible reporting-audience metric. Each role has one broad description. The original Word résumé keeps the detailed accomplishments and complete career record; printing the web page produces the shorter background.

Primary navigation is Profile, Background, and Contact. Engineering examples remain available through the footer and their existing URLs. Dashboard filtering, sharing, sorting, and export are preserved. The secondary event example remains functional but no longer includes an architecture presented as an employer platform.

The typography and restrained palette are retained, with a simpler two-column expertise layout, fewer section boundaries, and a direct résumé download. Content is present before scripts load. No entrance effects, animation loops, or new dependencies are added.

## Behavior

- The mobile menu supports Escape, outside interaction, link selection, and breakpoint changes. Links stay visible without JavaScript.
- Theme preference is stored defensively. SVG chart colors refresh without discarding filters.
- The dashboard uses one deterministic dataset. Share links allowlist filter values; exports use the selected records. Responsive SVG geometry maintains readable labels.
- The event example validates before transforming or delivering. Invalid amounts are quarantined; downstream stages are skipped. Artificial processing delays have been removed.
- Contact links use `mailto:`. Browser print and original Word download remain available. A print-only contact line preserves identity when site navigation is omitted.

## Responsive design and performance

One stylesheet defines shared spacing, typography, colors, controls, native disclosures, and data layouts. Phone reading text is 16–17px, with 44px or larger primary controls. Narrow service tables become labeled cards. Landscape uses a normal scrolling header and a shorter hero. Safe-area padding supports notched screens. Hover transitions respect reduced motion; there is no continuous animation.

The release script includes only explicit public assets and the résumé download. It preserves all four route targets and security headers. No deployment identifiers, credentials, private host files, database files, or server output belong in the static release.

Automated checks cover contracts, safe URL state, navigation/focus, printable identity, theme and dashboard consistency, narrow chart geometry, capability content without scripts, local links, route targets, and compressed asset budgets. Browser viewport review is separate from JSDOM. No physical-device certification, accessibility certification, conversion result, or Core Web Vitals measurement is claimed.
