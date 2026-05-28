# Security Policy for Noctis

## Project Description

Noctis is a privacy-first, enterprise-grade global payroll platform built on Stellar. It combines Groth16 zero-knowledge proofs, per-second payment streaming, yield routing, and passkey authentication to deliver confidential payroll processing. All contracts are deployed on **Stellar Testnet (Protocol 26 "Yardstick")** — no mainnet deployment.

## Scope

The following components are in scope for security reporting:

- **Smart Contracts** (5 contracts, ~3,600 lines total):
  - `payroll_dispatcher` — ZK batch payroll entry point
  - `streaming_vault` — Per-second payment streaming
  - `wallet_factory` — Passkey-authenticated smart wallets (SEP-45)
  - `yield_router` — Blend/Soroswap yield routing
  - `policy_signer` — Policy-enforced authorization & spending limits
- **Frontend Cryptographic Module**: `frontend/src/lib/zk.ts` — client-side ZK proof generation, Merkle tree construction, and proof serialization
- **Circom Circuits**: `circuits/payroll_circuit.circom`

Out-of-scope items are listed below.

## Reporting a Vulnerability

**DO NOT** file a public GitHub issue for security vulnerabilities.

Send all reports to: **security@noctis.finance**

If you would like to encrypt your report, please use our PGP key:

```
-----BEGIN PGP PUBLIC KEY BLOCK-----
<PGP KEY FINGERPRINT PLACEHOLDER — 0x0000000000000000000000000000000000000000>
-----END PGP PUBLIC KEY BLOCK-----
```

### What to Include

- Description of the vulnerability and potential impact
- Steps to reproduce (PoC, test inputs, or contract invocation sequence)
- Affected component(s) and file/line references if known
- Any suggested remediation (optional)

## Response Timeline

- **Acknowledgement**: Within **72 hours** of report receipt
- **Triage & Classification**: Within **5 business days**
- **Fix Deployment**: Severity-dependent (see disclosure timeline)
- **Bounty Payout**: On verification of fix + deployment merge to `main`

## Disclosure Policy

Noctis follows a **responsible disclosure** model:

1. Reporter submits vulnerability privately to security@noctis.finance
2. Noctis security team acknowledges receipt within 72 hours
3. Fix is developed and deployed to testnet
4. Public disclosure is permitted **90 days after fix deployment**
5. Reporter may request an extension if 90 days is insufficient for complex issues

Early disclosure (before the embargo period ends) is prohibited unless both parties agree.

## Out of Scope

The following are **not eligible** for bounty rewards:

- **Known Issues from Gap Analysis**: All issues documented in [PM_GAP_ANALYSIS_MAY28.md](.planning/PM_GAP_ANALYSIS_MAY28.md) are excluded, including:
  - CRITICAL-001: ZK Groth16 proof verification is a format-check stub (no real BLS12-381 pairing)
  - INFO-001: `deposit_to_source()` is a no-op placeholder (simulated yield)
  - SHA-256 / Poseidon hash mismatch in zk.ts Merkle tree construction
  - `toBytes()` returning empty buffer (proof serialization gap)
  - Employer page bypassing zk.ts with hardcoded mock proof
  - `hashPair()` broken/dead code
  - No network guard against mainnet (testnet-only scope)
  - Yield router `calculate_accrued_yield()` time-ignorant simulation
  - `collect_employee_bonus()` always returns error (deferred to Phase 2)
- **SEC-001 Internal Audit Findings** (already acknowledged):
  - CRITICAL-001: ZK proof verification no-op
  - LOW-001: Bare `.unwrap()` calls without error context
  - INFO-001: Yield router no-op (MVP simplification)
- **Infrastructure Deferred to Phase 2**: x402 micropayments, Launchtube relay, Mercury/Galexie indexer, Soroswap DEX integration, Blend lending, push notifications
- **Phishing / Social Engineering** attacks against team members
- **Denial of Service** via ledger spam or resource exhaustion (Soroban gas limits are by design)
- **Third-Party Dependencies**: Vulnerabilities in upstream dependencies (Soroban SDK, snarkjs, circomlib, etc.) — report to the respective project
- **Testnet-Only Risks**: Since Noctis operates exclusively on Stellar Testnet, no real funds are at risk. Reports demonstrating testnet-only impact with no mainnet applicability may be ineligible.

## Bug Bounty Program

Noctis operates a paid bug bounty program. See the full specification at:

👉 **[security/bug_bounty_program.md](security/bug_bounty_program.md)**

**Payout ranges** (subject to budget allocation):

| Severity | Range |
|----------|-------|
| Critical | $25,000 – $50,000 |
| High     | $10,000 – $25,000 |
| Medium   | $2,000 – $10,000  |
| Low      | $500 – $2,000     |

## Recognition Program (Hall of Fame)

Researchers who submit valid, qualifying vulnerabilities will be:

- Listed in the Noctis Security Hall of Fame (with permission)
- Credited in release announcements for significant findings
- Eligible for priority access to future bug bounty program expansions

To opt out of recognition, please indicate in your report.

---

**Last Updated:** May 28, 2026  
**Contact:** security@noctis.finance
