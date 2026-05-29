# Noctis: Privacy-First Global Payroll on Stellar
<img width="300" height="300" alt="Noctis" src="https://github.com/user-attachments/assets/242845a3-a90b-4f7c-9a3d-13e535e54a2d" />

**Live Demo:** [https://frontend-mbpksm4c5-candras-projects.vercel.app](https://frontend-mbpksm4c5-candras-projects.vercel.app)  
**Network:** Stellar Testnet (Protocol 26 "Yardstick")  

Welcome to Noctis — a privacy-first, enterprise-grade payroll platform built natively on Stellar. Noctis combines **Groth16 zero-knowledge proofs**, **per-second payment streaming**, **Blend yield routing**, and **passkey authentication** to deliver private, real-time global payroll.

---

## 🌐 Live Deployment

| Layer | URL / Address | Status |
|-------|--------------|--------|
| **Frontend (Vercel)** | [https://frontend-mbpksm4c5-candras-projects.vercel.app](https://frontend-mbpksm4c5-candras-projects.vercel.app) | ✅ Live |
| **x402 API** | `POST /api/x402/salary` | ✅ Live |

---

## 📋 Smart Contracts (Deployed on Testnet)

| Contract | Address | Functions | Status |
|----------|---------|-----------|--------|
| **Payroll Dispatcher** | `CDP36DTJD22K3MHBPS7YF724S4H4ZB6OAX3W4UYXFQ35AE62S4EHR4LF` | `configure`, `process_batch`, `set_verification_key`, `verify_zk_proof_internal`, `claim_stream`, `pause`, `unpause` | ✅ Deployed & Verified (11 tests) |
| **Streaming Vault** | `CCR6YESUPNGSTDU2JNP5AG5HJ6PZLHC6RUVRHRBK44PDAZO5EUQLE3E3` | `create_stream`, `claim_stream`, `cancel_stream`, `get_accrued_amount`, `pause_stream`, `resume_stream`, `pause`, `unpause` | ✅ Deployed & Verified (6 tests) |
| **Wallet Factory** | `CA5KLXL6T2PLD4OVEVVG3QS5B7NQ3S7BGATNNCKD2R6TK2Y724K434SQ` | `create_wallet`, `add_passkey`, `remove_passkey`, `get_wallet`, `verify_signature`, `pause`, `unpause` | ✅ Deployed & Verified (8 tests) |
| **Yield Router** | `CBFWLCN5XTFZHCJGWNIBSMMB3M5SMFAYHTCOGHWBY2SSXSK5XEE5Q7KB` | `register_source`, `route_yield`, `withdraw_yield`, `get_yield_rate`, `set_yield_split`, `register_source_with_strategy`, `get_source_strategy`, `collect_employee_bonus`, `pause`, `unpause` | ✅ Deployed & Verified (10 tests) |
| **Policy Signer** | `CCQTEQOHLRV4IR5HZ6WXRFSPC2KUUWC3YJOFPABUBN5PY5NZ5HEGM5RI` | `create_policy`, `revoke_policy`, `verify_policy`, `get_policy`, `get_employer_policies`, `is_policy_active` | ✅ Deployed & Verified (7 tests) |

**Test Token (NOCTIS):** `CDMM3QPRZKQDOXSG3BJMXLBXVYAVAN5NGUJOVVXDEGB4YHNU44V54OYI`

---

## ✅ What Works (E2E Verified on Live Testnet)

```
PHASE  1: Account funding via Friendbot        ✅
PHASE  2: Initial state verification           ✅
PHASE  3: Token minting (NOCTIS SAC)           ✅
PHASE  4: Contract configuration               ✅
PHASE  5: Yield router setup                   ✅
PHASE  6: Wallet creation (employer + employee)✅
PHASE  7: Spending policy creation             ✅
PHASE  8: Payroll batch with Groth16 proof     ✅
PHASE  9: Stream claiming from dispatcher      ✅
PHASE 10: Stream create/accrue/claim/cancel    ✅
PHASE 11: Yield routing verification           ✅
PHASE 12: Policy enforcement                   ✅
```

**All 42/42 unit tests passing. All 12/12 E2E integration tests passing on live testnet.**

---

## 🚀 Quick Start

### Prerequisites
- **Rust** 1.70+ with `wasm32v1-none` target
- **Stellar CLI** v26.0.0+
- **Node.js** 20+ (for frontend)
- **Git**

### Setup

```bash
git clone https://github.com/Vamp-Labs/Noctis.git
cd Noctis

# Install Rust target
rustup target add wasm32v1-none
```

### Build & Test Contracts

```bash
# Build all contracts
stellar contract build

# Run all unit tests
cargo test --workspace

# Run E2E integration tests (requires testnet access)
npx tsx tests/e2e-testnet.ts
```

### Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
noctis/
├── crates/
│   ├── payroll_dispatcher/   # ZK batch payroll + Groth16 BLS12-381 verification
│   ├── streaming_vault/      # Per-second payment streaming
│   ├── wallet_factory/       # Passkey smart wallet deployment (SEP-45)
│   ├── yield_router/         # Yield routing + Blend cross-contract integration
│   └── policy_signer/        # Spending policies / authorization
├── circuits/
│   ├── payroll_circuit.circom       # 100-recipient Groth16 circuit
│   ├── payroll_circuit_dev.circom   # 2-recipient dev circuit
│   ├── build.sh                     # Full build script
│   └── build-dev.sh                 # Fast dev build script
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── employer/            # Employer dashboard (CSV, policy, APY)
│   │   │   ├── employee/            # Employee portal (claim, notifications)
│   │   │   └── api/x402/            # x402 micropayment endpoint
│   │   ├── lib/
│   │   │   ├── zk.ts                # ZK proof generation (Poseidon, snarkjs)
│   │   │   ├── stellar.ts           # Network guard + Freighter helpers
│   │   │   ├── x402/                # x402 client/server
│   │   │   ├── mpp/                 # MPP streaming channels
│   │   │   ├── relayer/             # OpenZeppelin Relayer client
│   │   │   ├── mercury/             # Mercury indexer client
│   │   │   └── hooks/useWallet.ts   # Passkey + session management
│   │   └── components/NotificationToast.tsx
│   ├── public/circuits/             # Circuit WASM/ZKEY artifacts
│   └── vercel.json                  # Vercel deployment config
├── refs/
│   ├── bls12_381_soroban_api.md     # BLS12-381 host function reference
│   ├── testnet_defi_integration.md  # Blend/Soroswap testnet addresses
│   ├── x402_mpp_research.md         # x402/MPP spec research
│   ├── testnet_services_config.md   # Relayer/Mercury/Launchtube config
│   └── sep_compliance.md            # SEP compliance matrix
├── security/
│   ├── bug_bounty_program.md        # Bug bounty program spec
│   └── vulnerability_triage_sop.md  # Vulnerability handling SOP
├── monitoring/
│   ├── prometheus/                  # Prometheus scrape config
│   └── grafana/                     # Grafana dashboards (12-panel)
├── scripts/
│   ├── deploy-and-configure.ts      # Automated contract deployment
│   └── health-check.ts              # CLI health check tool
├── .github/workflows/
│   ├── ci.yml                       # CI: tests + build
│   ├── deploy.yml                   # CD: auto-deploy on tag
│   └── circuits-full-build.yml      # Full circuit build workflow
├── tests/e2e-testnet.ts             # 12-phase E2E integration test suite
└── .env.testnet                     # Testnet configuration
```

---

## 🔧 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Network | Stellar Testnet | Protocol 26 "Yardstick" |
| Smart Contracts | Soroban (Rust) | soroban-sdk v26.0.0 |
| JS SDK | @stellar/stellar-sdk | v14.6.1 |
| Frontend | Next.js 15 + Tailwind 4 | React 19 |
| ZK Proofs | Groth16 over BLS12-381 | Protocol 25 X-Ray host functions |
| Circuit | Circom + snarkjs | Powers of Tau ceremony |
| Yield | Blend Protocol | Cross-contract integration |
| Micropayments | x402 (Coinbase) + MPP (Stripe/Tempo) | Stellar testnet |
| Indexing | Mercury / Galexie | GraphQL + WebSocket |
| Wallet Auth | Passkey Kit + WebAuthn | secp256r1 (CAP-0051 / SEP-45) |
| Deployment | Vercel | Serverless Next.js |
| CI/CD | GitHub Actions | Build → Test → Deploy |
| Monitoring | Prometheus + Grafana | Docker Compose |

---

## 🧪 Testing

```bash
# Run all contract unit tests
cargo test --workspace

# Run E2E integration test on testnet
npx tsx tests/e2e-testnet.ts

# Run frontend build check
cd frontend && npm run build
```

**Current Test Status:**
- ✅ **42 unit tests** across 5 contracts (all passing)
- ✅ **12 E2E integration tests** on live testnet (all passing)
- ✅ `cargo audit` — zero vulnerabilities
- ✅ WASM builds verified (all < 22 KB each)
- ✅ `cargo clippy` — zero warnings

---

## 📜 Contract Specifications

### Payroll Dispatcher
**Core functions:** `configure`, `process_batch`, `set_verification_key`, `verify_zk_proof_internal`, `claim_stream`, `get_batch`, `get_batch_count`, `get_trusted_setup_hash`, `pause`, `unpause`

**ZK Privacy Model:**
- **Public on ledger:** Employer address, total batch amount, proof validity, nullifier hashes
- **Hidden:** Individual recipient addresses, individual payment amounts
- **Proof system:** Groth16 zk-SNARK over BLS12-381 (Protocol 25 X-Ray host functions)
- **Circuit:** 100-recipient Merkle tree commitment with Poseidon hashing
- **Nullifiers:** Prevent replay/double-payment without revealing who was paid

### Streaming Vault
Per-second payment streaming. Employer deposits total salary, contract unlocks tokens linearly over time.

**Key functions:** `create_stream`, `claim_stream`, `cancel_stream`, `get_accrued_amount`, `pause_stream`, `resume_stream`

### Wallet Factory
Passkey-authenticated smart wallets (SEP-45 / CAP-0051 secp256r1 signatures).

**Key functions:** `create_wallet`, `add_passkey`, `remove_passkey`, `get_wallet`, `verify_signature`

### Yield Router
Auto-deposits idle payroll capital into Blend Protocol lending pools.

**Key functions:** `register_source`, `register_source_with_strategy`, `route_yield`, `withdraw_yield`, `get_yield_rate`, `get_source_strategy`, `set_yield_split`, `collect_employee_bonus`

**Yield Sources:**
- `DirectHold` — Simple in-contract holding (default)
- `BlendProtocol` — Cross-contract deposit to Blend testnet pools

**Yield Split:** 80% employer / 15% employee bonus pool / 5% protocol fee

### Policy Signer
Composable authorization modules for spending limits, allow-lists, timelocks, and multi-sig thresholds.

**Key functions:** `create_policy`, `verify_policy`, `revoke_policy`, `get_policy`, `get_employer_policies`, `is_policy_active`

---

## 🔐 Security

- **Re-entrancy:** Soroban contracts are inherently re-entrancy safe
- **Integer Overflow:** Rust i128 with overflow checks; `overflow-checks = true` in release profile
- **Access Control:** All privileged functions gated by `Address::require_auth()`
- **Nullifier Set:** On-chain storage prevents replay attacks
- **Network Guard:** Frontend hard-rejects any non-testnet passphrase
- **Internal Audit (SEC-001):** Completed — 8 findings, 5 fixed, 3 acknowledged
- **Bug Bounty:** Program spec published — Immunefi recommended

---

## 🌐 Testnet Deployment

### Contract Admin
- **Deployer:** `passkeygate-deployer` (`GAF2H3QXICU7SSUULCATGNE2THH2A6MREUZUDBDWSNBADCCGOMGBWETH`)
- **Token Admin:** `local-deployer` (`GDTJ5ITQCKMEI7QZSBCYQA5FMNCKCAFTXTMN44CLJ5BITU5R4T53XQQX`)

### Deploy Commands
```bash
stellar contract deploy --wasm <WASM> --source-account passkeygate-deployer \
  --network testnet -- --admin <ADMIN_ADDRESS>
```

### Configure Commands
```bash
# Configure payroll dispatcher
stellar contract invoke --id <DISPATCHER_ID> --source-account passkeygate-deployer \
  --network testnet -- configure --token <TOKEN> --trusted_setup_hash <HASH>

# Set verification key (Groth16)
stellar contract invoke --id <DISPATCHER_ID> --source-account passkeygate-deployer \
  --network testnet -- set_verification_key \
  --alpha <96_HEX> --beta <192_HEX> --gamma <192_HEX> --delta <192_HEX> \
  --ic "[<96_HEX>,<96_HEX>]"
```

---

## 📚 Documentation

| Document | Location |
|----------|----------|
| Product Requirements | `PRD.md` |
| PRD Sync (May 29) | `.planning/PRD_SYNC_MAY29.md` |
| PM Gap Analysis | `.planning/PM_GAP_ANALYSIS_MAY28.md` |
| BLS12-381 API Reference | `refs/bls12_381_soroban_api.md` |
| Testnet DeFi Integration | `refs/testnet_defi_integration.md` |
| x402/MPP Research | `refs/x402_mpp_research.md` |
| Services Config | `refs/testnet_services_config.md` |
| SEP Compliance Matrix | `refs/sep_compliance.md` |
| Bug Bounty Program | `security/bug_bounty_program.md` |
| Vulnerability Triage SOP | `security/vulnerability_triage_sop.md` |
| Sprint 4 Plan | `.planning/SPRINT_4_POLISH_AUDIT_PRODUCTION.md` |

---

## 🔗 Resources

- **Live Frontend:** [https://frontend-mbpksm4c5-candras-projects.vercel.app](https://frontend-mbpksm4c5-candras-projects.vercel.app)
- **Soroban Documentation:** [soroban.stellar.org](https://soroban.stellar.org)
- **Stellar SDK Docs:** [stellar.org/developers](https://stellar.org/developers)
- **Soroban Rust SDK:** [docs.rs/soroban-sdk](https://docs.rs/soroban-sdk)
- **Testnet Explorer:** [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)

---

## ⚠️ Important Notes

- **Testnet Only:** This project is exclusively for testnet demonstration. Network guard prevents mainnet use.
- **Soroban SDK v26.0.0:** Protocol 26 "Yardstick" — stellar-xdr v26.0.1, soroban-env v26.1.3
- **Zero Compiler Warnings:** All contracts compile with `cargo clippy` — zero warnings enforced

---

**Last Updated:** May 29, 2026  
**Status:** ✅ All contracts deployed and E2E verified on Stellar Testnet. Frontend live on Vercel.  
**Next:** External audit engagement (SEC-002), governance fee proposal (GOV-001), developer docs (DOC-001)
