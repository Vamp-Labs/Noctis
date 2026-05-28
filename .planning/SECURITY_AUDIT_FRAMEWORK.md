# 🔒 SPRINT 3 — SECURITY AUDIT FRAMEWORK
## Internal Audit, External RFP, Bug Bounty Program

**Author:** Product Manager  
**Audience:** Security Engineer, Smart Contract Engineer, DevOps  
**Target:** M7 (Internal Audit: Jul 5), M8 (External Audit: Jul 9)  
**Status:** ✅ FRAMEWORK COMPLETE — READY FOR EXECUTION

---

## TABLE OF CONTENTS

1. [Internal Audit (SEC-001)](#1-internal-audit-sec-001)
2. [External Audit Engagement (SEC-002)](#2-external-audit-engagement-sec-002)
3. [Bug Bounty Program (SEC-003)](#3-bug-bounty-program-sec-003)
4. [Audit Schedule & Milestones](#4-audit-schedule--milestones)
5. [Risk Register](#5-risk-register)

---

## 1. INTERNAL AUDIT (SEC-001)

### 1.1 Scope

**In Scope:**
- 5 Soroban smart contracts (`payroll_dispatcher`, `streaming_vault`, `wallet_factory`, `yield_router`, `policy_signer`)
- ZK circuit design (`payroll_circuit.circom` — circuit constraints, trusted setup)
- Cross-contract integration points
- Deployment scripts and configuration
- Frontend wallet integration (Passkey Kit SDK)

**Out of Scope (Future Audit):**
- Stellar Protocol 26 itself (assumed secure)
- Third-party dependencies (soroban-sdk, stellar-sdk)
- Blend/Soroswap external contracts (their own audit responsibility)

### 1.2 Audit Checklist

#### Smart Contract Security (All 5 Contracts)

```
Reentrancy & Execution Isolation
[ ] Confirm Soroban's inherent re-entrancy safety is not bypassed
[ ] NO cross-contract calls mid-state-mutation (Check-Effects-Interact pattern)
[ ] NO recursive call patterns possible

Access Control
[ ] Address::require_auth() on ALL privileged functions
[ ] Admin functions gated by stored admin address
[ ] Pause/unpause mechanism properly guarded
[ ] No "backdoor" admin functions that bypass normal auth
[ ] Multi-sig threshold check correct (policy_signer)

Integer Safety
[ ] All i128 arithmetic uses checked math (overflow/underflow protection)
[ ] Division operations checked for zero divisor
[ ] No unsafe casting between types
[ ] Amount calculations correct (basis points, percentages)

Storage & State
[ ] Storage keys properly scoped (no collisions between contracts)
[ ] DataKey enum covers all stored values
[ ] No stale/abandoned storage (storageDoS)
[ ] Immutable storage for trusted setup hash (cannot be changed post-init)

Nullifier System (payroll_dispatcher)
[ ] Nullifier uniqueness guaranteed (no double-spend)
[ ] Nullifier storage is permanent (cannot be cleared)
[ ] Nullifier checked BEFORE state changes
[ ] Nullifier collision resistance (SHA256 output sufficient)

Stream Management (streaming_vault)
[ ] Accrual calculation correct for all edge cases:
  - Stream paused/resumed
  - Stream expired
  - Cancelled mid-stream
  - Zero-duration stream
[ ] Claimable amount capped at total_amount (no over-withdrawal)
[ ] Employer refund correct on cancellation (residual returned)

Yield Routing (yield_router)
[ ] Yield split percentages sum to 10000 basis points
[ ] Protocol fee cannot be set > 1000 bps (10%) without governance
[ ] Employee bonus pool cannot be drained by admin
[ ] Withdraw yield idempotent (no double-claim)

Wallet Factory
[ ] Passkey public key validation (33 bytes, correct compression flag)
[ ] Duplicate wallet prevention (one wallet per owner)
[ ] Signature verification correct (secp256r1 curve)
[ ] Passkey rotation properly authenticated
```

#### ZK Circuit Security

```
Circuit Correctness
[ ] Merkle tree membership proof constraint is correct
[ ] Sum constraint enforces total_amount == Σ amounts
[ ] No extraneous public signals leak private info
[ ] Circuit compiles with circom 2.x
[ ] Witness generation completes within 5 seconds for 1000 leaves

Trusted Setup
[ ] Powers of Tau ceremony file generated correctly (ptau)
[ ] Phase 2 ceremony run for this specific circuit
[ ] Verification key matches expected format
[ ] Toxic waste properly discarded (testnet only — document for production)

Groth16 Verification
[ ] Proof size is 192 bytes (3 × 64-byte group elements)
[ ] Pairing check equation correct
[ ] Public inputs properly marshalled
[ ] Verification gas cost < 200K (target: ~160K)

Known Attacks Checked
[ ] No proof malleability (Groth16 malleability addressed)
[ ] No Fiat-Shamir transform weakness
[ ] No weak Fq/Fr field attacks
[ ] No quadratic overflow in constraint system
```

#### Infrastructure Security

```
API & Backend
[ ] All API endpoints require authentication
[ ] Rate limiting configured (100 req/min per IP)
[ ] Input validation on all user-supplied data
[ ] CORS whitelist restrictve (specific origins only)
[ ] No secrets in environment files committed to git
[ ] Error messages do not leak stack traces or internals

Frontend
[ ] Passkey authentication uses WebAuthn proper origin validation
[ ] No private keys stored in localStorage
[ ] Content Security Policy headers set
[ ] XSS prevention (React's built-in escaping sufficient)
[ ] RPC endpoint URL comes from env, not user input

Deployment
[ ] Testnet vs mainnet network guard hardcoded
[ ] CI/CD pipeline has security scanning step
[ ] Contract WASM binaries reproducible (deterministic build)
[ ] Deployment scripts require multi-sig approval for mainnet
```

### 1.3 Audit Process

```
DAY 1-2 (Jul 1-2): Automated Analysis
  ├── Run cargo-audit for dependency vulnerabilities
  ├── Run static analysis (clippy with security lints)
  ├── Run fuzzer on contract inputs (if available)
  ├── Generate call graph of all contracts
  └── Identify initial candidates for deep review

DAY 3-4 (Jul 3-4): Manual Code Review
  ├── 5 contracts × 4 hours each = 20 person-hours
  ├── Two-person review team (Security Engineer + Smart Contract Eng)
  ├── Each contract reviewed by two reviewers independently
  └── Findings logged in audit tracking sheet

DAY 5 (Jul 5): Remediation Planning
  ├── Review all findings
  ├── Severity classification (Critical/High/Medium/Low/Info)
  ├── Assign fixes to Smart Contract Engineer
  └── Timeline for remediation
```

### 1.4 Finding Severity Classification

| Severity | Definition | Response SLA | Examples |
|----------|-----------|-------------|----------|
| **Critical** | Direct loss of user funds or permanent contract freeze | 24 hours | Missing auth, re-entrancy, nullifier bypass |
| **High** | Potential fund loss under specific conditions | 48 hours | Integer overflow in edge case, race condition |
| **Medium** | Incorrect behavior, data leakage risk | 1 week | Event emission missing, off-by-one in accrual |
| **Low** | Best practice violation, code quality | 2 weeks | Unused variables, naming conventions |
| **Info** | Informational observation | Next release | Documentation gaps, test coverage suggestions |

### 1.5 Deliverable

**File:** `SEC-001_INTERNAL_AUDIT_REPORT.md`

```
┌─────────────────────────────────────────────────────────┐
│                 AUDIT FINDINGS SUMMARY                    │
├─────────────────────────────────────────────────────────┤
│ Total Findings:    12                                    │
│ Critical:          0 (target) / 1 (acceptable)           │
│ High:              0 (target) / 3 (acceptable)           │
│ Medium:            2                                     │
│ Low:               5                                     │
│ Info:              4                                     │
├─────────────────────────────────────────────────────────┤
│ Contracts Reviewed:  5/5                                 │
│ Lines of Code:       ~1,500                              │
│ Coverage:            Unit 85%, Integration 70%           │
│ Remediation ETA:     Jul 7                               │
└─────────────────────────────────────────────────────────┘
```

---

## 2. EXTERNAL AUDIT ENGAGEMENT (SEC-002)

### 2.1 Firm Selection

**Selection Criteria:**
- Stellar/Soroban audit experience (strongly preferred)
- ZK circuit audit experience
- Available within 2-3 week lead time
- Budget: $25K-75K (hackathon rate)

**Evaluation Matrix:**

| Firm | Stellar Exp | ZK Exp | Lead Time | Est. Cost | Score |
|------|------------|--------|-----------|-----------|-------|
| **Trail of Bits** | Yes (limited) | Yes (strong) | 4-6 weeks | $75K-150K | ⭐⭐⭐ |
| **OtterSec** | Yes (strong) | Yes | 2-3 weeks | $25K-50K | ⭐⭐⭐⭐⭐ |
| **Zellic** | Limited | Yes (strong) | 3-4 weeks | $50K-100K | ⭐⭐⭐⭐ |
| **Code4rena** | Limited | Yes | 1-2 weeks | $15K-30K | ⭐⭐⭐ |
| **Halborn** | Yes (some) | Limited | 3-4 weeks | $40K-80K | ⭐⭐⭐ |
| **Spearbit** | Limited | Yes | 2-3 weeks | $30K-60K | ⭐⭐⭐⭐ |

**Recommendation:** **OtterSec** — best Stellar experience + ZK capability + fastest lead time.

**Backup:** **Code4rena** (competitive audit, fastest timeline).

### 2.2 Audit Package

To be sent to the selected firm by Jul 7:

```
pkg/
├── contracts/
│   ├── payroll_dispatcher/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   ├── streaming_vault/
│   │   └── src/lib.rs
│   ├── wallet_factory/
│   │   └── src/lib.rs
│   ├── yield_router/
│   │   └── src/lib.rs
│   └── policy_signer/
│       └── src/lib.rs
├── zk/
│   ├── payroll_circuit.circom
│   ├── ptau/
│   │   └── payroll_pTau_14.ptau
│   ├── verification_key.json
│   └── test_vectors/
│       ├── vector_1_3_recipients.json
│       ├── vector_2_10_recipients.json
│       └── vector_3_50_recipients.json
├── docs/
│   ├── SPRINT_3_CONTRACT_IMPLEMENTATION_SPECS.md
│   ├── RES-002_CIRCUIT_SPEC.md
│   ├── TESTNET_SETUP.md
│   ├── PRD.md
│   └── architecture_overview.md
└── build/
    ├── Makefile
    ├── deploy_testnet.sh
    └── test_suite.sh
```

### 2.3 Engagement Timeline

```
T-0  (Jul 7):  Send audit package, execute engagement letter
T+1  (Jul 8):  Kickoff call with audit team (1 hour)
T+7  (Jul 14): Initial findings delivered
T+10 (Jul 17): Remediation period begins (Smart Contract Engineer)
T+14 (Jul 21): Remediation complete, re-review
T+21 (Jul 28): Final audit report delivered
```

### 2.4 Audit Scope Letter

**To:** [Audit Firm]  
**From:** Noctis Team  
**Date:** July 7, 2026  
**Subject:** External Audit Engagement — Noctis Protocol MVP

**Scope:**
- 5 Soroban smart contracts (as specified in audit package)
- 1 Groth16 ZK circuit (payroll_circuit.circom)
- Cross-contract integration and deployment configuration

**Exclusions:**
- Stellar Protocol 26 network layer
- Third-party dependencies
- Blend/Soroswap external contracts

**Timeline:** 3-week engagement (Jul 7 – Jul 28)

**Budget:** $[TBD] payable on delivery of final report

**Deliverables:**
1. Initial findings report (T+7)
2. Final audit report with all findings (T+21)
3. Remediation verification (T+24)

**Contact:** [PM Name] — [email] — Emergency: [phone]

---

## 3. BUG BOUNTY PROGRAM (SEC-003)

### 3.1 Program Overview

**Platform:** Immunefi (preferred) or Cantina (backup)  
**Launch Date:** July 9, 2026  
**Asset Type:** Smart Contract (Testnet + first 30 days mainnet)  
**Total Pool:** $50,000 (initial allocation)

### 3.2 Scope & Exclusions

**In Scope:**
- 5 Soroban smart contracts
- ZK circuit vulnerabilities
- Loss of user funds
- Permanent contract freezing

**Out of Scope:**
- Phishing/social engineering attacks
- Frontend/UX issues (separate program)
- Stellar Protocol vulnerabilities
- Already-known issues from internal/external audit

### 3.3 Reward Structure

| Severity | Description | Reward |
|----------|------------|--------|
| **Critical** | Direct loss of funds (any amount), permanent contract freeze, nullifier bypass allowing double-claim | $15,000 |
| **High** | Loss of funds under specific conditions, temporary contract freeze, protocol fee draining | $7,500 |
| **Medium** | Incorrect yield calculation, stream accrual off-by-one, event emission missing sensitive data | $3,000 |
| **Low** | Best practice violations, gas inefficiency, minor information leakage | $1,000 |

### 3.4 Submission & Response SLA

| Step | Timeline |
|------|----------|
| Submission received | < 24 hours initial response |
| Triage & severity classification | < 48 hours |
| Fix deployed (Critical) | < 7 days |
| Fix deployed (High) | < 14 days |
| Payout processed | < 7 days post-fix |
| Public disclosure (after fix) | 30 days minimum |

### 3.5 Program Rules

1. **Testnet First:** All testing must be done on testnet. Mainnet testing is prohibited until 30 days after mainnet launch.
2. **No Social Engineering:** Do not attempt to phish team members or other users.
3. **No DoS:** Do not launch denial-of-service attacks.
4. **Single Report:** First reporter of unique vulnerability receives full reward.
5. **Responsible Disclosure:** Vulnerabilities must be reported privately via Immunefi. Public disclosure without permission = forfeited reward.
6. **Eligibility:** All security researchers globally (except team members and their immediate families).

### 3.6 Legal Terms

```
This bug bounty program is a discretionary rewards program.
Noctis reserves the right to:
- Modify or cancel the program at any time
- Determine eligibility and reward amounts at its sole discretion
- Reject submissions that violate program rules
Rewards are distributed in USDC on Stellar testnet (no cash value).
```

---

## 4. AUDIT SCHEDULE & MILESTONES

```
JUNE 26-30          JUL 1-2             JUL 3-4             JUL 5
┌──────────────┐   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  DEMO DAY    │   │ IMPLEMENT    │    │ INTERNAL     │    │ INTERNAL     │
│  WINDOW      │   │ CONTRACTS    │    │ AUDIT DAY 3-4│    │ AUDIT CLOSE  │
│              │   │ (ENGINEERS)  │    │ Manual       │    │ Remediation  │
│              │   │              │    │ review       │    │ plan created │
│              │   │ Automated    │    │              │    │              │
│              │   │ analysis     │    │              │    │              │
└──────────────┘   └──────────────┘    └──────────────┘    └──────────────┘

                                                                   
JUL 6-7             JUL 7              JUL 8-9             JUL 9
┌──────────────┐   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ REMEDIATION  │   │ EXTERNAL     │    │ EXTERNAL     │    │ SPRINT 3     │
│ SPRINT       │   │ AUDIT PACKAGE│    │ KICKOFF +    │    │ CLOSE        │
│ Fix findings │   │ SENT         │    │ BUG BOUNTY   │    │              │
│              │   │              │    │ LAUNCH       │    │ M6-M10: ✅   │
│              │   │              │    │              │    │              │
└──────────────┘   └──────────────┘    └──────────────┘    └──────────────┘
```

### Milestone Gates

| Gate | Date | Criteria | Owner |
|------|------|----------|-------|
| **G1: Contracts Complete** | Jul 1 | All 5 contracts 100% implemented, tests green | Smart Eng |
| **G2: Internal Audit Pass** | Jul 5 | No Critical/High findings, Medium < 5 | Security Eng |
| **G3: Remediation Complete** | Jul 7 | All Medium+ findings fixed | Smart Eng |
| **G4: External Audit Engaged** | Jul 7 | Package sent, engagement signed | Security Eng |
| **G5: Bug Bounty Live** | Jul 9 | Program listed on Immunefi | Security Eng |

---

## 5. RISK REGISTER

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|-----------|--------|------------|-------|
| R1 | External audit firm unavailable | Medium | High | Engage 2 firms in parallel (primary + backup) | PM |
| R2 | Critical vulnerability found in audit | Low | Critical | Pre-audit internal review, remediation sprint buffer | Security Eng |
| R3 | Bug bounty submission overload | Medium | Low | Immunefi triage team, severity filters | Security Eng |
| R4 | Audit exceeds budget | Low | Medium | Scope letter with fixed price, Hackathon grants budget | PM |
| R5 | Remediation creates new bugs | Medium | Medium | Regression test suite, re-review after fixes | Smart Eng |
| R6 | Stellar Protocol 27 upgrade during audit | Low | High | Track Protocol 27 timeline, document assumptions | PM |
| R7 | False positive bounty submissions | High | Low | Clear test requirements, Immunefi moderation | Security Eng |

---

## APPENDIX A: AUDIT TRACKING SHEET

**File:** `SEC_AUDIT_TRACKING.csv`

```csv
ID,Contract,Severity,Title,Description,Found_By,Status,Fix_ETA,Notes
SEC-001,payroll_dispatcher,Critical,,"",,,,
SEC-002,streaming_vault,High,,"",,,,
SEC-003,wallet_factory,Medium,,"",,,,
SEC-004,yield_router,Low,,"",,,,
SEC-005,policy_signer,Info,,"",,,,
```

## APPENDIX B: TOOLS & RESOURCES

| Tool | Purpose | Link |
|------|---------|------|
| cargo-audit | Dependency vulnerability scanner | crates.io/crates/cargo-audit |
| clippy (Rust) | Static analysis + security lints | rust-lang.github.io/rust-clippy |
| Mythril | EVM security analysis (Soroban adaptation) | github.com/Consensys/mythril |
| Circomspect | Circom/ZK circuit static analyzer | github.com/trailofbits/circomspect |
| SnarkJS | ZK proof generation + verification | github.com/iden3/snarkjs |
| Immunefi | Bug bounty platform | immunefi.com |
| Cantina | Bug bounty platform (backup) | cantina.xyz |

---

*End of Security Audit Framework*  
*Date: June 26, 2026*  
*Phase: Sprint 3 — Production Readiness*  
*Status: ✅ COMPLETE — Ready for Security Engineer*
