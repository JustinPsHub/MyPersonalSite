# Connected by design — November 2026 visual release

This release has been superseded by the [minimal refinement](minimal-design-2026-11.md).

This earlier release used an ivory, ink-blue and lime design system across the homepage, resume, contact, Atlas, Event Lab and privacy pages. The retained .NET/Blazor projects and all backend/authentication code are unchanged.

The homepage adds an editorial introduction, a responsive portfolio index, orbit geometry around the working architecture study, signal artwork, refined project studies and a dark contact panel. The resume adds section navigation, a career timeline and distinct skill/education surfaces. Contact receives a new composition while retaining the protected address-release flow. Both labs share the typography, palette and surface treatment while retaining their engines and controls. Motion is bounded and disabled for reduced-motion preferences; there are no new JavaScript dependencies, remote fonts or image requests.

## Validation

- `npm --prefix api ci --ignore-scripts` and `npm --prefix tests ci --ignore-scripts`.
- `npm --prefix tests test`: 98 passed, 0 failed, including contact security, owner authentication, consent, simulations, semantic accessibility and packaging.
- `node scripts/build-static.mjs`: 47 files, approximately 619 KB uncompressed including fonts and resume downloads. The explicit asset allowlist includes `design.css`.
- Chromium review of all six public pages in same-origin frames sized 390×844, 844×390, 768×1024 and 1440×900. No document-level horizontal overflow. Atlas retains its intentionally scrollable data matrix. Contact's decorative orbit is clipped within its section.
- Browser interaction checks: mobile navigation expands; dark theme applies; Event Lab burst reconciles 100 received, 80 delivered, 10 rejected and 10 duplicates.
- Shared foreground/background token combinations exceed 4.5:1 contrast. SVG chart artwork is decorative; working lab data remains unchanged.
- Local static preview does not emulate the Azure API; its contact fallback was reviewed and API behavior is covered by the tests. No email was sent.
- The .NET SDK is unavailable in this execution environment; no .NET source changed. Physical devices, other browser engines and field performance remain unverified.

## Release

Production remains Azure Static Web Apps with the existing Node 22 API. No GitHub Actions workflow exists in the repository. Deploy the static build and `api/` together using the existing authenticated SWA CLI command documented in `contact-security.md`. Do not publish the local responsive review harness.

A successful source commit does not establish production deployment. Verify the live HTML includes `/portfolio/design.css?v=20261112` and that the deployed stylesheet matches the built source before claiming release success.
