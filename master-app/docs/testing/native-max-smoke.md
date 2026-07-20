# Native MAX smoke matrix

## Status

- Baseline recorded: 2026-07-19
- Owner: MAX Mini App release owner
- Execution status: **release-blocked**
- Blocker: agreed native MAX test personas, devices and signed test build were not supplied for this change
- Rule: jsdom and Chromium capability doubles do not satisfy this matrix

## Evidence header

Every execution must record:

| Field | Required value |
|---|---|
| Date/time | ISO timestamp |
| Tester/owner | Name or team |
| Build | Commit SHA and deployed URL |
| MAX app | Version/build |
| Persona | Synthetic master/client identity and backend environment |
| Device | Manufacturer/model |
| OS | Name/version |
| Theme | Light/dark/system |
| Network | Wi-Fi/mobile/offline transition if exercised |
| Evidence | Screenshot/video/log links with no secrets or production PII |
| Result | Pass/fail/blocked plus issue link |

## Required personas

1. Onboarded master with active subscription, one client, one service and one upcoming booking.
2. New master eligible for trial/payment return.
3. Client with a linked master, one completed booking eligible for review and one upcoming booking.
4. Scoped destination-selector handoff token owned by the master persona.

Credentials, init data, JWTs and handoff tokens must never be pasted into committed evidence.

## Device matrix

At minimum execute on:

- one current Android device supported by MAX;
- one current iPhone/iOS device supported by MAX;
- light and dark/system theme where MAX exposes both;
- compact viewport with software keyboard open.

## Checks

| Area | Steps | Expected native evidence |
|---|---|---|
| Launch and identity | Open `mmode`, master UUID, `cmasters`, composite booking and `m-dest-` links | Correct shell/route; no cross-role token or draft leakage |
| Ready | Cold-open each persona | Loading ends and MAX `ready` timing does not leave a blank shell |
| Back/close | Use toolbar back, hardware/system back and destination close | Exact route history; standalone selector closes only through MAX capability |
| QR | Open client without master, scan valid/invalid/cancel | Camera opens once; valid identity persists; invalid/cancel stays recoverable |
| Share | Share master contact and service/master photo | Native sheet receives exact text/URL once; cancel has no false success |
| Download | Download work photo, payment export and QR | Correct filename/content and visible native outcome |
| Calendar | Add booking on Android and iOS | Correct event title/date/time/duration/location; iOS `.ics` opens successfully |
| Payment return | Start trial/month/year payment, return by focus/visibility | Pending markers reconcile to authoritative success/failure once |
| Destination handoff | Load, save address, duplicate submit, stale/used token | Single save, saved state, delayed close; no final CRM mutation from Mini App |
| Safe area/theme | Inspect headers, bottom actions, portals and toasts | No clipping under system bars; readable supported theme |
| Keyboard/scroll | Edit address/about/client fields on compact screen | Focused input and primary action remain reachable; no trapped scroll |
| Offline/error | Interrupt one read and one safe retry path | No false success or uncontrolled external request |

## Exit rule

Host extraction or a release that relies on these native capabilities remains blocked until every required row has versioned evidence or an approved issue with owner, severity and release decision. Telegram native smoke begins only in a separate `TelegramHost` change; assigning `window.WebApp = Telegram.WebApp` is not an acceptable test or implementation strategy.
