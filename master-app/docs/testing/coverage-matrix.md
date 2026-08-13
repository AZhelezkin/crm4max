# Mini App test coverage matrix

## Baseline

- Source: `master@54bfb43`
- Implementation branch: `tests/baseline`
- Production TypeScript/TSX files: 113
- Existing test files: 3
- Existing tests: 16
- Existing suites: `Button.test.tsx`, `Card.test.tsx`, `Input.test.tsx`
- Baseline `npm ci`: passed
- Baseline `npm run test`: passed, 3 files / 16 tests
- Baseline `npm run build`: passed
- Original local baseline runtime: Node `v26.4.0`, npm `12.0.1`
- Required/final validation runtime: Node `v20.20.2`, npm `10.8.2` (`node:20-bookworm`)
- Baseline warnings: the original install reported 13 npm audit findings; the final clean install reports 14 (1 low, 7 moderate, 4 high, 2 critical). The Vite bundle also reports a chunk larger than 500 kB. Neither concern is silently treated as fixed by this behavior-characterization change.

`openspec/` remains ignored by repository policy. The local change is kept in the `tests/baseline` worktree; tracked test implementation belongs to `tests/baseline`.

## Final implementation gate

- Clean `npm ci`: passed on Node `v20.20.2` / npm `10.8.2`
- `npm run typecheck`: passed on Node 20
- `npm run test`: passed, 75 files / 438 tests, with no skipped/todo declarations
- Shuffled Vitest runs: passed with seeds `1701` and `2903`; route/timer races were corrected without increasing timeouts
- `npm run test:coverage`: passed, 75 files / 438 tests
- Final Node 20 coverage: 83.19% statements, 82.63% branches, 75.63% functions, 83.19% lines
- Coverage outputs: `coverage/coverage-summary.json` and `coverage/lcov.info` generated; global `81/82/74/81` and risk-owned per-file ratchets passed
- `VITE_BASE_PATH=/crm4max/ VITE_API_URL= npm run build`: passed without live API access
- `npm run test:e2e`: passed, 20/20 MAX-like mobile Chromium scenarios on Node 20; same-origin assets are constrained to `/crm4max/` and HTTP routing fails closed outside reviewed app/API paths
- Accessibility: four representative axe states have no serious/critical violations; critical actions accept keyboard focus
- CI: `.github/workflows/quality.yml` runs only by manual dispatch from GitHub user `sld0Ant` for an explicitly selected open PR; typecheck, coverage, build and Chromium results are diagnostic/non-blocking. Pages deploy runs independently on `master` and does not depend on test outcomes.
- Native MAX: release-blocked as of 2026-07-19, owner `MAX Mini App release owner`; automated browser doubles are not substituted for device evidence
- Independent read-only review: `PASS` after strengthening Pages-base asset validation and the AST/provider legacy-JavaScript fence; no Critical/Important findings remain
- `openspec validate establish-miniapp-platform-extraction-test-baseline --strict`: passed
- `git diff --check`, workflow YAML parse, runtime-dependency comparison and production-source boundary checks: passed
- OpenSpec implementation progress: 129 / 129 tasks

## Priority definitions

- **P0** — launch, auth, identity, persisted state, API/write contract, booking/payment/handoff or provider effect. Must have direct automated coverage before host extraction.
- **P1** — reachable navigation, important read state or interactive component. Must have focused automated coverage unless explicitly browser/native-only.
- **P2** — presentation-only, type/style, skeleton or debug surface. Covered through consumers, build/typecheck or a small smoke; line coverage is not the objective.
- **Unreachable** — production source with no route/import owner at this baseline. It is recorded as debt and is not padded with artificial tests.
- **Infrastructure** — test-only source under `src/`; excluded from production risk totals.

## P0/P1 risk matrix

| Risk | Priority | Production owner | Required level | Planned suite | Status |
|---|---:|---|---|---|---|
| Launch source priority and accepted start parameters | P0 | `src/App.tsx`, `src/client/ClientApp.tsx`, destination route parser | unit + route integration + browser | `App.launch.test.tsx`, `ClientApp.routing.test.tsx`, `e2e/launch-routing.spec.ts` | Covered |
| Master/client auth separation and 401 behavior | P0 | auth stores, auth APIs, both Axios clients | unit + HTTP contract | store/API tests | Covered |
| Persisted client booking draft | P0 | `src/client/store/booking.store.ts` | unit + reload browser smoke | `booking.store.test.ts`, `e2e/client-booking.spec.ts` | Covered |
| Master application/onboarding/subscription gates | P0 | `src/App.tsx`, welcome/subscription pages | route integration + browser | `App.master-guards.test.tsx`, onboarding/subscription integration, `e2e/master-critical.spec.ts` | Covered |
| Master booking create/package/reschedule/cancel/payment | P0 | master booking pages and API | UI integration + HTTP contract + browser | master booking suites, `e2e/master-critical.spec.ts` | Covered automated baseline |
| Master client/service/schedule/profile mutations | P0 | corresponding pages/components/APIs | UI integration + HTTP contract | master domain suites | Covered with documented direct-rejection debt |
| Client discovery, access gate and service/slot selection | P0 | client profile/service/calendar pages | UI integration + browser | client discovery/calendar suites, `e2e/client-booking.spec.ts` | Covered |
| Client create/package/reschedule/cancel/review | P0 | client booking/profile pages and APIs | UI integration + HTTP contract + browser | client booking lifecycle suites, `e2e/client-booking.spec.ts` | Covered automated baseline |
| Payments/export/subscription external return | P0 | payment APIs/pages/export hook/App | hook + UI integration + browser/native | payment/export suites, `e2e/master-critical.spec.ts` | Automated covered; native release-blocked |
| Destination selector handoff | P0 | standalone destination-selector modules | unit + hook/page integration + browser | destination-selector suites, `e2e/platform-fallbacks.spec.ts` | Covered frontend boundary |
| QR/share/download/calendar/support effects | P0 | platform callers and helpers | unit/UI + browser + native matrix | platform suites, `e2e/platform-fallbacks.spec.ts` | Automated covered; native release-blocked |
| Provider coupling expansion | P0 | 22 direct WebApp callers and provider literals | static architecture | `platform-boundary.architecture.test.ts`, `coverage-inventory.architecture.test.ts` | Covered |
| Reachable read/list/detail states | P1 | master/client route pages | UI integration | master/client domain integration suites | Covered |
| Shared interactive controls and navigation | P1 | non-skeleton component groups below | component integration | colocated tests plus `remaining-controls.test.tsx` | Covered |
| Accessibility of representative critical screens | P1 | master home, client profile, confirmation, handoff | Playwright axe + keyboard | `e2e/accessibility.spec.ts` | Covered: no serious/critical findings |

## Route inventory

### Master and standalone

| Route/input | Owner | Priority |
|---|---|---:|
| `#/map-test` | `MapTestPage` standalone override | P2 |
| `m-dest-<token>` | `DestinationSelectorPage` standalone override | P0 |
| `/welcome/*` | `WelcomePage` — старт и сохраняемый при reload шаг согласий | P0 |
| `/` | `MasterIndexRoute` → `HomePage` | P0 |
| `/bookings` | `BookingsPage` | P0 |
| `/clients` | `ClientsPage` | P0 |
| `/income` | `PaymentsPage` | P0 |
| `/bookings/new` | `CreateBookingPage` | P0 |
| `/bookings/:id` | `BookingDetailPage` | P0 |
| `/booking-series/:seriesId` | `BookingSeriesDetailPage` | P0 |
| `/booking-series/:seriesId/edit` | `BookingSeriesEditPage` | P0 |
| `/settings` | `SettingsPage` | P1 |
| `/about` | `AboutMePage` | P1 |
| `/about-platform` | `AboutPlatformPage` (из «Другое») | P1 |
| `/payment-methods` | `PaymentMethodsPage` — карта подписки, перепривязка (из «Другое») | P1 |
| `/consents` | `ConsentsPage` | P1 |
| `/address` | `AddressEditPage` | P0 |
| `/subscription` | `SubscriptionPlanPage` | P0 |
| `/pay-result/success` | возврат из hosted-формы T-Bank → `SubscriptionSuccessPage` (экран по URL) | P0 |
| `/pay-result/fail` | возврат из hosted-формы T-Bank → `SubscriptionFailedPage` (экран по URL) | P0 |
| `/schedule` | `SchedulePage` | P0 |
| `/services` | `ServicesPage` | P0 |
| `/income/:date` | `PaymentsDayPage` | P1 |
| `/payment-settings` | `PaymentSettingsPage` | P0 |
| `/share` | `ShareLinkPage` | P0 |
| `/other` | `OtherPage` (вкладка навбара) | P1 |
| `/swipe-test` | `SwipeTestPage` — ручная проверка блокировки нативного свайпа Max | P2 |
| master wildcard | redirect to `/` | P1 |

### Client

| Route | Owner | Priority |
|---|---|---:|
| `/` | `HomeRoute` → recent masters, QR or master profile | P0 |
| `/masters` | `RecentMastersPage` | P1 |
| `/master/address` | `MasterAddressPage` | P0 |
| `/qr` | `QRScanPage` | P0 |
| `/book/categories` | compatibility redirect to `/book/services` | P1 |
| `/book/services` | `ServiceSelectPage` | P0 |
| `/book/service` | `ServiceDetailPage` | P0 |
| `/book/calendar` | `CalendarPage` | P0 |
| `/book/package` | `PackageBookingPage` | P0 |
| `/book/confirm` | `ConfirmPage` | P0 |
| `/book/deposit` | `DepositPage` | P1 |
| `/book/success` | `BookingDetailPage` | P0 |
| `/my-bookings` | `MyBookingsPage` | P0 |
| `/my-bookings/:id` | `BookingDetailPage` | P0 |
| `/messages` | `MessagesPage` | P1 |
| client wildcard | redirect to `/` | P1 |

## API inventory

All methods below are P0 frontend-owned HTTP contracts.

- Master: auth login; booking list/get/create/createPackage/confirmPayment/reschedule/cancel; client list/create/update/setBlocked/remove; master getMe/getReviews/updateProfile/updatePayment/getSlots/getAvailability; payment list/export; schedule get/upsert; service list/create/update/remove/addWorkPhoto/removeWorkPhoto/getPopular; subscription startTrial/pay/getMe; support start; photo compress/upload.
- Client: auth login; booking create/createPackage/list/get/getPackage/reschedule/cancel/cancelPackage; master client-access/get/getRecent/getSlots/getAvailability; review create; support start.
- Standalone: destination context GET and address POST.

### Machine-checked API method inventory

Each token below is consumed by `coverage-inventory.architecture.test.ts`; adding an exported API method requires a reviewed matrix entry.

- `src/api/auth.api.ts#authApi.loginWithMax`
- `src/api/auth.api.ts#authApi.login`
- `src/api/auth.api.ts#authApi.detect`
- `src/api/bookings.api.ts#bookingsApi.cancel`
- `src/api/bookings.api.ts#bookingsApi.confirmPayment`
- `src/api/bookings.api.ts#bookingsApi.create`
- `src/api/bookings.api.ts#bookingsApi.createPackage`
- `src/api/bookings.api.ts#bookingsApi.getById`
- `src/api/bookings.api.ts#bookingsApi.list`
- `src/api/bookings.api.ts#bookingsApi.remind`
- `src/api/bookings.api.ts#bookingsApi.remindPayment`
- `src/api/bookings.api.ts#bookingsApi.reschedule`
- `src/api/clients.api.ts#clientsApi.create`
- `src/api/clients.api.ts#clientsApi.list`
- `src/api/clients.api.ts#clientsApi.remove`
- `src/api/clients.api.ts#clientsApi.setBlocked`
- `src/api/clients.api.ts#clientsApi.update`
- `src/api/masters.api.ts#mastersApi.getAvailability`
- `src/api/masters.api.ts#mastersApi.getMe`
- `src/api/masters.api.ts#mastersApi.getReviews`
- `src/api/masters.api.ts#mastersApi.getSlots`
- `src/api/masters.api.ts#mastersApi.updatePayment`
- `src/api/masters.api.ts#mastersApi.markGuideStep`
- `src/api/masters.api.ts#mastersApi.updateProfile`
- `src/api/payments.api.ts#paymentsApi.exportXlsx`
- `src/api/payments.api.ts#paymentsApi.list`
- `src/api/schedule.api.ts#scheduleApi.get`
- `src/api/schedule.api.ts#scheduleApi.getEffectiveWindows`
- `src/api/schedule.api.ts#scheduleApi.upsert`
- `src/api/services.api.ts#servicesApi.addWorkPhoto`
- `src/api/services.api.ts#servicesApi.create`
- `src/api/services.api.ts#servicesApi.getPopular`
- `src/api/services.api.ts#servicesApi.list`
- `src/api/services.api.ts#servicesApi.remove`
- `src/api/services.api.ts#servicesApi.removeWorkPhoto`
- `src/api/services.api.ts#servicesApi.update`
- `src/api/subscription.api.ts#subscriptionApi.getMe`
- `src/api/subscription.api.ts#subscriptionApi.cancel`
- `src/api/subscription.api.ts#subscriptionApi.pay`
- `src/api/subscription.api.ts#subscriptionApi.rebindCard`
- `src/api/subscription.api.ts#subscriptionApi.startTrial`
- `src/api/support.api.ts#startSupport`
- `src/api/upload.api.ts#compressImage`
- `src/api/upload.api.ts#uploadPhoto`
- `src/client/api/auth.api.ts#authApi.loginWithMax`
- `src/client/api/bookings.api.ts#bookingsApi.cancel`
- `src/client/api/bookings.api.ts#bookingsApi.cancelPackage`
- `src/client/api/bookings.api.ts#bookingsApi.create`
- `src/client/api/bookings.api.ts#bookingsApi.createPackage`
- `src/client/api/bookings.api.ts#bookingsApi.getById`
- `src/client/api/bookings.api.ts#bookingsApi.getPackageById`
- `src/client/api/bookings.api.ts#bookingsApi.list`
- `src/client/api/bookings.api.ts#bookingsApi.reschedule`
- `src/client/api/bookings.api.ts#bookingsApi.updateReminder`
- `src/client/api/masters.api.ts#mastersApi.getAvailability`
- `src/client/api/masters.api.ts#mastersApi.getAddressDetails`
- `src/client/api/masters.api.ts#mastersApi.checkClientAccess`
- `src/client/api/masters.api.ts#mastersApi.getById`
- `src/client/api/masters.api.ts#mastersApi.getRecentMasters`
- `src/client/api/masters.api.ts#mastersApi.rememberVisit`
- `src/client/api/masters.api.ts#mastersApi.getSlots`
- `src/client/api/reviews.api.ts#reviewsApi.create`
- `src/client/api/support.api.ts#startSupport`
- `src/standalone-pages/handoff/destination-selector/api.ts#getDestinationSelectorContext`
- `src/standalone-pages/handoff/destination-selector/api.ts#saveDestinationSelectorAddress`
- `src/standalone-pages/handoff/destination-selector/api.ts#saveDestinationSelectorMasterLocation`

## Production source partition

The following non-overlapping groups cover all 114 baseline TS/TSX files. A future static inventory test must fail if a file no longer belongs to a reviewed group.

| Exact path set | Count | Priority/status | Planned owner |
|---|---:|---|---|
| `src/api/*.ts` | 11 | P0 | master API contract suites |
| `src/App.tsx` | 1 | P0 | launch and master guard suites |
| `src/client/api/*.ts` | 6 | P0 | client API contract suites |
| `src/client/ClientApp.tsx` | 1 | P0 | client routing suite |
| `src/client/components/{AddressSuggestField,BottomNav,Button,Card,PageHeader,SegmentControl}.tsx` | 6 | P1 | focused component/platform tests |
| `src/client/components/{AddressListItemSkeleton,CalendarDateSkeleton,MasterCardSkeleton,MasterListItemSkeleton,MyBookingsListSkeleton,ServiceListSkeleton,SlotsGridSkeleton}.tsx` | 7 | P2 | consumer smoke/build; no SVG/markup padding |
| `src/client/lib/{clientAccess,timezone}.ts` | 2 | P0 | client access and timezone unit suites |
| `src/client/pages/{BookingDetailPage,CalendarPage,ConfirmPage,MasterCardPage,MyBookingsPage,PackageBookingPage,QRScanPage,ServiceDetailPage,ServiceSelectPage}.tsx` | 9 | P0 | client domain suites |
| `src/client/pages/{DepositPage,MessagesPage,RecentMastersPage}.tsx` | 3 | P1 | client navigation/read suites |
| `src/client/store/{auth.store,booking.store}.ts` | 2 | P0 | store unit suites |
| `src/client/types/index.ts` | 1 | P2 | typecheck |
| `src/components/{AddressPickerPortal,AddressSuggestInput,AvatarCropPortal,BookingFlowShell,BottomNav,ConfirmDialog,PopularServicesPortal,ServiceEditorPortal,ServiceFormPortal,ServicesCatalog,ToggleSwitch,WheelPicker}.tsx` | 12 | P0/P1 | focused interaction/domain suites |
| `src/components/{AppHeader,Button,Card,ExportToast,Input,MainLayout,onboardingShared,PageHeader,ScrollToTop}.tsx` | 9 | P1 | component/consumer suites |
| `src/components/{ProfileSkeleton,Skeleton}.tsx` and `src/components/onboardingStepOne.styles.ts` | 3 | P2 | consumer smoke/build |
| `src/hooks/usePaymentsExport.ts` | 1 | P0 | hook unit suite |
| `src/lib/{bridge,calendar,workPhotos}.ts` | 3 | P0 | platform/pure unit suites |
| `src/lib/scroll.ts` | 1 | P1 | consumer/helper suite |
| `src/main.tsx` | 1 | P1 | production bootstrap browser smoke |
| `src/pages/{AddressEditPage,BookingDetailPage,BookingsPage,ClientsPage,CreateBookingPage,HomePage,PaymentSettingsPage,PaymentsPage,ProfilePage,SchedulePage,ServicesPage,ShareLinkPage,SubscriptionPlanPage,WelcomePage}.tsx` | 14 | P0 | master domain suites |
| `src/pages/{AboutMePage,PaymentsDayPage,SettingsPage,SubscriptionFailedPage,SubscriptionSuccessPage}.tsx` | 5 | P1 | master read/navigation suites |
| `src/pages/MapTestPage.tsx` | 1 | P2 debug | standalone smoke |
| `src/pages/{BlockedSubscriptionPage,ChatsPage,OnboardingPage}.tsx` | 3 | Unreachable debt | no artificial coverage; removal/ownership requires separate change |
| `src/standalone-pages/handoff/destination-selector/{api,route,useDestinationSelector}.ts` and `DestinationSelectorPage.tsx` | 4 | P0 | handoff suites |
| `src/standalone-pages/handoff/destination-selector/types.ts` | 1 | P2 | typecheck |
| `src/store/auth.store.ts` | 1 | P0 | master auth store suite |
| `src/styles/{theme,tokens,typography}.ts` | 3 | P2 | typecheck/consumer tests |
| `src/test/setup.ts` | 1 | Infrastructure | harness self-tests |
| `src/types/index.ts`, `src/vite-env.d.ts` | 2 | P2 | typecheck |

Total: **114**.

## Confirmed unreachable/debt surfaces

- `src/pages/BlockedSubscriptionPage.tsx` has no importer or route.
- `src/pages/ChatsPage.tsx` has no importer or route.
- `src/pages/OnboardingPage.tsx` has no importer or route; name matches in other files refer to shared onboarding helpers, not this page.

These files remain visible in coverage reporting. They may be centrally excluded from threshold calculation only with this explicit debt reference; removal or restoration is a separate behavior/cleanup change.

## Direct `window.WebApp` baseline allowlist

Exactly 22 production files:

1. `src/App.tsx`
2. `src/client/components/BottomNav.tsx`
3. `src/client/pages/BookingDetailPage.tsx`
4. `src/client/pages/ConfirmPage.tsx`
5. `src/client/pages/MasterCardPage.tsx`
6. `src/client/pages/PackageBookingPage.tsx`
7. `src/client/pages/QRScanPage.tsx`
8. `src/client/pages/ServiceDetailPage.tsx`
9. `src/client/store/auth.store.ts`
10. `src/components/BottomNav.tsx`
11. `src/hooks/usePaymentsExport.ts`
12. `src/lib/bridge.ts`
13. `src/lib/calendar.ts`
14. `src/pages/BlockedSubscriptionPage.tsx`
15. `src/pages/BookingDetailPage.tsx`
16. `src/pages/HomePage.tsx`
17. `src/pages/ProfilePage.tsx`
18. `src/pages/SubscriptionPlanPage.tsx`
19. `src/pages/WelcomePage.tsx`
20. `src/standalone-pages/handoff/destination-selector/DestinationSelectorPage.tsx`
21. `src/standalone-pages/handoff/destination-selector/useDestinationSelector.ts`
22. `src/store/auth.store.ts`

This is an anti-expansion allowlist, not the target architecture. The scanner parses TypeScript syntax and detects direct, bracket, computed-key, aliased, destructured and `Reflect.get` access. Future host extraction may only shrink the allowlist unless an explicit reviewed migration step says otherwise.

Tracked legacy shadows `src/App.js` and `src/main.js` are separately quarantined: their exact inventory is fixed, only `src/App.js` contains legacy WebApp access, production TypeScript may not import explicit JavaScript, and `index.html` must continue to bootstrap `src/main.tsx` rather than `src/main.js`.

## Other provider-specific locations

- SDK bootstrap: `index.html` loads `https://st.max.ru/js/max-web-app.js`.
- Auth endpoint: `src/App.tsx`, `src/api/auth.api.ts`, `src/client/api/auth.api.ts` use `/auth/max`.
- Master token key: `src/App.tsx`, `src/store/auth.store.ts`, `src/api/client.ts`, `src/api/upload.api.ts`.
- Client token key: `src/client/store/auth.store.ts`, `src/client/api/client.ts`.
- Hard-coded MAX deep-link construction: `src/pages/ShareLinkPage.tsx`, `src/pages/SubscriptionSuccessPage.tsx`, `src/client/pages/MasterCardPage.tsx`.

## Known baseline quirks

- Master Axios 401 writes `#/onboarding`, although the current routed onboarding path is `/welcome`; tests must record effective behavior before any separate fix.
- After a composite client booking deep link is consumed, `HomeRoute` recognizes the deep-link master ID, but `MasterCardPage` does not; on return to `/` it fetches the persisted store master when present. This mismatch is characterized, not fixed here.
- `toClientLocal`/`toMasterLocal` intend to return original malformed values, but `dayjs.tz` throws `RangeError` before the current `isValid()` guard. The baseline records this failure; correction requires a separate behavior change.
- `AddressSuggestField` has no stale-response arbitration: an older delayed response can replace newer suggestions.
- `AddressSuggestInput` does not clear its pending suggest debounce on unmount, so a request can start after the screen has closed.
- `PaymentsPage` currently renders Russian day labels from `format('MMM').replace('.', '')` as nominative full month text such as `21 июль`, not an inflected/abbreviated `21 июл`.
- Normal master booking create and every confirmed master reschedule currently send `allowOverlap: true`; there is no reschedule omission branch. Create still requires an extra confirmation when a known overlap is detected.
- Master reschedule and cancel-created handlers navigate to `/bookings` even when their API request rejects, so the route can imply completion without an authoritative success receipt.
- Several settings/client/service/schedule mutation handlers clear busy state in `finally` but do not catch direct API rejection or render failure feedback; rejected event-handler promises remain baseline debt.
- Client `ConfirmPage` does not validate empty `date`/`time`, and before the master profile resolves it can submit a home-visit booking with `clientAddress: null`; loaded home-visit profiles correctly disable submit until an address exists.
- Client booking detail invokes ordinary cancel immediately without a separate confirmation dialog. `cancelPackage` has an HTTP API wrapper but no production UI caller, package sessions are listed as ordinary bookings, and client detail has no add-to-calendar action.
- Launch and one-shot redirect state lives at module scope; launch suites must reset modules and run sequentially.
- Browser fallback can reuse persisted role tokens; this is frontend behavior only and does not prove backend authorization.

## Coverage ratchet

The first complete measured run after master/client journey coverage produced 81.33% statements, 82.24% branches, 74.54% functions and 81.33% lines. Global thresholds are conservatively fixed at 81/82/74/81, below rather than above those observed values, so normal instrumentation variance does not create an artificial failure.

Higher exact-path thresholds protect launch routing, auth/interceptors, stores, timezone/calendar, export, QR and destination handoff. Their values are derived from the same measured report with a small downward margin. Architecture suites live under excluded `src/test/**`: percentage coverage is meaningless for test-only scanners, so their passing exact-set assertions are the binary gate instead of an artificial per-file percentage.

Skeletons, type-only directories, styles, test infrastructure and the named onboarding style module remain centrally excluded. Confirmed unreachable production pages stay visible at 0% as documented debt and are not hidden to inflate the baseline.

## Final handoff

- All automatable P0/P1 rows above are covered by named green suites; no production route, copy, storage key, launch format or API payload was changed.
- Frontend mocks prove request/effect contracts only. Signature freshness, persona authority, JWT scope, identity linking, handoff TTL/replay/ownership, idempotency and authoritative CRM writes remain external `max-bot` follow-ups in `backend-contract-handoff.md`.
- Native QR/share/download/calendar/close/payment-return/safe-area behavior remains release-blocked until `native-max-smoke.md` has versioned Android/iOS evidence.
- The exact 22-caller provider allowlist remains an anti-expansion fence. A later approved `MiniAppHost` change may only shrink it unless a reviewed migration explicitly says otherwise.
- The safety net is green against `master@54bfb43`; host extraction starts only as a separate OpenSpec change after this baseline branch is accepted.

## Completion rule

A row becomes **Covered** only when its named automated test is green and linked here. Native-only rows require a versioned manual evidence entry. A global percentage cannot close a missing P0/P1 row.
