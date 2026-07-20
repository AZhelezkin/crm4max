# Host extraction test handoff

## Scope

This document maps legacy MAX behavior at `master@54bfb43` to capabilities that a later `MiniAppHost` change must preserve. It is not a production interface and does not authorize creating `MaxHost` or `TelegramHost` during the test-baseline change.

## Compatibility map

| Future capability | Current source/effect | Characterization evidence required first |
|---|---|---|
| Read launch parameter | `window.WebApp.initDataUnsafe.start_param`, then URL `startapp`, then `masterId` | launch priority/grammar matrix in `App.launch.test.tsx` |
| Read signed launch data | `window.WebApp.initData` | master/client auth store and App auto-detect tests |
| Signal ready | `window.WebApp.ready()` | auth/store/standalone ready timing tests |
| Close surface | optional `window.WebApp.close()` casts in destination selector | destination page/hook delayed-close tests |
| Open ordinary URL | `openLink`, then `window.open` in supported paths | calendar/payment/contact/platform fallback tests |
| Open messenger URL | `openMaxLink`, then `openLink`, then `window.open` | both bottom-navigation support suites |
| Share content | `shareContent` or browser `navigator.share`/clipboard depending on screen | profile/service/share-page tests |
| Download file | `downloadFile(url, filename)` | payment export gesture/outcome tests and photo download tests |
| Scan code | `openCodeReader(true)` | QR result grammar, busy and rejection tests |
| Add calendar event | iOS `.ics` or Google Calendar URL | calendar unit suite and browser fallback smoke |
| Browser clipboard | `navigator.clipboard.writeText` | share-page copy/fallback tests |
| Browser share | `navigator.share` | share success/cancel/unavailable tests |
| Host theme/bootstrap | MAX SDK script plus `@maxhub/max-ui` at entrypoint | index/bootstrap architecture check and browser smoke |
| Persist local state | role token keys and session booking draft | auth/interceptor/store tests; this must later become identity-scoped |
| Resolve support destination | `/support/start` returns `botUrl` | exact HTTP contract plus open priority tests |
| Destination handoff | `m-dest-` token, GET context, POST address, delayed close | parser/API/hook/page tests |

## Invariants for the later extraction

- Exact accepted launch formats and their priority do not change without a separate behavior spec.
- Provider data is input, not write authority.
- Master and client credentials remain isolated; future channel identity must not collapse conversations.
- Exact HTTP method/path/query/body remains stable until backend contract migration is coordinated.
- User-visible routes, copy, storage compatibility and write timing remain stable.
- No booking/client/service/schedule mutation occurs before the existing explicit user action.
- Destination submit attaches bounded draft data only; final writes stay outside the Mini App handoff.
- Unsupported host capabilities use an explicit browser fallback or an explicit unavailable outcome; they are not silently aliased to another provider global.
- Telegram must receive its own bootstrap/host implementation. `window.WebApp = Telegram.WebApp` is forbidden.

## Test reuse rule

The later host abstraction must run a reusable capability contract against `MaxHost`, `TelegramHost` and `BrowserHost`, but only after the legacy characterization suite is green. During extraction:

1. keep legacy page-level assertions unchanged;
2. move one effect at a time behind the host boundary;
3. add the host contract assertion for that effect;
4. shrink the direct `window.WebApp` architecture allowlist;
5. do not delete legacy characterization until equivalent host + journey coverage is green.

## Deliberately backend-owned

Host tests do not own signature verification, principal linking, token/JWT authority, handoff replay/TTL, CRM validation or provider delivery. Those remain in the `max-bot` handoff matrix.
