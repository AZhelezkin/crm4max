# Running Mini App tests

## Runtime and installation

Use Node.js 20 and npm from `master-app`:

```bash
node --version
npm ci
```

No provider credentials or `VITE_API_URL` are required for quality or browser tests. Vitest and Playwright reject undeclared HTTP traffic; fixtures contain only synthetic identities and data.

Install Chromium once before the first local browser run:

```bash
npm run test:e2e:install
```

## Quality commands

| Command | Purpose | Typical local duration |
|---|---|---:|
| `npm run typecheck` | Production and test TypeScript | 5–15 seconds |
| `npm run test` | Vitest unit/integration/architecture suite | 15–30 seconds |
| `npm run test:coverage` | Vitest plus committed coverage ratchets | 20–45 seconds |
| `npm run build` | Typecheck and production Vite build | 10–30 seconds |
| `npm run test:ci` | Typecheck, coverage and production build | 45–120 seconds |
| `npm run test:e2e` | Production-build mobile Chromium suite | 30–90 seconds |

Durations are guidance for a warm local cache and vary by CPU. The first Chromium installation can take several minutes.

## Focused runs

Run one Vitest file or select tests by name:

```bash
npm run test -- src/client/pages/client-booking-create.integration.test.tsx
npm run test -- --testNamePattern='создание записи'
```

Reproduce the baseline shuffled-order checks:

```bash
npm run test -- --sequence.shuffle --sequence.seed=1701
npm run test -- --sequence.shuffle --sequence.seed=2903
```

Run one Playwright file or filter by title:

```bash
npm run test:e2e -- e2e/client-booking.spec.ts
npm run test:e2e -- --grep='destination selector'
```

Reports are generated under `coverage/`, `playwright-report/` and `test-results/`. These paths are ignored locally. CI retains coverage for seven days and uploads Playwright traces/screenshots only after failure; reports must continue to use synthetic fixtures and must not include provider init data, bearer tokens or PII.

## Validation layers

- `docs/testing/coverage-matrix.md` maps P0/P1 risks to named tests.
- `docs/testing/browser-validation-decisions.md` records Chromium, WebKit, visual and accessibility policy.
- `docs/testing/native-max-smoke.md` owns real MAX WebView evidence.
- `docs/testing/backend-contract-handoff.md` lists security and final-write evidence that belongs in `max-bot`.
