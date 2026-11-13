# Minimal portfolio refinement

The public pages now use a restrained graphite and white visual system, generous spacing and consistent navigation. The approved homepage headline is unchanged. A brief technical introduction, three areas of expertise and two project links replace the architecture ornament, live preview counters and repeated section indexes. The dedicated Atlas and Event Lab workflows remain available.

The resume uses aligned experience entries and plain skill rows; business context sits with education. Contact focuses on its protected email action. Both labs disclose optional explanatory material with native details elements. Privacy uses the shared navigation and a readable article width. Light/dark preferences, reduced motion, downloads, analytics consent and owner access are retained. No backend or .NET code changed.

## Validation

- 95 automated tests passed, including contact protections, owner authorization, consent, simulation behavior, semantic accessibility and static packaging. Tests for the retired homepage simulation controls were replaced by a static-homepage regression check; lab-engine tests remain.
- Static build: 47 files, 603,888 bytes, including fonts and downloads. The home, resume, contact and privacy pages no longer load the simulation engine. The homepage also removes three study scripts and the studio stylesheet.
- Chromium layout checks at 390×844, 844×390, 768×1024 and 1440×900 across all six public pages; no document-level horizontal overflow. Internal analytical tables retain their purposeful scrolling.
- Mobile menu opens and closes with Escape; theme switching works; Event Lab burst yields 100 received, 80 delivered, 10 dead-lettered and 10 duplicate events.
- The local preview does not host the contact API. Its unavailable state is readable; production contact readiness requires a live check. No email was sent.
- The .NET SDK is unavailable in this workspace; the retained .NET projects were not changed or rebuilt. Physical devices, Safari and field performance were not tested.

## Deployment

Source validation is complete. Production uses the existing Azure Static Web Apps CLI workflow, publishing the static build and unchanged Node 22 API together. A live release must be verified by checking both domains, the six routes, the versioned stylesheet against the built file, contact preparation and anonymous owner-route protection. The temporary layout harness must not be included in the release.
