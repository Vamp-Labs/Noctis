# Noctis Bug Bounty Program Specification

**Version:** 1.0  
**Date:** May 28, 2026  
**Status:** DRAFT — Not Yet Live

---

## 1. Platform Recommendation

### Comparison

| Criteria | Immunefi | Hats Finance | Code4rena | Sherlock |
|----------|----------|-------------|-----------|----------|
| **Model** | Continuous bounty | Continuous + Vaults | Contest-based | Contest-based |
| **Audience** | Largest (500K+ researchers) | Growing (50K+) | Strong (200+ wardens) | Strong (150+ wardens) |
| **Stellar Projects** | ✅ Listed (Stellar ecosystem) | ❌ Few Stellar projects | ❌ Primarily EVM | ❌ Primarily EVM |
| **Fees** | ~10% platform fee | Lower fees | Contest fees + 10% | Contest fees |
| **Typical Payout Time** | 2-4 weeks | 1-2 weeks | 1-2 months (contest cycle) | 1-2 months |
| **Coverage** | Smart contracts + web/app | Smart contracts | Smart contracts | Smart contracts |
| **Best For** | Continuous coverage | Cost-sensitive teams | Deep audit sprints | Deep audit sprints |

### Recommendation: Immunefi

**Immunefi** is the recommended platform for the following reasons:

1. **Largest researcher audience** — highest probability of finding vulnerabilities before mainnet
2. **Stellar ecosystem presence** — several Stellar/Soroban projects already listed; researchers familiar with the protocol stack
3. **Continuous coverage** — not contest-based; researchers can submit at any time
4. **Flexible scope management** — easy to update scope as contracts evolve
5. **Industry standard** — trusted by major Web3 protocols; integrates with most triage workflows

**Fallback:** If Immunefi's fees are prohibitive at launch, **Hats Finance** offers a comparable continuous-bounty model with lower fees, though with a smaller researcher pool.

---

## 2. Payout Ranges

| Severity | Description | Payout Range |
|----------|-------------|--------------|
| **Critical** | Direct loss of user funds, permanent freeze of contract assets, inflation attack, or bypass of ZK verification leading to unauthorized batch payments | $25,000 – $50,000 |
| **High** | Temporary freeze of funds, griefing attacks that lock contract state, or manipulation of yield accounting that causes material misallocation | $10,000 – $25,000 |
| **Medium** | Privacy leak of individual payment amounts or recipient addresses, minor denial-of-service on specific contract functions, or policy enforcement bypass with limited impact | $2,000 – $10,000 |
| **Low** | Best-practice violations, gas inefficiencies, event emission omissions, or informational findings that do not pose direct risk | $500 – $2,000 |

### Payout Currency

- Paid in **USDC** (or equivalent stablecoin) on Stellar network
- Paid to the reporter's Stellar wallet address provided at submission
- All payouts are subject to applicable tax reporting and KYC requirements per platform policy

---

## 3. Scope

### In Scope

#### Smart Contracts (All 5)

| Contract | File | Purpose |
|----------|------|---------|
| `payroll_dispatcher` | `crates/payroll_dispatcher/src/lib.rs` | ZK batch payroll entry point, proof verification, nullifier management |
| `streaming_vault` | `crates/streaming_vault/src/lib.rs` | Per-second payment streaming, claim, cancel |
| `wallet_factory` | `crates/wallet_factory/src/lib.rs` | Passkey-authenticated smart wallet deployment (SEP-45) |
| `yield_router` | `crates/yield_router/src/lib.rs` | Yield routing to Blend/Soroswap, pool management |
| `policy_signer` | `crates/policy_signer/src/lib.rs` | Policy-enforced authorization, spending limits, multi-sig |

#### Frontend Cryptographic Module

| File | Purpose |
|------|---------|
| `frontend/src/lib/zk.ts` | Client-side Groth16 proof generation, Merkle tree construction, proof serialization to 192-byte Soroban format |
| `circuits/payroll_circuit.circom` | Circom circuit for payment commitment ZK proofs |

### Out of Scope

The following items are **explicitly excluded** from bug bounty rewards:

#### Known Issues (Documented in PM_GAP_ANALYSIS_MAY28.md)

| Issue | Component | Description |
|-------|-----------|-------------|
| CRITICAL-001 | `payroll_dispatcher` | ZK proof verification is a format-check stub — no real BLS12-381 Groth16 pairing |
| INFO-001 | `yield_router` | `deposit_to_source()` is an empty no-op — simulated yield only |
| SHA-256/Poseidon mismatch | `zk.ts` + `payroll_circuit.circom` | Merkle tree uses SHA-256; circuit uses Poseidon — roots never match |
| `toBytes()` empty buffer | `zk.ts:287-291` | Proof serialization from snarkjs to 192-byte format is missing |
| Employer page bypass | `employer/page.tsx:305-326` | Payroll submission uses zeroed root + hardcoded mock proof instead of calling zk.ts |
| `hashPair()` broken | `zk.ts:60-73` | Dead code that always throws |
| No network guard | `stellar.ts` | No runtime enforcement preventing mainnet transaction submission |
| Time-ignorant yield | `yield_router` | `calculate_accrued_yield()` ignores `_elapsed` — always calculates as if 1 year passed |
| `collect_employee_bonus()` dead code | `yield_router` | Always returns `Err(InternalError)` — deferred to Phase 2 |

#### Other Exclusions
- **SEC-001 internal audit findings** — CRITICAL-001 (ZK stub), LOW-001 (bare `.unwrap()`), INFO-001 (yield no-op)
- **Infrastructure deferred to Phase 2** — x402 micropayments, Launchtube relay, Mercury/Galexie indexer, Soroswap/Blend cross-contract integration, push notifications
- **Third-party dependency vulnerabilities** (Soroban SDK, snarkjs, circomlib, stellar-sdk, etc.)
- **Phishing or social engineering** attacks
- **Ledger spam / resource exhaustion** (Soroban gas limits are by design)
- **Any component not explicitly listed in the in-scope section**

---

## 4. Payout Timing

1. **Submission**: Researcher submits report via Immunefi (or security@noctis.finance)
2. **Triage**: Noctis security team triages within 5 business days
3. **Verification**: Findings are verified on testnet (PoC reproduced)
4. **Fix Development**: Smart Contract Engineer develops and tests the fix
5. **Fix Review**: Fix is reviewed by security team and merged to `main`
6. **Payout Trigger**: Bounty is paid **after** the fix is merged to `main` and deployment is verified
7. **Payout Window**: Within **14 days** of fix merge

**Expected timeline from submission to payout:** 2–6 weeks depending on severity and fix complexity.

---

## 5. Disclosure Timeline

Noctis follows a **90-day embargo** policy:

```
Day 0:   Report received
Day 3:   Acknowledged (72-hour target)
Day 5:   Triaged and classified
Day X:   Fix developed and deployed
Day X+90: Public disclosure permitted
```

- The 90-day embargo period begins **when the fix is deployed to testnet**
- Researchers may request an extension if the fix is complex and pending
- Early disclosure before the embargo expires violates the responsible disclosure agreement and may result in forfeiture of bounty

---

## 6. Responsible Disclosure Policy

By submitting a vulnerability report to Noctis, you agree to:

1. **Submit privately** — Do not disclose the vulnerability publicly before the embargo expires
2. **Act in good faith** — Avoid actions that degrade user experience, destroy data, or compromise privacy
3. **Provide sufficient detail** — Include reproduction steps, PoC, and affected components
4. **Allow reasonable time** — Give the team time to triage and fix before any disclosure
5. **No extortion** — Do not demand payment or threaten disclosure

Noctis agrees to:

1. **Respond promptly** — Acknowledge within 72 hours
2. **Triage fairly** — Classify severity using the published matrix
3. **Fix responsibly** — Develop and deploy fixes in a timely manner
4. **Pay rewards** — Pay bounties per the published ranges for valid, qualifying findings
5. **Give credit** — Recognize researchers in the Hall of Fame (with permission)

---

## 7. Recognition Program (Hall of Fame)

Researchers with qualifying submissions will be recognized in the **Noctis Security Hall of Fame**:

- Listed with name/handle and finding type (with permission)
- Special acknowledgment for Critical and High severity findings
- Priority consideration for future program expansions

### Current Hall of Fame

*(No entries yet — program is in setup phase)*

---

**Last Updated:** May 28, 2026  
**Contact:** security@noctis.finance  
**Platform:** Immunefi (link placeholder — TBD)
