# PM Gap Analysis — PRD vs Implementation (May 28, 2026)

**Auditor:** Product Manager  
**Scope:** Full PRD v1.0 requirements vs. current codebase state  
**Key Question:** What is NOT yet implemented, and what can be mocked on testnet?

---

## Summary

| Category | Total PRD Reqs | Implemented | Stub/Mock | Missing |
|----------|---------------|-------------|-----------|---------|
| Smart Contracts (core logic) | 25 | 20 | 3 | 2 |
| Frontend (user flows) | 18 | 10 | 4 | 4 |
| Infrastructure (protocols) | 8 | 1 | 0 | 7 |
| Security | 6 | 4 | 1 | 1 |
| **Total** | **57** | **35** | **8** | **14** |

---

## 1. Smart Contract Gaps

### 1.1 CRITICAL-001: ZK Groth16 Proof Verification — STUB
**Status:** ⚠️ FORMAT-CHECK STUB  
**Contract:** `payroll_dispatcher::verify_zk_proof_internal()`  
**Testnet limitation:** None — BLS12-381 host functions *are available* on Protocol 26 testnet (since Protocol 25 "X-Ray"). The gap is **implementation effort**, not testnet availability.  
**Implementation blockers:**
- No BLS12-381 host function calls integrated (no `env.bls12_381_pairing()` etc.)
- Verification key is stored (`TrustedSetupHash`) but never deserialized or used
- Proof components are sliced but never parsed as valid G1/G2 curve points
- Public input (`commitment_root`) is not bound into any cryptographic check
- No Fiat-Shamir challenge computation

**Recommendation:** This CAN work on testnet. Implement full Groth16 verification using the available BLS12-381 host functions. Estimate: 2-3 weeks for a Soroban-specialist engineer.

---

### 1.2 INFO-001: Yield Router `deposit_to_source()` — NO-OP
**Status:** ⚠️ EMPTY PLACEHOLDER  
**Contract:** `yield_router::deposit_to_source()`  
**Testnet limitation:** Blend and Soroswap *do have testnet deployments*. The gap is cross-contract integration, not availability.  
**Implementation blockers:**
- No `env.invoke_contract()` call to any external protocol
- No `token::Client::approve()` before deposit
- Body is completely empty (returns `()`)

**Recommendation:** For real testnet demo: implement cross-contract deposit to Blend testnet pools. For MVP: the simulated yield **is acceptable as a mock** — just add a comment block and make the simulation time-aware instead of hardcoded.

---

### 1.3 Yield Router `calculate_accrued_yield()` — SIMULATED
**Status:** ⚠️ TIME-IGNORANT SIMULATION  
**Contract:** `yield_router::calculate_accrued_yield()`  
**Issue:** 
- `_elapsed` is computed but never used in the yield formula
- Yield is calculated as if 1 year has passed regardless of actual time
- Uses admin-configured static rates (`SourceRate`), not actual pool APYs

**Recommendation:** Minimal fix: multiply by `_elapsed / 31536000` (seconds per year) to get time-proportional simulated yield. This makes the mock **time-aware** without needing real pool integration. Estimate: 1 hour.

---

### 1.4 Yield Router `collect_employee_bonus()` — ALWAYS ERROR
**Status:** ⚠️ ALWAYS RETURNS `Err(Error::InternalError)`  
**Issue:** Employee bonus pool is tracked in storage but has zero distribution mechanism. This is dead code.  
**Recommendation:** Either implement distribution logic (pro-rata by time employed) or remove the function and add a TODO. For MVP: document as "deferred to Phase 2."

---

### 1.5 Cross-Contract Yield Integration — NOT IMPLEMENTED
**Status:** ❌ MISSING  
**Contracts involved:** `yield_router` → Blend/Soroswap  
**Testnet limitation:** None — both Blend and Soroswap have testnet deployments.  
**Items missing:**
- Blend pool `deposit()` cross-contract call
- Blend pool `get_supply_balance()` for real APY
- Soroswap `swap()` for stablecoin auto-conversion
- Soroswap Earn deposit for yield

**Recommendation:** Defer to mainnet. The simulated yield mock is adequate for testnet MVP.

---

## 2. Frontend Gaps

### 2.1 ZK Proof Pipeline — SHA-256 / POSEIDON MISMATCH
**Status:** ⚠️ BROKEN BY DESIGN  
**File:** `frontend/src/lib/zk.ts` + `circuits/payroll_circuit.circom`  
**Issue:**
- Frontend `buildMerkleTree()` uses SHA-256
- Circom circuit uses Poseidon (via circomlib)
- Roots will NEVER match — proofs are structurally invalid  
- `circomlibjs` (Poseidon WASM for browser) is NOT in `package.json` dependencies

**Testnet limitation:** None — Poseidon hashing works in browser via WASM.  
**Fix:** 
1. Add `circomlibjs` to dependencies
2. Replace SHA-256 calls with `circomlibjs.poseidon()` in `buildMerkleTree()`
3. Run `circuits/build.sh` to generate `.zkey` and `.wasm` files
4. Copy output files to `frontend/public/circuits/`

**For testnet MVP (mock path):** The current mock proof **is acceptable** — the contract stub accepts any 192-byte proof. The real fix is a Phase 2 / mainnet requirement.

---

### 2.2 `snarkjs` Proof `toBytes()` Returns EMPTY BUFFER
**Status:** ⚠️ BROKEN  
**File:** `frontend/src/lib/zk.ts` line 287-291  
**Issue:** Even when snarkjs generates a real proof via `groth16.prove()`, the `toBytes()` helper returns `new Uint8Array(192)` — all zeros. This means the serialization from snarkjs proof format to Soroban 192-byte format is missing.

**Testnet limitation:** None — purely a serialization implementation gap.  
**Fix:** Implement proper proof serialization: extract pi_A (48 bytes G1 compressed), pi_B (96 bytes G2 compressed), pi_C (48 bytes G1 compressed) from the snarkjs proof object.  
**For MVP:** Mock proof is used (snarkjs path never reached in practice).

---

### 2.3 `hashPair()` is BROKEN DEAD CODE
**Status:** ⚠️ BROKEN  
**File:** `frontend/src/lib/zk.ts` lines 60-73  
**Issue:** `hashPair()` always throws `new Error(...)`. Currently never called, but is a maintenance trap.  
**Fix:** Either implement it properly (Poseidon hash pair) or remove it.

---

### 2.4 Employer Page Bypasses zk.ts ENTIRELY
**Status:** ⚠️ BYPASSED  
**File:** `frontend/src/app/employer/page.tsx` lines 305-326  
**Issue:** The employer payroll submission builds a **zeroed Merkle root** and a **hardcoded 192-byte magic proof** inline rather than calling `processPayrollBatch()` from `zk.ts`. Nullifiers are `Date.now()`-based timestamps, not cryptographic hashes.

**Recommendation:** Connect the employer page to `zk.ts::processPayrollBatch()`. For MVP mock: this works because the contract stub accepts the hardcoded proof, but the Merkle root mismatch means the root verification at contract line 236 will pass (since both sides send zero root of 32 zero bytes). **This is currently working only by coincidence.**

---

### 2.5 No Network Guard Against Mainnet
**Status:** ❌ MISSING  
**PRD Requirement (Section 10):** "Hardcoded network guard — if STELLAR_NETWORK !== 'TESTNET' app refuses to submit transactions."  
**Current state:** `STELLAR_NETWORK` is defined in `types/index.ts` but used only for passphrase, RPC URL, and friendbot URL. There is zero runtime enforcement. If someone changes the RPC URL to a mainnet endpoint, transactions WILL be submitted.

**Fix:** Add a guard in `stellar.ts` `writeWithFreighter()`: check `STELLAR_NETWORK.passphrase` against `"Test SDF Network ; September 2015"` before any transaction submission. If it doesn't match, throw an error.

---

### 2.6 Policy Creation UI — MISSING
**Status:** ❌ MISSING  
**PRD Requirement (Section 8.1):** "Set policy: spending limit per batch, multi-sig threshold if needed, approved stablecoins."  
**Current state:** Policy read works (`getEmployerPolicies()`), but there is no UI form to call `createPolicy()`. The UI says "use Stellar Laboratory or CLI for advanced configuration."  
**Fix:** Build policy creation form in employer dashboard.

---

### 2.7 Yield Router Write Methods — MISSING
**Status:** ❌ MISSING  
**Current state:** `YieldRouterClient` has **zero write methods**. No `deposit_idle()` or `withdraw_yield()` call exists anywhere.  
**Fix:** Add `depositIdle()` and `withdrawYield()` methods to `YieldRouterClient` and wire them into the employer dashboard.

---

### 2.8 APY Display in Employer Dashboard — MISSING
**Status:** ❌ MISSING  
**PRD Requirement:** "Employer UI shows live projected yield."  
**Current state:** Yield data is loaded via RPC reads but never displayed in any UI component.

---

## 3. Infrastructure Gaps

### 3.1 M6: x402 Micropayments — NOT STARTED
**Status:** ❌ MISSING (0% complete)  
**PRD Requirements:**
- x402 HTTP-native payment protocol (Coinbase facilitator on Stellar testnet)
- Employer API endpoints gated by x402
- MPP (Machine Payments Protocol) for AI agentic payments

**Testnet limitation:** x402 *is live* on Stellar testnet with Coinbase facilitator (sponsored fees). MPP SDK is available (`stellar-mpp-sdk` experimental).  
**Implementation estimate:** 2-3 weeks for basic x402 integration + demo flow.  
**Recommendation:** Defer to Phase 2 (post-hackathon). Remove M6 from MVP milestone checklist.

---

### 3.2 Launchtube Relay — NOT IMPLEMENTED
**Status:** ❌ MISSING  
**PRD Requirement:** "Launchtube relay for smart wallet transactions — employees never need to hold XLM for gas."  
**Current state:** `launchtube` npm package is NOT in dependencies. Freighter handles all signing (requires employee to hold XLM).  
**Recommendation:** Defer to Phase 2. For MVP, Freighter is an acceptable mock for "wallet-based" signing.

---

### 3.3 Mercury / Galexie Indexer — NOT STARTED
**Status:** ❌ MISSING  
**PRD Requirement (Section 8.3):** "Private transaction history via Mercury indexer. Employee views private balance via indexed events."  
**Current state:** No Mercury SDK or indexer integration exists.  
**Recommendation:** Defer to Phase 2. For MVP, RPC reads (`getAccruedAmount()`) serve as a functional mock.

---

### 3.4 Soroswap DEX Integration — NOT STARTED
**Status:** ❌ MISSING  
**PRD Requirement (Section 8.3):** "Auto-convert claimed USDC to preferred stablecoin via Soroswap Aggregator."  
**Current state:** No Soroswap contract address in config, no swap integration.  
**Recommendation:** Defer to Phase 2.

---

### 3.5 Blend Protocol Lending — NOT STARTED
**Status:** ❌ MISSING  
**PRD Requirement (Section 5.5 & 8.2):** "Idle capital auto-deposited into Blend Protocol lending pools."  
**Current state:** `deposit_to_source()` is a no-op.  
**Recommendation:** Defer to Phase 2. Simulated yield is adequate for testnet MVP mock.

---

### 3.6 Push Notifications — NOT STARTED
**Status:** ❌ MISSING  
**PRD Requirement (Section 8.3):** "Employee receives push notification / email with claim link."  
**Current state:** No notification infrastructure.  
**Recommendation:** Defer to Phase 2.

---

## 4. Contract-Level Quick Fixes (Low Effort)

These are small bugs/fixes that should be done before next demo:

| # | Issue | File | Fix | Effort |
|---|-------|------|-----|--------|
| 1 | `hashPair()` broken dead code | `zk.ts:60-73` | Remove or implement | 15 min |
| 2 | Merkle root bypass in employer page | `employer/page.tsx:305` | Call `processPayrollBatch()` | 2 hours |
| 3 | `toBytes()` returns empty | `zk.ts:287-291` | Implement snarkjs→192-byte serialization | 2 hours |
| 4 | No network guard | `stellar.ts` | Add passphrase check before writes | 30 min |
| 5 | Yield `_elapsed` not used | `yield_router.rs:403-405` | Multiply by `_elapsed / 31536000` | 1 hour |
| 6 | `collect_employee_bonus()` dead code | `yield_router.rs:417-423` | Document as deferred | 15 min |

---

## 5. Testnet-Available vs. Not-Available

### Features that CAN work on testnet (just not implemented):
| Feature | Testnet Available? | Implementation Status |
|---------|-------------------|----------------------|
| Groth16 BLS12-381 verification | ✅ Protocol 25 host fns live | ⚠️ Stub — needs real integration |
| Blend protocol deposit | ✅ Blend testnet pools live | ❌ Not started |
| Soroswap swap | ✅ Soroswap testnet live | ❌ Not started |
| x402 micropayments | ✅ Coinbase facilitator live | ❌ Not started |
| Passkey Kit / Launchtube | ✅ SDK available | ❌ Not started |
| Poseidon hash in browser | ✅ circomlibjs WASM | ❌ Not installed |

### Features BLOCKED on testnet (cannot implement):
| Feature | Blocked By | Mitigation |
|---------|-----------|------------|
| None currently identified | — | All PRD features are testnet-implementable |

---

## 6. Recommended Sprint 3 Re-Prioritization

Given this gap analysis, I recommend restructuring Sprint 3 (Jun 26–Jul 9):

### P0 — Must Do for Production Credibility:
1. **Network guard** — 30 min fix. PRD hard requirement.
2. **SHA-256 → Poseidon fix** in `zk.ts` + `build.sh` execution — critical for real ZK flow
3. **`toBytes()` serialization** — fixes snarkjs proof pipeline
4. **Time-aware yield simulation** (`_elapsed` fix)
5. **Employer page → zk.ts integration** — removes hardcoded bypass

### P1 — Should Do:
6. **Policy creation UI** — completes employer onboarding flow
7. **Yield write methods** (`depositIdle`, `withdrawYield`)
8. **APY display** in employer dashboard
9. **SEC-002**: External audit engagement (process, not code)

### P2 — Defer to Phase 2:
10. Real Groth16 BLS12-381 verification (CRITICAL-001)
11. Real Blend/Soroswap cross-contract integration
12. x402 / MPP micropayments
13. Launchtube relay
14. Mercury indexer
15. Push notifications
16. Stablecoin auto-convert

---

## 7. Updated Milestone Reality Check

| Milestone | PRD Target | Current Reality | Verdict |
|-----------|-----------|-----------------|---------|
| M1 — Testnet Setup | ✅ Done | ✅ Done | **Complete** |
| M2 — Smart Wallets | Passkey via Launchtube | WalletFactory deployed, but no Launchtube, no passkey-kit wiring in UI | **Partial — Acceptable for MVP** |
| M3 — Core Payroll | 10-recipient batch | Works with mock ZK proof | **Complete (with stub caveat)** |
| M4 — ZK Proofs | Real Groth16 on-chain | Format-check stub, SHA-256≠Poseidon mismatch | **Stub — Acceptable for MVP demo** |
| M5 — Streaming | Per-second claim/cancel | ✅ Done | **Complete** |
| M6 — x402 | HTTP 402 flow | ❌ Not started | **Deferred to Phase 2** |
| M7 — Yield | Auto-deposit to Blend | No-op deposit, time-ignorant simulation | **Stub — Acceptable for MVP demo** |
| M8 — Employee Portal | Passkey login, claim | ✅ Claim works via Freighter. Passkey falls back to simulation. | **Complete (with stub caveat)** |
| M9 — Employer Dashboard | CSV + batch approval | ✅ CSV + batch works with mock proof. Policy creation UI missing. | **Complete (with stub caveat)** |
| M10 — Demo Day | End-to-end demo | ✅ Demo script executed, 12/12 E2E tests pass | **Complete** |

**Bottom line:** 7/10 milestones complete, 2 stubbed (M4, M7), 1 deferred (M6). The MVP is **demonstrable end-to-end** with the mocks and stubs in place.

---

## 8. Action Items

| # | Action | Owner | Effort | Priority |
|---|--------|-------|--------|----------|
| 1 | Add network guard before any tx submission | PM/Frontend | 30 min | 🔴 P0 |
| 2 | Fix `_elapsed` in `calculate_accrued_yield()` | Smart Eng | 1 hour | 🟡 P1 |
| 3 | Document `collect_employee_bonus()` as deferred | Smart Eng | 15 min | 🟢 P2 |
| 4 | Fix `hashPair()` or remove dead code in `zk.ts` | Frontend | 15 min | 🟢 P2 |
| 5 | Sprint 3 planning call — re-prioritize per above | PM | — | 🔴 P0 |

---

*Generated: May 28, 2026*  
*Prepared by: Product Manager*
