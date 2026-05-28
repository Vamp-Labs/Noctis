# Noctis: Privacy-First Global Payroll on Stellar

Welcome to the Noctis smart contract repository. This is the core infrastructure for the Stellar Testnet MVP of Noctis — a privacy-first, enterprise-grade payroll platform.

## 📋 Project Overview

Noctis combines **Groth16 zero-knowledge proofs**, **per-second payment streaming**, **yield routing**, and **passkey authentication** to deliver a privacy-preserving payroll solution on Stellar.

**Key Characteristics:**
- ✅ **Testnet-Only**: All development and demonstration on Stellar Testnet (Protocol 26 "Yardstick")
- ✅ **Non-Custodial**: No company holds funds; funds stream directly to employees
- ✅ **Private**: ZK proofs hide salary amounts and recipient addresses
- ✅ **Fast**: Stellar's 3–5 second finality with per-second streaming
- ✅ **Yield-Bearing**: Idle capital auto-routed to Blend/Soroswap for APY
- ✅ **Passkey Auth**: WebAuthn (secp256r1 / CAP-0051) — no seed phrases

## 📦 Smart Contracts

| Contract | Purpose | Status |
|----------|---------|--------|
| **payroll_dispatcher** | ZK batch payroll entry point | ✅ Implemented (893 lines, 11 tests) |
| **streaming_vault** | Per-second payment streaming | ✅ Implemented (717 lines, 7 tests) |
| **wallet_factory** | Passkey-authenticated smart wallets (SEP-45) | ✅ Implemented (~500 lines, 8 tests) |
| **yield_router** | Blend/Soroswap yield routing | ✅ Implemented (718 lines, 10 tests) |
| **policy_signer** | Policy-enforced authorization & spending limits | ✅ Implemented (~400 lines, 6 tests) |

## 🚀 Quick Start

### Prerequisites

- **Rust** 1.70+ with `wasm32-unknown-unknown` target
- **Soroban CLI** v26.0.0+
- **Git**

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/noctis.git
cd noctis

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add wasm target
rustup target add wasm32-unknown-unknown

# Verify versions
rustc --version  # Should be 1.70+
cargo --version  # Should be 1.70+
```

### Build All Contracts

```bash
# Debug build
cargo build

# Release build (optimized for Soroban deployment)
cargo build --release

# Build specific contract
cargo build -p payroll_dispatcher --release
```

### Run Tests

```bash
# Run all unit tests
cargo test

# Run tests for a specific contract
cargo test -p streaming_vault

# Run with verbose output
cargo test -- --nocapture
```

### Check Code Quality

```bash
# Format code
cargo fmt

# Check formatting
cargo fmt -- --check

# Run linter (clippy)
cargo clippy --all-targets --all-features

# Security audit
cargo audit
```

## 📁 Project Structure

```
noctis/
├── Cargo.toml                          # Workspace configuration
├── README.md                           # This file
├── .github/
│   └── workflows/
│       └── build.yml                   # GitHub Actions CI pipeline
└── crates/
    ├── payroll_dispatcher/
    │   ├── Cargo.toml
    │   └── src/
    │       ├── lib.rs                  # Contract implementation
    │       └── tests.rs                # Unit tests
    ├── streaming_vault/
    │   ├── Cargo.toml
    │   └── src/
    │       ├── lib.rs
    │       └── tests.rs
    ├── wallet_factory/
    │   ├── Cargo.toml
    │   └── src/
    │       ├── lib.rs
    │       └── tests.rs
    ├── yield_router/
    │   ├── Cargo.toml
    │   └── src/
    │       ├── lib.rs
    │       └── tests.rs
    └── policy_signer/
        ├── Cargo.toml
        └── src/
            ├── lib.rs
            └── tests.rs
```

## 🔧 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Implement Contract Logic

Edit the relevant contract file in `crates/*/src/lib.rs`.

### 3. Write Tests

Add tests in the `#[cfg(test)]` module of each contract.

### 4. Verify Compilation

```bash
cargo build --all
cargo test --all
```

### 5. Check Code Quality

```bash
cargo fmt
cargo clippy
```

### 6. Commit & Push

```bash
git add .
git commit -m "feat(payroll_dispatcher): add batch processing logic"
git push origin feature/your-feature-name
```

## 📜 Contract Specifications

### payroll_dispatcher.rs

**Key Functions:**
- `process_batch(batch_root: [u8; 32])` — Process a batch of payments
- `submit_proof(proof: [u8; 192])` — Submit Groth16 ZK proof
- `verify_nullifier(nullifier: [u8; 32])` → bool — Replay attack prevention

**State:**
- `owner` — Contract deployer
- `batch_root` — Current Merkle root
- `nullifier_set` — Used nullifiers for replay prevention

**Events:**
- `BatchProcessed` — Emitted when batch is successfully processed
- `ProofSubmitted` — Emitted when ZK proof is verified

---

### streaming_vault.rs

**Key Functions:**
- `create_stream(recipient, amount_per_second, total_amount)` — Create a payment stream
- `withdraw(stream_id)` → amount — Withdraw accrued payments
- `cancel_stream(stream_id)` — Cancel an active stream

**State:**
- `streams` — Active stream configurations
- `balances` — Per-account balances
- `stream_metadata` — Stream creation timestamps and status

**Events:**
- `StreamCreated` — Emitted on stream creation
- `Withdrawn` — Emitted on successful withdrawal
- `StreamCancelled` — Emitted when stream is cancelled

---

### wallet_factory.rs

**Key Functions:**
- `create_wallet(owner, passkey_pubkey)` → address — Deploy smart wallet
- `get_wallet(owner)` → address — Retrieve wallet address
- `verify_signature(wallet, message, signature)` → bool — Verify secp256r1 signature

**State:**
- `wallets` — Owner → Wallet address mapping
- `passkey_pubkeys` — Wallet → Public key mapping

**Events:**
- `WalletCreated` — Emitted on wallet deployment

**Standards Compliance:**
- SEP-45 (WebAuthn Smart Wallets)
- CAP-0051 (secp256r1 signatures)

---

### yield_router.rs

**Key Functions:**
- `route_yield(token, amount, yield_source)` — Route capital to Blend/Soroswap
- `get_yield_rate(yield_source)` → rate — Query current APY
- `update_rate(yield_source, new_rate)` — Update rate (admin only)

**State:**
- `yield_sources` — Active yield destination configurations
- `rates` — Current APY per source (basis points)
- `accumulated_yield` — Earned yield per token/source

**Events:**
- `YieldRouted` — Emitted when capital is routed
- `RateUpdated` — Emitted when yield rate changes

---

### policy_signer.rs

**Key Functions:**
- `sign_policy(policy_id, signer, policy_data)` — Authorize a policy
- `verify_policy(policy_id, amount)` → bool — Check policy constraints
- `revoke_policy(policy_id)` — Revoke a policy

**State:**
- `policies` — Active policies and constraints
- `signers` — Authorized signers per policy
- `policy_metadata` — Creation time, status, type

**Events:**
- `PolicySigned` — Emitted on policy authorization
- `PolicyRevoked` — Emitted when policy is revoked

**Use Cases:**
- Spending limits (e.g., max $10k/day)
- Timelocks (e.g., funds released after 7 days)
- Multi-sig thresholds (e.g., 2-of-3 approval)
- Allow-lists (e.g., approved recipients)
- AI agent safety constraints

## 🧪 Testing

All contracts include basic unit tests. These compile and pass but are placeholder stubs for the skeleton phase.

```bash
# Run all tests
cargo test --all

# Run specific contract tests
cargo test -p payroll_dispatcher

# Run with logging
RUST_LOG=debug cargo test -- --nocapture
```

**Current Test Status:**
- ✅ **42 tests across 5 contracts** (all passing, zero warnings)
- ✅ `cargo audit` — zero vulnerabilities
- ✅ WASM builds verified (all < 17 KB each)
- ⚠️ Internal audit (SEC-001) — 8 findings: 5 fixed, 3 acknowledged (ZK proof stub #1 open item)
- 🚧 Integration/E2E tests on testnet — in progress

## 🔐 Security

### Audit Checklist
- [ ] Nullifier uniqueness validation (replay prevention)
- [ ] Signature verification (secp256r1)
- [ ] Spend limit enforcement (policy signer)
- [ ] ZK proof soundness (Groth16 BLS12-381)
- [ ] Access control (admin/owner functions)
- [ ] Integer overflow/underflow protection
- [ ] Reentrancy prevention

### Known Limitations (MVP Testnet)
- ZK proof verification is a **stub** — format check only, no actual BLS12-381 Groth16 pairing
- Yield routing is **simulated** — `deposit_to_source` is a no-op (MVP simplification)
- Powers of Tau ceremony is local (production requires MPC)
- No formal verification; testnet demonstration only
- **⚠️ TESTNET ONLY** — no mainnet deployment. Hardcoded network guard prevents mainnet use.

## 📦 Deployment

### Testnet Deployment (Future)

```bash
# Set Soroban CLI network
soroban network add --rpc-url https://soroban-testnet.stellar.org testnet

# Deploy contract
soroban contract deploy --network testnet \
  --wasm target/wasm32-unknown-unknown/release/payroll_dispatcher.wasm

# Initialize contract
soroban contract invoke --network testnet --id <CONTRACT_ID> \
  -- init_contract --owner <OWNER_ADDRESS>
```

### Local Development

```bash
# Start a local Soroban instance
soroban network start local

# Deploy to local
soroban contract deploy --network local \
  --wasm target/wasm32-unknown-unknown/release/payroll_dispatcher.wasm
```

## 📚 Documentation

- **[Protocol 26 Impact Analysis](/.planning/protocol_26_impact.md)** — CAP-81 optimizations, gas estimates
- **[Groth16 ZK Circuit Design](/.planning/zk_circuit_spec.md)** — Circuit logic, soundness
- **[Stellar RPC Migration Guide](/.planning/rpc_migration_guide.md)** — Horizon → RPC
- **[SEP Standards Compliance Matrix](/.planning/sep_standards_matrix.md)** — SEP-41, SEP-45, SEP-8
- **[Task Handoff Document](./.planning/TASK_HANDOFF.md)** — Full 10-milestone roadmap

## 🔗 Resources

- **Soroban Documentation**: [soroban.stellar.org](https://soroban.stellar.org)
- **Stellar SDK Docs**: [stellar.org/developers](https://stellar.org/developers)
- **Soroban Rust SDK**: [docs.rs/soroban-sdk](https://docs.rs/soroban-sdk)
- **GitHub Issues**: Report bugs or feature requests in Issues

## 👥 Contributing

### Code Style
- Follow Rust naming conventions (snake_case for functions, PascalCase for types)
- Use `cargo fmt` before commit
- Run `cargo clippy` and fix all warnings
- Add doc comments for public functions

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

Examples:
- `feat(payroll_dispatcher): implement batch processing`
- `fix(streaming_vault): correct accrual calculation`
- `docs: update contract specifications`
- `test: add edge case tests for nullifier verification`

### Pull Request Process
1. Create feature branch: `git checkout -b feature/name`
2. Make changes and commit
3. Push to remote: `git push origin feature/name`
4. Open PR with description
5. Ensure CI passes (GitHub Actions)
6. Request review from team
7. Merge once approved

## ⚠️ Important Notes

### Testnet-Only Scope
**This project is exclusively for testnet demonstration. No code shall be deployed to Stellar Mainnet without explicit authorization and security audit.**

### Compiler Warnings
All contracts must compile with **zero warnings**. Run:
```bash
cargo build --all 2>&1 | grep -i warning
```

If any warnings appear, fix before committing.

### Soroban SDK Version
All contracts use **soroban-sdk v26.0.0** (May 2026 release).

Constraints:
- Protocol 26 "Yardstick" on Testnet
- stellar-xdr v26.0.1
- soroban-env-common/guest/host v26.1.3

If SDK version changes, update `Cargo.toml` workspace dependencies.

## 🐛 Troubleshooting

### Build Errors

**Error:** `error: linker 'cc' not found`
```bash
# Install build essentials
sudo apt-get install build-essential
```

**Error:** `error: could not find 'wasm32-unknown-unknown' target`
```bash
rustup target add wasm32-unknown-unknown
```

**Error:** `cannot find crate soroban_sdk`
```bash
# Ensure workspace dependencies are properly resolved
cargo update
cargo build
```

### Test Failures

**All placeholder tests should pass.** If tests fail:
1. Check Rust version: `rustc --version` (should be 1.70+)
2. Clean build: `cargo clean && cargo build`
3. Check imports in test files

### Performance Issues

If compilation is slow:
```bash
# Use sccache for incremental builds
cargo install sccache
export RUSTC_WRAPPER=sccache

# Rebuild
cargo build --release
```

## 📝 License

This project is proprietary. Internal use only.

## 🤝 Support

For questions or issues:
1. Check existing GitHub Issues
2. Post to team Slack (#noctis-dev)
3. Contact PM (@PM) or Tech Lead (@TechLead)

---

**Last Updated:** May 28, 2026  
**Status:** All 5 contracts implemented with 42 tests — focus: testnet-only development  
**Network:** ⚠️ Stellar Testnet (Protocol 26 "Yardstick") — NO mainnet  
**Next Steps:** Continue testnet iteration — fix remaining findings, integration testing, frontend polish
