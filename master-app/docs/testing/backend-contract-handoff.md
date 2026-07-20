# Backend contract handoff

## Purpose

`max-miniapp` tests own frontend request construction, state transitions and rendering of backend responses. They do not prove backend security, persistence or CRM write correctness. The canonical complete backend is maintained in `max-bot`; the ignored/incomplete `max-miniapp/backend/` tree is not an integration target for this baseline.

## Ownership matrix

| Concern | `max-miniapp` evidence | Required `max-bot` evidence |
|---|---|---|
| MAX auth request | Exact `/api/auth/max` method/body with `init_data`, role and timezone | Signature verification against the correct bot secret |
| Auth freshness | UI handles success/non-success/network failure | `auth_date` maximum age, clock skew policy and replay handling |
| Persona selection | Master/client request role is characterized | Requested role cannot choose a different bot secret or grant authority |
| JWT | Correct role-specific token is stored and sent as Bearer | Issuer/audience/expiry/claims, credential rotation and channel scoping |
| Identity | Frontend keeps master/client storage separate | Provider identity mapping, account linking, conflict reconciliation and ownership |
| Authorization | UI reacts to 401 and does not mix tokens | Every protected read/write resolves the authenticated principal server-side |
| Booking/client/service/schedule payload | Exact frontend method/path/query/body and no early UI write | Validation, ownership, availability recheck, transactionality and idempotency |
| Destination handoff | Token path, status mapping, trimmed address and no direct final write | Secure token generation, owner scope, TTL, atomic single-use claim and attach semantics |
| Support | `/support/start` response and URL opening priority | Correct persona/chat routing, authorization and delivery outcome |
| Deep links | Current frontend construction/consumption | Opaque provider-aware link generation and prevention of authority in user-controlled IDs |
| Notifications | UI consumes resulting links | Channel policy, delivery retries, deduplication and receipt correlation |

## Required backend tests in `max-bot`

### MAX init data

- Accept a valid signature only for the matching configured MAX bot credential.
- Reject malformed signature, missing fields and tampered user/start data.
- Reject stale `auth_date`; define accepted clock skew explicitly.
- Do not iterate credentials in a way that lets a requested persona select unintended authority.
- Do not treat numeric MAX and Telegram IDs as the same identity.
- Record safe diagnostics without logging raw init data or tokens.

### Tokens and identity

- Issue channel/persona-scoped JWT claims with expiry, issuer and audience checks.
- Reject a client token on master endpoints and a master token on client-only authority.
- Rotate/revoke credentials without accepting obsolete authority indefinitely.
- Link MAX and Telegram accounts only through a scoped, one-time proof flow.
- Preserve separate conversations per channel even when identities map to one CRM principal.

### Handoff

- Generate cryptographically secure opaque tokens.
- Scope at minimum to master/principal, chat/conversation, actor and kind.
- Enforce expiry and unknown/wrong kind/wrong owner failures closed.
- Make duplicate submit protection atomic; concurrent requests cannot both attach.
- Validate a bounded payload and reject unknown/oversized fields.
- Attach only draft data; do not execute final booking/client/schedule writes on Mini App submit.
- Revalidate the pending draft/version and confirmation authority before later final write.

### CRM mutations

- Authorize entity ownership for every booking/client/service/schedule operation.
- Revalidate service, client, booking and slot immediately before a write.
- Reject stale/conflicting slots and duplicate requests deterministically.
- Guarantee transactional package creation or explicit compensating semantics.
- Make cancel/reschedule/payment transitions idempotent or return a stable conflict receipt.
- Return authoritative post-write entities used by frontend receipts.

### Provider links and delivery

- Generate opaque, provider-specific launch links in one backend-owned factory.
- Do not expose composite IDs as authorization.
- Validate link payload length/grammar per provider.
- Route support and notifications through the correct messenger adapter.
- Test retries, duplicate webhook delivery and operation receipts.

## Evidence rule

A mocked `200`/`ok` response in `max-miniapp` closes only the frontend contract row. It must never be cited as evidence for signature verification, token authority, ownership, replay protection, persistence, delivery or final CRM writes.
