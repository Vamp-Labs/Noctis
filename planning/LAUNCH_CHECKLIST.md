# Launch Checklist — ZK-SDP Testnet MVP
## Pre-Launch Readiness for Hackathon Demo
### Product Manager: ArbaLabs | June 2026

---

> Use this checklist to gate the final end-to-end demo and DoraHacks submission. Every item must be checked before declaring "launch ready."

---

## 1. Security Gate

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| SG-01 | Internal security review of ConfidentialPayrollContract complete | Smart Contract | 🔲 | Review doc in `planning/audits/` |
| SG-02 | All P0/P1 findings fixed or documented as known limitations | Smart Contract | 🔲 | Acceptable risks annotated |
| SG-03 | Re-entrancy: nullifier marked BEFORE token transfer in withdraw() | Smart Contract | 🔲 | Verify in code |
| SG-04 | Immutable root: create_batch rejects duplicate batch_id | Smart Contract | 🔲 | Unit test verified |
| SG-05 | Zero amount/total rejected | Smart Contract | 🔲 | Unit test verified |
| SG-06 | `require_auth()` on employer operations | Smart Contract | 🔲 | Address check |
| SG-07 | No salary amounts in contract storage or events | Smart Contract | 🔲 | Grep for amount in events |
| SG-08 | Nullifier secret never stored in browser localStorage/sessionStorage | Frontend | 🔲 | Code review |
| SG-09 | Withdrawal payload cleared from memory after claim | Frontend | 🔲 | Verify memory cleanup |
| SG-10 | HTTPS enforced (no HTTP access) | DevOps | 🔲 | Vercel default |
| SG-11 | Circuit soundness: invalid proofs always rejected | Smart Contract | 🔲 | Integration test |

## 2. Infrastructure Gate

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| IG-01 | UltraHonkVerifierContract deployed on testnet | Smart Contract | 🔲 | Address in `testnet_addresses.md` |
| IG-02 | ConfidentialPayrollContract deployed on testnet | Smart Contract | 🔲 | Address in `testnet_addresses.md` |
| IG-03 | Cross-contract call verified on testnet | Smart Contract | 🔲 | Test tx hash documented |
| IG-04 | Backend API deployed (Vercel or VPS) | Backend | 🔲 | Base URL documented |
| IG-05 | WebSocket server running and accepting connections | Backend | 🔲 | Test with wscat |
| IG-06 | Soroban event indexer polling and emitting events | Backend | 🔲 | Logs showing events |
| IG-07 | Circuit JSON served via API with cache headers | Backend | 🔲 | 200 response verified |
| IG-08 | Frontend deployed on Cloudflare Pages | Frontend | 🔲 | Preview URL (zksdp.pages.dev) |
| IG-09 | Cloudflare Pages URL working | DevOps | 🔲 | Accessible publicly |
| IG-10 | Supabase project configured (free tier) | Backend | 🔲 | `batches` + `batch_events` tables replicated |
| IG-11 | Supabase Edge Functions deployed (event-indexer, batch-status) | Backend | 🔲 | Functions returning 200 |
| IG-12 | Supabase Realtime enabled on tables | Backend | 🔲 | Test subscription works |
| IG-13 | Stellar testnet Friendbot funded test accounts ready | DevOps | 🔲 | Employer + 3 employee accounts |
| IG-14 | Testnet USDC (SAC) balance for employer account | DevOps | 🔲 | Fund via Friendbot + trustline |

## 3. Functional Gate

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| FG-01 | Circuit compiles and local prove+verify passes | Smart Contract | 🔲 | `nargo prove` + `bb verify` |
| FG-02 | Tree builder produces correct root (matching Noir) | Backend | 🔲 | Test vector match |
| FG-03 | CSV upload parses correctly | Frontend | 🔲 | Valid + invalid CSV tested |
| FG-04 | Commitment tree builds in UI | Frontend | 🔲 | Root displayed |
| FG-05 | Freighter wallet connects (employer) | Frontend | 🔲 | Testnet network detected |
| FG-06 | Freighter wallet connects (employee) | Frontend | 🔲 | Testnet network detected |
| FG-07 | Deposit transaction signed and lands on testnet | Frontend + Smart Contract | 🔲 | Stellar Expert link |
| FG-08 | Secret exporter generates downloadable file | Frontend | 🔲 | JSON/CSV download |
| FG-09 | Withdrawal payload decodes correctly | Frontend | 🔲 | Amount + company displayed |
| FG-10 | Noir WASM loads and proof generates (< 120s) | Frontend | 🔲 | Time measured |
| FG-11 | WASM progress indicator shows 4 steps | Frontend | 🔲 | Visual verification |
| FG-12 | Withdraw transaction signed and submitted | Frontend | 🔲 | Freighter signs |
| FG-13 | Payout received on employee wallet | Frontend + Smart Contract | 🔲 | Balance check |
| FG-14 | Double-spend attempt correctly rejected | Frontend + Smart Contract | 🔲 | "NullifierSpent" error |
| FG-15 | Dashboard shows correct claim progress | Frontend + Backend | 🔲 | Real-time WS update |
| FG-16 | Auditor tool: root match verified | Frontend + Backend | 🔲 | ✅ MATCH displayed |
| FG-17 | Auditor tool: nullifier audit shows claimed/unclaimed | Frontend + Backend | 🔲 | Table renders correctly |

## 4. E2E Demo Gate

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| EG-01 | Full flow on testnet: 3 employees, all claim successfully | All | 🔲 | Run through 3x |
| EG-02 | Test with fresh accounts (no prior state) | All | 🔲 | Confirm clean-state works |
| EG-03 | Test with invalid payload (fails gracefully) | Frontend | 🔲 | Error screen shown |
| EG-04 | Test with already-spent nullifier (fails gracefully) | Frontend + Smart Contract | 🔲 | Error screen shown |
| EG-05 | Test network disconnection during proof gen (fails gracefully) | Frontend | 🔲 | Error screen shown |
| EG-06 | Test on Chrome + Firefox + (optionally) Safari | Frontend | 🔲 | Cross-browser check |

## 5. Polish Gate

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| PG-01 | All loading states shown (skeletons/spinners) | Frontend | 🔲 | No blank screens |
| PG-02 | All error states handled with user-friendly message | Frontend | 🔲 | No raw contract errors |
| PG-03 | Responsive: works on mobile (320px) | Frontend | 🔲 | Test with DevTools |
| PG-04 | Responsive: works on tablet (768px) | Frontend | 🔲 | Test with DevTools |
| PG-05 | Responsive: works on desktop (1280px) | Frontend | 🔲 | Test with DevTools |
| PG-06 | OpenGraph metadata renders correctly in link preview | Frontend | 🔲 | Test with opengraph.xyz |
| PG-07 | Tab title updates per page | Frontend | 🔲 | e.g. "Batch #1 | ZK-SDP" |
| PG-08 | Favicon present | Frontend | 🔲 | ZK-SDP icon |
| PG-09 | 404 page for unknown routes | Frontend | 🔲 | Not a blank page |

## 6. Submission Gate

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| SM-01 | Demo video recorded (2–3 min) | PM | 🔲 | Uploaded to YouTube |
| SM-02 | GitHub README comprehensive | PM | 🔲 | Includes architecture, setup, testnet links |
| SM-03 | Contract addresses documented in README | PM | 🔲 | Verifier + Payroll + USDC |
| SM-04 | Setup instructions work from clean clone | PM | 🔲 | Verify with `git clone && pnpm install && pnpm build` |
| SM-05 | DoraHacks submission form filled | PM | 🔲 | All fields complete |
| SM-06 | GitHub repo set to public | DevOps | 🔲 | Check visibility |
| SM-07 | License file present (MIT recommended) | DevOps | 🔲 | |
| SM-08 | Code of conduct + contributing guide | DevOps | 🔲 | Optional but recommended |

---

## Pre-Launch Go/No-Go

All items above must be ✅ before declaring launch ready.

**Launch decision authority:** Product Manager

| Gate | Status | Sign-off |
|------|--------|----------|
| Security | __ / 11 |  |
| Infrastructure | __ / 14 |  |
| Functional | __ / 17 |  |
| E2E Demo | __ / 6 |  |
| Polish | __ / 9 |  |
| Submission | __ / 8 |  |

**Final launch verdict:** ✅ GO / ❌ NO-GO

**PM Signature:** __________________ **Date:** _______________

---

## Post-Launch Tasks

| # | Task | Owner | Timeline |
|---|------|-------|----------|
| PL-01 | Monitor testnet for 24h post-launch | All | Day +1 |
| PL-02 | Fix any P0 issues discovered post-launch | All | Immediate |
| PL-03 | Record proof generation benchmark results | Frontend + Backend | Day +1 |
| PL-04 | Write sprint retrospective | PM | Day +1 |
| PL-05 | Plan post-hackathon milestones (audit, mainnet) | PM | Day +3 |

---

*Checklist maintained by Product Manager. Last updated: June 19, 2026.*
