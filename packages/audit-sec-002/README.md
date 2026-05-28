# SEC-002 — External Audit Package: Noctis Protocol MVP

**Prepared for:** OtterSec (Primary) | Code4rena (Backup)  
**Date:** July 3, 2026  
**Version:** 1.0  

---

## Overview

Noctis is a privacy-first payroll protocol on Stellar/Soroban. It enables employers to run batch payroll with zero-knowledge privacy, per-second payment streaming, automated yield routing on idle capital, passkey-based wallet management, and policy-based transaction signing.

This package contains all materials required for a third-party security audit of the Noctis Protocol MVP.

---

## Scope

### In Scope (5 Soroban Smart Contracts)

| Contract | Lines | WASM Size | Description |
|----------|-------|-----------|-------------|
| `payroll_dispatcher` | 893 | 17 KB | ZK-private batch payroll processing with inline stream creation |
| `streaming_vault` | 717 | 15 KB | Per-second payment streaming with pause/resume/cancel |
| `wallet_factory` | ~500 | 9 KB | Passkey wallet registry (secp256r1) |
| `yield_router` | 718 | 17 KB | Idle capital yield routing with revenue split |
| `policy_signer` | ~400 | 12 KB | Multi-sig policy enforcement with spending limits |

### Out of Scope
- Stellar Protocol 26 network layer
- Third-party dependencies (soroban-sdk, stellar-sdk)
- Blend/Soroswap external contracts (their own audit responsibility)
- Circom ZK circuit (not yet implemented — see Notes)

---

## Package Contents

```
packages/audit-sec-002/
├── README.md                          ← This file
├── contracts/
│   ├── payroll_dispatcher/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   ├── streaming_vault/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   ├── wallet_factory/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   ├── yield_router/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   └── policy_signer/
│       ├── Cargo.toml
│       └── src/lib.rs
├── docs/
│   ├── SPRINT_3_CONTRACT_IMPLEMENTATION_SPECS.md
│   ├── RES-002_CIRCUIT_SPEC.md        ← (placeholder — circuit not yet implemented)
│   ├── PRD.md
│   ├── SEC-001_INTERNAL_AUDIT_REPORT.md
│   └── architecture_overview.md
├── zk/
│   └── (reserved for ZK circuit artifacts — not yet available)
├── build/
│   ├── Makefile
│   └── deploy_testnet.sh
```

---

## Key Audit Findings (Pre-Audit)

The following findings were identified during internal audit (SEC-001) and are **pre-acknowledged**:

| Severity | Finding | Status |
|----------|---------|--------|
| 🔴 Critical | ZK proof verification is a no-op (format check only) | Acknowledged — not yet implemented |
| ✅ Fixed | Integer division truncation in amount_per_second | Fixed |
| ✅ Fixed | Unchecked overflow in claim_stream | Fixed |
| ✅ Fixed | Unchecked overflow in streaming_vault calculate_accrued | Fixed |

**The ZK proof verification finding is the most critical item.** The function `verify_zk_proof_internal()` in `payroll_dispatcher` currently only validates proof format (192 bytes, non-zero commitment root). Actual BLS12-381 Groth16 pairing verification has not been implemented. The external auditor should specifically review the verification stub and recommend the correct host function integration.

---

## Test Results

All 5 contracts pass their test suites:

```
payroll_dispatcher: 11/11 tests passing
streaming_vault:     6/6 tests passing
wallet_factory:      8/8 tests passing
yield_router:       10/10 tests passing
policy_signer:       7/7 tests passing
Total:              42/42 tests passing, 0 warnings
```

---

## Build Instructions

```bash
# Prerequisites
rustup target add wasm32v1-none

# Build all contracts
cargo build --target wasm32v1-none --release

# Run all tests
cargo test

# Run linter
cargo clippy --all-targets
```

---

## Contact

**Primary Contact:** Product Manager  
**Emergency:** [TBD]  
**Response SLA:** 2 hours during business hours (UTC), 4 hours nights/weekends

---

## Engagement Timeline (Proposed)

| Date | Milestone |
|------|-----------|
| Jul 7 | Package sent, engagement letter signed |
| Jul 8 | Kickoff call (1 hour) |
| Jul 14 | Initial findings delivered |
| Jul 17 | Remediation period begins |
| Jul 21 | Remediation complete, re-review |
| Jul 28 | Final audit report delivered |
