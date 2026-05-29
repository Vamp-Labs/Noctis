# 🪙 Faucet Feature — Testnet Token Distribution

**Requester:** User feedback  
**Date:** May 29, 2026  
**Priority:** P1 (unblocks self-serve testing)  
**Status:** ✅ **IMPLEMENTED** — DEV-018 (API) + DEV-019 (Frontend) done May 29

---

## Problem

Today, to test payroll on testnet:
1. Admin must manually mint NOCTIS tokens to an employer wallet via `local-deployer` key
2. No automated flow — every new tester needs admin intervention
3. Blocks self-serve onboarding for hackathon judges, community testers

## Goal

When an employer registers on testnet, they get a batch of NOCTIS test tokens automatically — no manual minting.

---

## Requirement

```
Given: New employer completes registration (wallet created + policy set)
When: Employer lands on dashboard
Then: Wallet is pre-funded with 100,000 NOCTIS test tokens + 100 XLM for fees
```

---

## Options

### Option A: Backend API Faucet (RECOMMENDED — 2 days)

A simple API route that holds the `local-deployer` secret key server-side and calls `mint()` on the SAC.

| Step | What |
|------|------|
| 1 | New employer registers → frontend calls `POST /api/faucet/claim` |
| 2 | Backend verifies wallet is new (not already funded) |
| 3 | Backend calls `soroban contract invoke ... mint()` with admin key |
| 4 | Returns success → frontend refreshes balance |

**Effort:** 2 days (Backend Engineer)  
**Pros:** Simple, no new contract, works today  
**Cons:** Server holds admin key (acceptable for testnet)

### Option B: Faucet Smart Contract (3 days)

Deploy a `Faucet` contract holding a pool of tokens. Anyone can call `request_tokens()`.

| Step | What |
|------|------|
| 1 | Deploy `faucet` contract, fund it with 1M NOCTIS tokens |
| 2 | Employer calls `faucet.request_tokens()` |
| 3 | Faucet calls `token.transfer(employer, 100_000)` |
| 4 | Rate-limited: 1 claim per wallet per 24h |

**Effort:** 3 days (Smart Contract + Backend)  
**Pros:** No admin key on server, on-chain, rate limiting built-in  
**Cons:** Extra contract deployment, more gas, more audit surface

### Option C: Frontend-Only Faucet (Easiest — 0.5 day)

Stub: when employer dashboard loads, if balance is 0, show a "Get Test Tokens" button that calls the existing `local-deployer` setup script.

**Effort:** 0.5 day (Frontend)  
**Pros:** Fastest to ship  
**Cons:** Still needs admin key somewhere; clunky UX

---

## Recommendation

**Option A — Backend API Faucet** for Sprint 4 (Week 2).

Rationale:
- Testnet-only feature — no security concerns from holding admin key server-side
- Friendbot pattern is well-understood by Stellar users
- Reuses existing SAC `mint()` — no new contract audit needed
- Can be replaced by Option B for mainnet if desired

---

## Spec

### API Endpoint

```
POST /api/faucet/claim
Headers: Content-Type: application/json
Body: { "wallet": "G..." }
Response:
  success: true,
  tx_hash: "abc...",
  amount: "100000",
  token: "CDMM3QPRZKQDOXSG3BJMXLBXVYAVAN5NGUJOVVXDEGB4YHNU44V54OYI"
```

### Rate Limiting
- 1 claim per wallet ever (testnet)
- 100 claims per hour globally (anti-spam)

### Amount
- 100,000 NOCTIS (first claim)
- 0 subsequent claims (sink: `faucet_claimed` set)

### Integration Points

| Layer | Change |
|-------|--------|
| Frontend | After `registerPasskey()` success, call `POST /api/faucet/claim` |
| Frontend | "Get Test Tokens" button on employer dashboard if balance = 0 |
| Backend | New route `/api/faucet/claim` |
| Backend | env var `FAUCET_ADMIN_SECRET` (testnet admin key) |
| Backend | Track claimed wallets in-memory Set or simple JSON file |

### XLM Funding
- Also send 10 XLM via Friendbot on first claim for tx fees
- `curl "https://friendbot.stellar.org?addr=G..."` if not already funded

---

## Sprint Placement

| Sprint | Task | Points | Status |
|--------|------|--------|--------|
| Sprint 4 (May 29) | DEV-018: `/api/faucet/claim` endpoint | 3 | ✅ **DONE** |
| Sprint 4 (May 29) | DEV-019: Frontend faucet banner + claim button | 2 | ✅ **DONE** |
| **Total** | | **5 pts** | **✅ 5/5 COMPLETE** |

---

## Tickets

### DEV-018: Faucet API Endpoint (3 pts)

**Backend Engineer**

Acceptance Criteria:
- [ ] `POST /api/faucet/claim` accepts `{ wallet: string }`
- [ ] Verifies wallet not already claimed (in-memory set or JSON)
- [ ] Calls `soroban contract invoke` to `mint()` 100,000 NOCTIS
- [ ] Calls Friendbot to fund 10,000 XLM
- [ ] Returns tx hash and amount
- [ ] Rate limited: 100 req/hour global
- [ ] Error handling: duplicate claim → `409 Already claimed`
- [ ] Env: `FAUCET_ADMIN_SECRET` loaded from env var

### DEV-019: Faucet Frontend Integration (2 pts)

**Frontend Engineer**

Acceptance Criteria:
- [ ] After `registerPasskey()` → `WalletFactoryClient.createWallet()` succeeds, auto-call `POST /api/faucet/claim`
- [ ] Employer dashboard: if balance === 0, show "Get Test Tokens" button
- [ ] Loading state during claim
- [ ] Success toast: "100,000 NOCTIS deposited to your wallet"
- [ ] Error toast: "Already claimed" / "Faucet depleted, try later"
- [ ] Refresh balance after claim completes

---

## Out of Scope (Phase 2)
- Mainnet faucet (useless — real tokens only)
- Faucet smart contract (Option B)
- Staking/vesting faucet (tokens unlocked over time)
- CAPTCHA or proof-of-work (overkill for testnet)

---

*Planning doc prepared: May 29, 2026*  
*Recommendation: ✅ Option A — Backend API Faucet, Sprint 4 Week 2*
