# Browser validation decisions

## Visual snapshots

Stable visual snapshots are not enabled in the baseline change.

The four candidate shells—master home, client profile, booking confirmation and destination selector—depend on MaxUI/provider CSS, bundled/runtime fonts, viewport safe-area behavior and browser text rasterization. Freezing screenshots before a host boundary would create high-maintenance pixel baselines around the legacy MAX shell while adding little protection beyond the route, semantic, accessibility and native matrices.

Decision: keep deterministic mobile Chromium semantic assertions, failure-only screenshots and axe checks. Reconsider visual snapshots after `MiniAppHost` exists and fonts/theme/safe-area inputs can be fixed explicitly. This is a documented rejection, not a substitution of pixel checks with lower-value snapshots.

## WebKit

WebKit is not a blocking project in this baseline:

- the local Playwright cache contains Chromium but no validated WebKit runtime;
- iOS calendar behavior hands off a generated `.ics` URL and native opening cannot be proven by desktop WebKit;
- canvas crop/download fidelity still requires a real iOS MAX WebView check.

Decision: Chromium remains the blocking browser job. WebKit calendar/canvas smoke is a nightly candidate after a CI WebKit runtime is installed and measured for five consecutive green runs. Real iOS behavior remains release-blocked by `native-max-smoke.md`; it is not declared covered by unit URL assertions.

## Accessibility policy

Representative master home, client profile, booking confirmation and destination selector states run axe in mobile Chromium and assert keyboard focus on their critical actions. Serious or critical findings must either:

1. be fixed in a separately approved behavior/accessibility change; or
2. be added to an exact, reviewed debt baseline with rule, target/count, owner and date.

The browser suite compares against that reviewed baseline, so a new rule or additional affected target blocks the job. Lower-impact findings remain visible in the Playwright report but do not silently upgrade the completion status. Native screen-reader behavior remains part of the native matrix.
