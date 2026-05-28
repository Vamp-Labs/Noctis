# BACKEND ENGINEER — Remaining Work Handoff

**3 Tasks | Est. 4-5 weeks | Priority: P1–P2**

---

## TASK 1: 🟡 x402 + MPP Micropayment Integration
**Priority:** 🟡 P1 | **Effort:** 2-3 weeks | **Status:** ❌ MISSING (M6)

### Current State
x402 (HTTP 402 micropayments via Stellar) and MPP (Meridian Payment Protocol) are **0% started**. No code, no stubs, no integrations exist anywhere in the codebase. The PRD requires this for the "Salary Streaming" value prop but it's flagged as Phase 2 deferred.

### Requirements
Research and implement a x402/MPP receiver that:

1. **x402 receiver endpoint** — An API route (e.g., `/api/x402/salary`) that:
   - Returns HTTP 402 with a Stellar payment challenge
   - Validates the incoming payment in the `payment` header
   - Verifies the transaction is a NOCTIS token transfer to the protocol's treasury
   - Issues a signed token/cookie confirming payment
   - Integrates with the employer dashboard's streaming functionality

2. **MPP payment processing** — Handle Meridian Payment Protocol:
   - Parse MPP payment requests
   - Validate payment amounts against streaming rates
   - Credit employer's prepaid balance
   - Emit events for frontend consumption

3. **Backend service** — Node.js/Express or similar:
   - Mock webhook receiver for x402 callbacks
   - Payment verification (transaction lookup on testnet)
   - Balance tracking for prepaid streaming sessions

### Architecture Notes
- x402 spec: HTTP `402 Payment Required` response with `Stellar-Payment` header containing a challenge transaction
- MPP: Meridian-specific; requires research (see Web3 Researcher handoff)
- Both are testnet-only for this phase
- Can run as a separate microservice or be integrated into the Next.js API routes

### Files to Create
- `app/api/x402/route.ts` — x402 endpoint
- `app/api/x402/verify/route.ts` — Payment verification
- `lib/x402/server.ts` — Server-side x402 logic
- `lib/x402/client.ts` — Client-side x402 request builder

### Dependencies
- Web3 Researcher: MPP/x402 testnet setup research (Task 3)

### Acceptance Criteria
- [ ] x402 endpoint returns HTTP 402 with valid challenge
- [ ] Payment submission on testnet is verified
- [ ] Prepaid balance is updated after payment confirmation
- [ ] Employer can fund streaming via x402
- [ ] MPP payment requests are parsed and accepted

---

## TASK 2: 🟢 Launchtube Relay Integration
**Priority:** 🟢 P2 | **Effort:** 1-2 weeks | **Status:** ❌ MISSING

### Current State
Launchtube (Stellar's fee-bumping/relay service) is **0% started**. No integration code exists.

### Requirements
1. **Launchtube relay client** — Wrap Stellar transaction submission through Launchtube for:
   - Fee-bumped transactions (users pay in NOCTIS tokens instead of XLM)
   - Relayed submissions (users don't need XLM at all)
2. **Fee estimation** — Query Launchtube for current fee rates
3. **Fallback** — Direct Stellar RPC submission when Launchtube is unavailable

### Architecture Notes
- Launchtube is a fee-bumping relay service for Stellar/Soroban
- Allows users to submit transactions without holding XLM
- Required for mainnet UX (users should not need XLM to use Noctis)
- Testnet Launchtube endpoint TBD

### Files to Create
- `lib/launchtube/client.ts` — Launchtube API wrapper
- `app/api/relay/route.ts` — Relay endpoint for frontend

### Dependencies
- Web3 Researcher: Launchtube testnet endpoint research (Task 4)

### Acceptance Criteria
- [ ] Launchtube client can submit fee-bumped transactions
- [ ] Fee estimation returns real rates from Launchtube API
- [ ] Fallback to direct RPC works when Launchtube is down
- [ ] Frontend can relay transactions without user holding XLM

---

## TASK 3: 🟢 Mercury/Galexie Indexer Integration
**Priority:** 🟢 P2 | **Effort:** 1-2 weeks | **Status:** ❌ MISSING

### Current State
Mercury (Stellar indexer) and Galexie (Stellar Foundation's archive indexer) are **0% started**. All ledger queries currently happen via direct RPC calls.

### Requirements
1. **Mercury integration** — Subscribe to Mercury GraphQL API for:
   - Real-time event streams (new streams created, claims, yield events)
   - Historical data queries (past payrolls, all time earnings)
   - Notification triggers

2. **Fallback** — Direct RPC querying when Mercury is unavailable

### Architecture Notes
- Mercury provides a GraphQL interface over Stellar ledger data
- Galexie is the SDF-hosted historical indexer
- Use for notification system and employee dashboard (historical earnings)

### Files to Create
- `lib/mercury/client.ts` — Mercury GraphQL client
- `lib/mercury/queries.ts` — GraphQL query definitions
- `lib/mercury/subscriptions.ts` — WebSocket subscriptions

### Dependencies
- Web3 Researcher: Mercury testnet endpoint and API key research (Task 4)

### Acceptance Criteria
- [ ] Mercury client can query employee salary history
- [ ] Real-time event subscription for new streams
- [ ] Fallback to RPC works when Mercury is unavailable
- [ ] Notification triggers wired from Mercury events

---

## Priority & Sequence

```
WEEK 1-2                   WEEK 3-4                   WEEK 5+
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ x402 Research    │   │ x402 Client impl │   │ Mercury          │
│ (dep on W3R)     │   │ Launchtube impl  │   │ Integration      │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

## Files You'll Create/Modify

| File | Tasks |
|------|-------|
| `app/api/x402/*` | T1 (new) |
| `lib/x402/*` | T1 (new) |
| `lib/launchtube/*` | T2 (new) |
| `lib/mercury/*` | T3 (new) |
