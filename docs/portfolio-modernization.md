# Modern portfolio frontend

The existing .NET host serves four static portfolio pages from `MyPersonalSite/wwwroot/portfolio`. No frontend build, runtime dependency, CDN request, or external data service is required.

## Visitor experience

- A Canvas sculpture morphs between network, flow, and insight shapes. Its frame loop stops when paused, hidden, or off-screen. Rendering caps device pixel ratio at 1.75, targets about 30 frames per second, and reduces geometry on coarse pointers. The operating system's reduced-motion preference takes precedence.
- A local event pipeline demonstrates a typed contract, boundary validation, normalization, and delivery. The invalid-amount scenario quarantines the payload and skips downstream stages. Output is synthetic and inspectable.
- The native search dialog supports Ctrl/Cmd+K, search, arrow keys, Tab, and Enter. Page links remain available in the main navigation.
- Dashboard filters, sorting, and selected chart metric are encoded in an allowlisted URL state. Visitors can copy the filtered view and export the underlying CSV.
- Saved theme preferences apply before the stylesheet paints. Fonts are self-hosted. The content and main navigation remain available without JavaScript.

## Validation

Run `npm --prefix tests ci --ignore-scripts` and `npm --prefix tests test`. See `tests/README.md` for the distinction between DOM contract tests and real-browser verification.

Publish using the established Azure host:

```sh
dotnet publish MyPersonalSite/MyPersonalSite.csproj -c Release -o ./publish --nologo -p:CompressionEnabled=false
```

Smoke-test `/`, `/resume`, `/visuals`, `/platform`, `/healthz`, and the five frontend CSS/JS assets. Package the **contents** of the publish directory as a ZIP, then deploy to the existing `justinraypalmer` App Service in `DefaultResourceGroup-EUS`. Keep the existing startup command, database, security policies, and API configuration.

The development checks do not assert a Lighthouse score, Core Web Vitals result, or a browser frame-rate guarantee. Those require measurements of the deployed build.
