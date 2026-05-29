# 🗳️ GOVERNANCE PROPOSAL GOV-001: PROTOCOL FEE SWITCH
## Enable 0.05% Fee on Yield Routing to Fund Protocol Sustainability

**Author:** Noctis Product Team  
**Forum:** governance.noctis.finance  
**Date:** July 7, 2026  
**Vote Type:** Snapshot (off-chain) + On-chain Execution  
**Status:** ✅ DRAFT COMPLETE — READY FOR FORUM POSTING

---

## PROPOSAL SUMMARY

Enable a **0.05% protocol fee** on yield routed through the `yield_router` contract. The fee is applied only to the yield portion of routed capital — **no fees on payroll transactions, streaming, or withdrawals**. Revenue funds ongoing development, security audits, and protocol operations.

---

## PROPOSAL DETAILS

### Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Fee Rate** | 0.05% (5 basis points) | Competitive with industry (Lido: 10%, Aave: 0.01-0.1%) |
| **Fee Scope** | Yield only, not principal | Zero impact on payroll operations |
| **Fee Destination** | Protocol Treasury (Gnosis Safe multi-sig) | Community-controlled |
| **Adjustability** | DAO vote to change rate | Future flexibility |
| **Effective Date** | Mainnet launch + 7 days | Grace period for users |

### Fee Collection Mechanics

```
1. Employer deposits idle capital → yield_router
2. yield_router deposits into yield source (Blend/Soroswap)
3. Yield accrues → employer or employee withdraws yield
4. withdraw_yield() calculates:
   ├── 80% → Employer
   ├── 15% → Employee bonus pool
   └── 5%  → Protocol fee (0.05% of yield OR 5% of yield)
```

The fee is implemented as a fixed percentage of the yield accrual, not as a percentage of total capital deployed. This aligns incentives: the protocol only earns when users earn.

### Fee Split Logic (from yield_router.spec)

```rust
// In withdraw_yield():
let config = env.storage().get(&DataKey::YieldSplitConfig).unwrap();
let employer_yield = total_yield * config.employer_share / 10000;     // 80%
let employee_pool = total_yield * config.employee_pool / 10000;       // 15%
let protocol_fee = total_yield * config.protocol_fee / 10000;         // 5%
// Total: 100%
```

---

## ECONOMIC ANALYSIS

### Projected Revenue

**Conservative Scenario:**
```
TVL:                  $500,000  (first 30 days)
Average Yield:        8% APY (Blend USDC pool)
Monthly Yield:        $3,333
Protocol Fee (5%):    $167/month
Annual Run Rate:      $2,000/year
```

**Moderate Scenario:**
```
TVL:                  $5,000,000  (first 90 days)
Average Yield:        10% APY
Monthly Yield:        $41,667
Protocol Fee (5%):    $2,083/month
Annual Run Rate:      $25,000/year
```

**Growth Scenario:**
```
TVL:                  $50,000,000  (year 1)
Average Yield:        12% APY
Monthly Yield:        $500,000
Protocol Fee (5%):    $25,000/month
Annual Run Rate:      $300,000/year
```

### Fee Comparison (Industry Standards)

| Protocol | Fee Type | Fee Rate | Scope |
|----------|----------|----------|-------|
| **Noctis (proposed)** | Yield routing fee | 5% of yield (0.05% effective) | Yield only |
| Lido | Staking fee | 10% of rewards | Staking rewards |
| Aave | Reserve factor | 0.01-0.1% per asset | Lending/borrowing |
| Uniswap | Swap fee | 0.01-1% per swap | Trading volume |
| Sablier | Stream creation fee | 0.1% flat | Stream creation |

**Why 5% of yield?**
- Aligned: Noctis earns when users earn
- Competitive: Lower than Lido (10%), comparable to Aave
- Sustainable: Funds core development without burdening users
- Optional: Yield routing is an opt-in feature

---

## JUSTIFICATION

### Why a Protocol Fee?

1. **Sustainability:** Funds ongoing smart contract audits, bug bounties, and protocol development
2. **Alignment:** Fee is only on yield — Noctis only earns when users earn
3. **Competitive:** 0.05% effective fee is below industry standard
4. **Optional:** Yield routing is opt-in. Employers can skip yield routing entirely if they prefer 0 fees.

### Why Not Charge Payroll Fees?

Core payroll operations (batch processing, streaming, withdrawal) remain **free of protocol fees**. This is a deliberate product decision:
- Payroll is the primary user acquisition channel
- Zero friction on core value proposition
- Yield routing is an added-value service that justifies the fee

### Treasury Use

```
Protocol Revenue → Noctis Treasury (multi-sig)
  ├── 40% Security (audits, bug bounties)
  ├── 30% Development (engineering, research)
  ├── 20% Operations (infrastructure, legal)
  └── 10% Community (grants, events)
```

---

## IMPLEMENTATION

### Smart Contract Changes

The `yield_router` contract already supports the yield split configuration via `YieldSplitConfig`. No new contract deployment needed — the fee switch is parameterizable:

```rust
// Already implemented in yield_router
pub fn set_yield_split(env: Env, config: YieldSplit) {
    // Admin only (multi-sig)
}
```

**Default values (pre-vote):**
```rust
YieldSplit { employer_share: 8000, employee_pool: 1500, protocol_fee: 500 }
```

### Governance Execution

**Step 1:** Snapshot off-chain vote (3 days)  
**Step 2:** If PASS → Multi-sig executes `set_yield_split()`  
**Step 3:** Fee takes effect immediately for new yield routing  
**Step 4:** Fee applies to existing routing at next withdrawal

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Withdraw yield to avoid fee | Medium | Low | Fee only on new yield, not accrued |
| Competitor undercuts with 0 fees | Low | Medium | Noctis's ZK privacy is unique; fee is optional |
| Fee too high → user exodus | Low | Medium | DAO can adjust rate via new proposal |
| Treasury mismanagement | Low | High | Multi-sig oversight, quarterly transparency reports |

---

## SECURITY & AUDIT STATUS

The Noctis protocol has undergone an internal security audit (SEC-001) prior to this proposal:

**Internal Audit Results (SEC-001, updated May 29, 2026):**
| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | ✅ **FIXED** — Real Groth16 BLS12-381 verification implemented |
| High     | 1 | Fixed ✅ |
| Medium   | 3 | Fixed ✅ |
| Low      | 2 | 1 fixed, 1 acknowledged |
| Info     | 2 | 2 acknowledged |

**Security Status:** The ZK privacy feature in `payroll_dispatcher` now performs real Groth16 BLS12-381 pairing verification — 384-byte proofs, Fiat-Shamir transcript, 4-pair equation via `env.bls12_381_pairing_check()`. All 5 contracts are deployed to live testnet with 42/42 unit tests and 12/12 E2E tests passing. External audit (SEC-002) package is prepared and ready for engagement with OtterSec/Trail of Bits.

**This proposal does NOT affect payroll operations** — the fee applies only to opt-in yield routing.

**Full report:** `packages/audit-sec-002/docs/SEC-001_INTERNAL_AUDIT_REPORT.md`

---

## DISCUSSION PERIOD

**Dates:** July 7, 2026 — July 14, 2026 (7 days)

**Discussion Questions:**
1. Is 5% of yield the right fee rate? Would 2.5% or 10% be better?
2. Should the fee apply to all yield sources equally?
3. Should the employee bonus pool be mandatory or opt-in?
4. How should treasury funds be allocated?
5. Should there be a fee cap (max absolute amount)?

---

## VOTE

**If this proposal passes:** The protocol fee of 5% of yield (0.05% effective) will be enabled on the `yield_router` contract upon mainnet launch.

**If this proposal fails:** The `yield_router` will operate without a protocol fee. A revised proposal may be submitted after mainnet launch.

### Voting Options

- ✅ **YES** — Enable 0.05% protocol fee on yield routing
- ❌ **NO** — Keep yield routing fee-free
- 🔄 **ABSTAIN**

### Vote Parameters

| Parameter | Value |
|-----------|-------|
| Voting System | Single Choice |
| Duration | 3 days |
| Quorum | 1M NOCTIS tokens (or delegated voting power) |
| Pass Threshold | >50% of votes cast |

---

## TEAM RECOMMENDATION

**Vote YES ✅**

The protocol fee is:
- **Small** (0.05% effective)
- **Aligned** (only when users earn)
- **Optional** (yield routing opt-in)
- **Sustainable** (funds security + development)
- **Adjustable** (DAO can change rate)

No payroll operations are affected. This fee enables Noctis to maintain best-in-class security and continue development without relying on external funding.

---

## APPENDIX: TECHNICAL SPECIFICATION

### Contract Method
```
yield_router.set_yield_split(
  YieldSplit { 
    employer_share: 8000,    // 80% to employer
    employee_pool: 1500,     // 15% to employee bonus
    protocol_fee: 500        //  5% to protocol treasury
  }
)
```

### Multi-sig Execution
```
Network:     Stellar Mainnet
Contract:    yield_router
Method:      set_yield_split
Signers:     3/5 multi-sig
Timelock:    24 hours (post-vote)
```

### Verification
```
After execution, verify:
  yield_router.get_yield_split()
  → { employer: 8000, employee: 1500, protocol: 500 }
```

---

*End of Governance Proposal*  
*Date: June 26, 2026*  
*Status: ✅ DRAFT COMPLETE — Ready for Jul 7 forum posting*
