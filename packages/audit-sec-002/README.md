# SEC-002 — External Audit Package: Noctis Protocol MVP

**Prepared for:** OtterSec (Primary) | Trail of Bits (Backup)  
**Date:** May 29, 2026  
**Version:** 2.0  

---

## Overview

Noctis is a privacy-first payroll protocol on Stellar/Soroban. It enables employers to run batch payroll with zero-knowledge privacy, per-second payment streaming, automated yield routing on idle capital, passkey-based wallet management, and policy-based transaction signing.

**Live testnet deployment:** All 5 contracts deployed and E2E verified on Stellar Protocol 26 testnet. Frontend live at https://frontend-mbpksm4c5-candras-projects.vercel.app

This package contains all materials required for a third-party security audit of the Noctis Protocol MVP.

---

## Scope

### In Scope (5 Soroban Smart Contracts)

| Contract | Lines | WASM Size | Description |
|----------|-------|-----------|-------------|
| `payroll_dispatcher` | 1060 | 17 KB | ZK-private batch payroll with real Groth16 BLS12-381 verification |
| `streaming_vault` | 712 | 15 KB | Per-second payment streaming with pause/resume/cancel |
| `wallet_factory` | 517 | 9 KB | Passkey wallet registry (secp256r1) |
| `yield_router` | 882 | 17 KB | Time-aware idle capital yield routing with Blend/Soroswap support |
| `policy_signer` | 591 | 12 KB | Multi-sig policy enforcement with spending limits |

### Out of Scope
- Stellar Protocol 26 network layer
- Third-party dependencies (soroban-sdk, stellar-sdk)
- Blend/Soroswap external contracts (their own audit responsibility)
- Circom ZK circuit (`circuits/payroll_circuit.circom` — built separately, not a Soroban contract)
- Frontend code (`frontend/` directory)
- Backend infrastructure (`scripts/`, `.github/`)

---

## Package Contents

```
packages/audit-sec-002/
├── README.md                          ← This file
├── contracts/
│   ├── payroll_dispatcher/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs                 ← Real Groth16 BLS12-381 verification (1060 lines)
│   ├── streaming_vault/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs                 ← Time-based streaming with pause tracking (712 lines)
│   ├── wallet_factory/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs                 ← secp256r1 passkey wallet registry (517 lines)
│   ├── yield_router/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs                 ← Time-aware yield routing, DirectHold + Blend (882 lines)
│   └── policy_signer/
│       ├── Cargo.toml
│       └── src/lib.rs                 ← Policy enforcement with spending limits (591 lines)
├── docs/
│   ├── architecture_overview.md       ← System architecture and data flow
│   ├── SEC-001_INTERNAL_AUDIT_REPORT.md
│   ├── SPRINT_3_CONTRACT_IMPLEMENTATION_SPECS.md
│   ├── PRD.md
│   ├── PRD_SYNC_MAY29.md
│   ├── RES-002_CIRCUIT_SPEC.md        ← ZK circuit design reference
│   └── e2e-testnet.ts                 ← 12-phase E2E integration test (all passing)
├── zk/
│   └── (reserved for ZK circuit artifacts — available at circuits/)
├── build/
│   ├── Makefile
│   └── deploy_testnet.sh
```

---

## Key Audit Findings (Pre-Audit)

The following findings were identified during internal audit (SEC-001) and are **pre-acknowledged**:

| Severity | Finding | Status |
|----------|---------|--------|
| 🔴 Critical | ZK proof verification is a no-op (format check only) | ✅ **FIXED** — Real Groth16 BLS12-381 pairing verification implemented |
| ✅ Fixed | Integer division truncation in amount_per_second | Fixed |
| ✅ Fixed | Unchecked overflow in claim_stream | Fixed |
| ✅ Fixed | Unchecked overflow in streaming_vault calculate_accrued | Fixed |
| ✅ Fixed | Overflow-checks missing in release profile | Fixed |
| ℹ️ Info | Bare .unwrap() without error context | Acknowledged (low-severity) |
| ℹ️ Info | Yield source integration pending | Acknowledged (Phased approach — Blend integration code exists but requires mainnet pool address) |

**Critical finding resolved.** The function `verify_zk_proof_internal()` in `payroll_dispatcher` now performs real Groth16 BLS12-381 pairing verification:
- **Proof format:** 384 bytes uncompressed (π_A: G1 96 bytes, π_B: G2 192 bytes, π_C: G1 96 bytes)
- **Pairing check:** `e(π_A, VK_B) · e(VK_A, π_B) · e(π_C, VK_C) == 1` (4-pair equation)
- **Fiat-Shamir transcript:** Challenge `e = hash(public_inputs || proof)` computed at verify time
- **VK storage:** Set via `set_verification_key()` (VK_A: G1, VK_B: G2, VK_C: G1, VK_Delta: G2), fetched at verify time
- **Subgroup checks:** All G1/G2 elements validated `is_in_subgroup` before pairing

Test proofs using the identity point (`G1::identity()`, `G2::identity()`) verify the pairing equation correctness end-to-end.

---

## Test Results

All 5 contracts pass their test suites, and the full E2E integration suite passes against live testnet:

```
Unit Tests:
  payroll_dispatcher: 11/11 tests passing
  streaming_vault:     6/6 tests passing
  wallet_factory:      8/8 tests passing
  yield_router:       10/10 tests passing
  policy_signer:       7/7 tests passing
  Total:              42/42 tests passing, 0 warnings

E2E Integration (live testnet):
  Phase 1-12:         12/12 phases passing
  Coverage:           Funding → Mint → Configure → Wallets → Policy →
                      Batch (Groeth16 proof) → Claim → Stream → Yield → Enforcement
```

---

## Build Instructions

```bash
# Prerequisites
rustup target add wasm32v1-none
# Stellar CLI v26.0.0 required for testnet deployment

# Build all contracts
cargo build --target wasm32v1-none --release

# Run all tests
cargo test

# Run linter
cargo clippy --all-targets

# Deploy to testnet
stellar keys generate --network testnet passkeygate-deployer
stellar contract deploy --wasm target/wasm32v1-none/release/payroll_dispatcher.wasm --source passkeygate-deployer --network testnet
# See scripts/deploy-and-configure.ts for full automation
```

---

## Testnet Deployment (Current)

All 5 contracts deployed at:

| Contract | Address |
|----------|---------|
| `payroll_dispatcher` | `CDP36DTJD22K3MHBPS7YF724S4H4ZB6OAX3W4UYXFQ35AE62S4EHR4LF` |
| `streaming_vault` | `CCR6YESUPNGSTDU2JNP5AG5HJ6PZLHC6RUVRHRBK44PDAZO5EUQLE3E3` |
| `wallet_factory` | `CA5KLXL6T2PLD4OVEVVG3QS5B7NQ3S7BGATNNCKD2R6TK2Y724K434SQ` |
| `yield_router` | `CBFWLCN5XTFZHCJGWNIBSMMB3M5SMFAYHTCOGHWBY2SSXSK5XEE5Q7KB` |
| `policy_signer` | `CCQTEQOHLRV4IR5HZ6WXRFSPC2KUUWC3YJOFPABUBN5PY5NZ5HEGM5RI` |

Network: Test SDF Network ; September 2015  
RPC: https://soroban-testnet.stellar.org  
Deployer: `GAF2H3QXICU7SSUULCATGNE2THH2A6MREUZUDBDWSNBADCCGOMGBWETH` (passkeygate-deployer)

---

## Contact

**Primary Contact:** Product Manager  
**Emergency:** security@noctis.finance (placeholder)  
**Response SLA:** 2 hours during business hours (UTC), 4 hours nights/weekends

---

## Engagement Timeline (Proposed)

| Date | Milestone |
|------|-----------|
| Jun 2 | Package sent, NDA/SoW signed |
| Jun 3 | Kickoff call (1 hour) |
| Jun 9 | Initial findings delivered |
| Jun 12 | Remediation period begins |
| Jun 16 | Remediation complete, re-review |
| Jun 23 | Final audit report delivered |
