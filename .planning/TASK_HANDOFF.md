# 🚀 NOCTIS TASK HANDOFF DOCUMENT
## Privacy-First Global Payroll on Stellar

**Project:** Noctis v1.0 Hackathon MVP  
**Network:** Stellar Testnet (Protocol 26 "Yardstick")  
**Date Generated:** May 27, 2026  
**Document Status:** Ready for Execution  

---

## 📋 EXECUTIVE SUMMARY

**Project Vision:** Enterprise-grade payroll platform on Stellar combining Groth16 ZK privacy, per-second streaming payments, yield routing on idle capital, and passkey authentication — all on testnet only.

**10 Development Milestones:**
- M1: Testnet Setup (Protocol 26 + RPC)
- M2: Smart Wallets (Passkey Kit + secp256r1)
- M3: Core Payroll Contract (ZK Dispatcher)
- M4: ZK Proof Integration (Groth16 verification)
- M5: Payment Streaming (Streaming Vault)
- M6: x402 Micropayments (HTTP 402 flow)
- M7: Yield Routing (Blend + Soroswap)
- M8: Employee Portal (Passkey login + claim)
- M9: Employer Dashboard (CSV upload + batch)
- M10: Demo Day Ready (End-to-end polish)

**Critical Constraints:**
- ⚠️ TESTNET ONLY — No mainnet deployment
- ⚠️ Local Powers of Tau ceremony (production: MPC required)
- ⚠️ Protocol 26 only, Stellar RPC only (Horizon deprecated)
- ⚠️ soroban-sdk v26.0.0, @stellar/stellar-sdk v14.6.1

---

## 🏗️ FEATURE-TO-AGENT MAPPING

| Epic | Feature | Primary Agent | Secondary Agent | Priority | Dependencies |
|------|---------|---------------|-----------------|----------|--------------|
| Smart Wallets | Passkey registration + secp256r1 auth | 🛠️ Developer | 🔍 Research | **Critical** | None |
| ZK Payroll | Dispatcher contract + Groth16 verification | 🛠️ Developer | 🔍 Research | **Critical** | M1 |
| Streaming | Streaming Vault contract + per-sec accrual | 🛠️ Developer | 🔍 Research | **High** | M3 |
| Yield Routing | Blend/Soroswap auto-deposit + APY oracle | 🛠️ Developer | 🔍 Research | **High** | M5 |
| x402 Protocol | HTTP 402 gating + Coinbase facilitator | 🛠️ Developer | 🔍 Research | **Medium** | M6 |
| Employee Portal | Passkey login + claim + history | 🛠️ Developer | 🔍 Research | **High** | M8 |
| Employer Dashboard | CSV parse + batch approve UI | 🛠️ Developer | 🔍 Research | **High** | M9 |
| SEP Compliance | SEP-41, SEP-45, SEP-8 integration | 🛠️ Developer | 🔍 Research | **Medium** | M3 |

---

# 👥 AGENT TASK ASSIGNMENTS

## RESEARCH AGENT TASKS (RES-###)

### RES-001: Protocol 26 Yardstick Impact Analysis
**Lane:** Research  
**Epic:** Testnet Setup  
**Web3 Context:** Stellar Protocol 26 "Yardstick", CAP-81 Eviction Rewrite, soroban-sdk v26.0.0  
**Description:**
Analyze and document Protocol 26's impact on Noctis architecture:
- CAP-81 eviction optimization: faster state evictions, fewer disk reads
- Protocol-level config granularity for per-contract resource limits
- Impact on ZK-heavy workloads (payroll dispatcher efficiency)
- soroban-sdk v26.0.0 release notes: error-returning codegen, stellar-xdr v26.0.1
- Benchmark: estimate gas costs for 10-recipient ZK batch vs. non-ZK

**Acceptance Criteria:**
- [ ] Document: "protocol_26_impact.md" with efficiency gains quantified
- [ ] Identify which Noctis contracts benefit most from CAP-81 optimization
- [ ] Provide gas cost estimates for payroll_dispatcher.batch_pay() with ≥10 recipients
- [ ] Note any breaking changes from Protocol 25 to Protocol 26 that affect existing code

**Dependencies:** NONE  
**Priority:** Critical  
**Estimated Effort:** S

**Handoff Notes:**
Developer will use this document to baseline gas costs and optimize contract logic around CAP-81 features. Focus on how eviction rewrite impacts nullifier storage and state caching.

---

### RES-002: Groth16 ZK Circuit Design & Powers of Tau Setup
**Lane:** Research  
**Epic:** ZK Payroll  
**Web3 Context:** BLS12-381, Groth16 zk-SNARKs, Protocol 25 X-Ray host functions, circom circuit  
**Description:**
Design the Groth16 ZK circuit that proves payroll batch validity:
1. Circuit logic: Merkle tree membership proof for each payment leaf
2. Constraint: sum of amounts = batch total (prevent inflation)
3. Private signals: recipient_address, amount, recipient_key (hidden)
4. Public signals: commitment_root, nullifier[], batch_total, zk_proof
5. Generate local Powers of Tau ceremony (ptau) file for testnet
6. Document circuit security assumptions and soundness bounds
7. Research production MPC ceremony requirements (future roadmap)

**Acceptance Criteria:**
- [ ] Circom circuit file: "payroll_circuit.circom" with ≥3 test vectors passing
- [ ] Powers of Tau file generated locally: "payroll_pTau_14.ptau" (constraint system ~ 2^14)
- [ ] Circuit compilation: wasm + wasm_cpp outputs verified
- [ ] Document: "zk_circuit_spec.md" explaining constraints, soundness, and circom syntax
- [ ] Identify any performance bottlenecks in proof generation (witness time, proof size)

**Dependencies:** NONE  
**Priority:** Critical  
**Estimated Effort:** L

**Handoff Notes:**
Developer will import compiled circuit into snarkjs. Key concern: proof generation time on client (browser) must be <5sec per batch. Circuit must support variable recipient count (10, 50, 100 recipients). Test circom syntax for proper zero-knowledge properties; work with Developer on client-side witness generation.

---

### RES-003: Stellar RPC vs Horizon Migration Guide
**Lane:** Research  
**Epic:** Testnet Setup  
**Web3 Context:** Stellar RPC (soroban-testnet.stellar.org), Horizon (deprecated), @stellar/stellar-sdk v14.6.1  
**Description:**
Create detailed migration guide from deprecated Horizon to Stellar RPC:
1. Identify all Horizon API endpoints used in legacy Noctis code (if any)
2. Map each endpoint to RPC equivalent:
   - getAccount() → server.getAccount()
   - getLatestLedger() → server.getLatestLedger()
   - simulateTransaction() → server.simulateTransaction()
   - submitTransaction() → server.submitTransaction()
3. Document breaking changes (response schema differences)
4. Create code snippet examples for common queries
5. Audit for Horizon-only features (e.g., stream API) with workarounds
6. Performance comparison: Horizon latency vs RPC latency

**Acceptance Criteria:**
- [ ] Migration guide: "rpc_migration_guide.md" with complete endpoint mapping
- [ ] Code snippets for: account lookup, tx simulation, tx submission, event indexing
- [ ] Zero Horizon API calls in final Noctis codebase (audit checklist)
- [ ] Confirmed RPC endpoints are live on testnet and responding

**Dependencies:** NONE  
**Priority:** Critical  
**Estimated Effort:** M

**Handoff Notes:**
Developer will use this to rewrite all backend API calls. Critical: RPC has different error response formats than Horizon — ensure error handling is updated. Also note that Mercury Indexer is the recommended replacement for Horizon streams (private event indexing).

---

### RES-004: SEP Standards Compliance Matrix
**Lane:** Research  
**Epic:** SEP Compliance  
**Web3 Context:** SEP-41 (Token Interface), SEP-45 (WebAuthn Smart Wallets), SEP-8 (Regulated Assets), SEP-10, SEP-24, SEP-31  
**Description:**
Map Noctis requirements to SEP standards and create compliance checklist:
1. **SEP-41 (Token Interface):** All Noctis payroll tokens (USDC, EURC, etc.)
   - Required: balanceOf(), transfer(), approve(), transferFrom()
   - Verify Circle SAC tokens implement SEP-41 fully
2. **SEP-45 (WebAuthn Smart Wallets):** Passkey Kit + secp256r1 contract accounts
   - Required: __check_auth() implementation in wallet_factory.rs
   - Verify CAP-0051 secp256r1 support on Protocol 26
   - Track SEP-45 discussion for breaking changes
3. **SEP-8 (Regulated Assets):** Optional for MVP, required for Phase 2
   - Document: AUTH_REQUIRED flag, clawback mechanism, callbacks
   - Prepare endpoint specs for future integration
4. **SEP-10, SEP-24, SEP-31:** Planned features (post-hackathon)
   - Document: API requirements and implementation timeline

**Acceptance Criteria:**
- [ ] SEP compliance matrix: "sep_standards_matrix.md" with status (Required/Optional/Planned)
- [ ] SEP-41 audit: verify all payroll tokens implement required functions
- [ ] SEP-45 audit: confirm __check_auth() secp256r1 signature verification
- [ ] SEP-8 spec draft: for Phase 2 integration (not implemented in MVP)
- [ ] No SEP violations block testnet launch (all Required = Implemented)

**Dependencies:** NONE  
**Priority:** High  
**Estimated Effort:** M

**Handoff Notes:**
Developer will use this matrix to ensure all token operations and wallet auth use SEP-standard interfaces. SEP-45 is actively evolving; flag any incompatibilities with latest discussion thread (stellar/stellar-protocol #1499).

---

### RES-005: Competitive Differentiation & Unique Value Prop
**Lane:** Research  
**Epic:** Strategy  
**Web3 Context:** Stellar ZK (Protocol 25 X-Ray), x402 + MPP agentic protocols, payroll streaming  
**Description:**
Research and document Noctis's competitive advantages:
1. **vs. PayZoll (ref: hackathon 1st place):**
   - Noctis adds: Groth16 ZK hides amounts (PayZoll amount-visible)
   - Yield generation on idle capital (PayZoll: no yield routing)
   - x402 + MPP integration (PayZoll: no API metering or agentic payments)
2. **vs. Traditional Crypto Payroll (Coinbase Commerce, Deel, etc.):**
   - Non-custodial architecture (vs. Coinbase/Deel custodial)
   - Native privacy via ZK (vs. transparent blockchain)
   - Streaming per-second (vs. batch-only or scheduled)
   - Passkey/secp256r1 (vs. seed phrases)
3. **Unique stack leverage:**
   - First hackathon project using Protocol 25 X-Ray native ZK for payroll
   - Built on Protocol 26 Yardstick (latest, most efficient)
   - Combines two agentic protocols (x402 + MPP) in one platform
   - Demonstrates Stellar's enterprise-grade payroll capabilities

**Acceptance Criteria:**
- [ ] Competitive analysis doc: "competitive_positioning.md"
- [ ] 3-5 bullet points per competitor category (PayZoll, traditional, crypto-native)
- [ ] Go-to-market messaging: 1-liner + 3-bullet positioning for marketing
- [ ] Identify feature gaps to address in future roadmap

**Dependencies:** NONE  
**Priority:** Medium  
**Estimated Effort:** S

**Handoff Notes:**
Use this for demo day pitch and community Discord announcements. Highlight Protocol 25 X-Ray ZK as unique differentiator (no other live payroll platform uses it).

---

### RES-006: Blend Protocol & Soroswap Integration Research
**Lane:** Research  
**Epic:** Yield Routing  
**Web3 Context:** Blend Protocol (testnet lending), Soroswap (testnet AMM), Ondo USDY, Spiko USTBL, RWA tokens  
**Description:**
Research yield sources available on Stellar Testnet for yield_router.rs:
1. **Blend Protocol:**
   - Testnet endpoint & contract addresses for USDC/EURC pools
   - Current APY oracle interface (how to fetch live rates)
   - Deposit/withdraw mechanics (flash loan risk? re-entrancy?)
   - Gas costs for deposit_idle() + withdraw_yield()
2. **Soroswap:**
   - Testnet deployment: https://soroswap.finance (testnet mode)
   - Earn pool mechanics vs. AMM swap
   - Fee structure for liquidity provision
   - Contract-to-contract interaction patterns
3. **RWA Token Wrappers (Testnet):**
   - Ondo USDY SAC wrapper address & mechanics
   - Spiko USTBL/EUTBL wrapper address & mechanics
   - Yield characteristics vs. traditional stablecoins
4. **Yield Split Logic:**
   - Proposed: 80% employer, 15% employee bonus pool, 5% protocol fee subsidy
   - Research if this allocation is economically viable at MVP scale
   - Document APY expectations (100-500 recipients, $10k-$1M payroll)

**Acceptance Criteria:**
- [ ] Blend integration doc: "blend_integration.md" with testnet addresses, APY fetch logic, gas costs
- [ ] Soroswap integration doc: "soroswap_integration.md" with testnet contract info, fee model
- [ ] RWA token research: "rwa_tokens_testnet.md" with wrapper addresses & yield rates
- [ ] Yield split economic model: "yield_allocation_model.md" with profit/loss at different scales

**Dependencies:** NONE  
**Priority:** High  
**Estimated Effort:** M

**Handoff Notes:**
Developer will implement these integrations in yield_router.rs. Key concern: contract-to-contract calls for APY oracle must not introduce re-entrancy risk (Soroban is safe but double-check call patterns). Blend pool liquidity on testnet may be limited; prepare fallback to Soroswap-only if Blend is unavailable.

---

### RES-007: x402 & MPP Protocol Deep Dive
**Lane:** Research  
**Epic:** x402 Micropayments  
**Web3 Context:** x402 (Coinbase, March 2026), MPP (Stripe/Tempo, April 2026), Stellar integration  
**Description:**
Deep research into x402 and MPP for agentic payment integration:
1. **x402 Protocol:**
   - How does HTTP 402 status code trigger payment flow?
   - Stellar x402 implementation: signed Soroban authorization entries
   - Coinbase facilitator role: fee sponsorship model
   - Integration in Noctis: gate employer API endpoints (batch upload, reports)
   - Flow: employer calls API → HTTP 402 → client signs auth entry → server verifies → HTTP 200
   - Why this matters: API metering without billing dashboards or API keys
2. **MPP (Machine Payments Protocol):**
   - Two modes: "charge" (one-shot) vs. "channel" (streaming commitment)
   - Use case in Noctis: AI payroll agent autonomously approves/routes payments within policy limits
   - stellar-mpp-sdk (experimental): status, stability, known issues
   - Differences from x402: machine-readable negotiation vs. HTTP status
3. **Integration Points in Noctis:**
   - x402: gate CSV batch upload, report generation
   - MPP: future AI agent (Phase 3) for autonomous payment approval
   - Testnet status: both live on Stellar Testnet with Coinbase/Stripe facilitators

**Acceptance Criteria:**
- [ ] x402 deep dive: "x402_protocol.md" with integration code samples
- [ ] MPP deep dive: "mpp_protocol.md" with charge vs. channel explanation
- [ ] Integration spec: "x402_mpp_integration.md" detailing which Noctis endpoints use which protocol
- [ ] Identify testnet facilitator endpoints and fee structures
- [ ] Risk assessment: what happens if facilitator goes down?

**Dependencies:** NONE  
**Priority:** Medium  
**Estimated Effort:** M

**Handoff Notes:**
Developer will implement x402 in Next.js backend for API gating. MPP is future (Phase 3) but research now to unblock AI agent planning. Both protocols use signed Soroban auth entries — ensure developer understands address authorization flow. Note: Coinbase facilitator may have rate limits on testnet.

---

### RES-008: Mercury Indexer Private Event Indexing
**Lane:** Research  
**Epic:** Employee Portal  
**Web3 Context:** Mercury Indexer (Zephyr testnet), private event indexing, SEP-41 events  
**Description:**
Research Mercury Indexer as replacement for Horizon streams (deprecated):
1. **Mercury Zephyr (Testnet Deployment):**
   - Endpoint: Mercury Zephyr testnet instance
   - Contract event indexing: how to query events emitted by Noctis contracts
   - Privacy model: can indexed events be queried by recipient address without exposing details to explorer?
2. **Event Types for Noctis:**
   - ZK Payroll Dispatcher: PaymentDispatched (batch_id, nullifier, amount_hidden)
   - Streaming Vault: StreamStarted, StreamClaimed, StreamCancelled
   - Yield Router: DepositIdle, WithdrawYield
   - Smart Wallet: AuthCheck, PolicyViolation
3. **Query Patterns:**
   - Employee queries: "show me all claim events for my address" (Mercury privacy guarantees?)
   - Employer queries: "show me all dispatch events for my batches"
   - Analytics: total volume, claim rate, avg claim time
4. **Privacy Implications:**
   - Does Mercury indexing expose private recipient addresses?
   - How does it integrate with ZK privacy model?
   - Compare Mercury privacy vs. Mercury public explorer

**Acceptance Criteria:**
- [ ] Mercury indexer research: "mercury_indexing.md" with API specs and privacy model
- [ ] Event schema design: "event_schemas.md" for all Noctis contract events
- [ ] Privacy risk assessment: do Mercury queries leak recipient data despite ZK?
- [ ] Fallback plan if Mercury unavailable (direct RPC event polling?)

**Dependencies:** RES-003 (Stellar RPC guide)  
**Priority:** High  
**Estimated Effort:** M

**Handoff Notes:**
Developer will query Mercury for employee portal private history. Critical: verify that Mercury indexing does NOT expose recipient addresses or amounts on public explorer (defeats ZK privacy). If Mercury has privacy leaks, fallback to encrypted on-app event storage.

---

### RES-009: Passkey Kit & secp256r1 Smart Wallet Architecture
**Lane:** Research  
**Epic:** Smart Wallets  
**Web3 Context:** CAP-0051 secp256r1, SEP-45 WebAuthn interface, Passkey Kit SDK, Launchtube relay  
**Description:**
Deep-dive into Passkey Kit and secp256r1 smart wallet design:
1. **CAP-0051 secp256r1 Support:**
   - Supported on Stellar since Protocol 21
   - Enables WebAuthn/passkey signatures verified natively in Soroban __check_auth
   - No third-party oracle needed (differs from EVM secp256r1 precompiles)
2. **Passkey Kit SDK (TypeScript):**
   - Installation: npm install passkey-kit launchtube
   - Workflow: user registers passkey → kit deploys wallet contract → stores secp256r1 pubkey
   - Signature verification: __check_auth(env, auth: BytesN<64>) verifies secp256r1 signature against stored key
3. **Launchtube Relay Service:**
   - Purpose: abstract fee payment + sequence number management for smart wallets
   - Employees never hold XLM for gas
   - Employer or protocol subsidizes gas via Launchtube (fee sponsorship model)
   - Risk: Launchtube downtime = transactions fail
4. **SEP-45 WebAuthn Interface (Evolving Standard):**
   - Track: https://github.com/stellar/stellar-protocol/discussions/1499
   - Breaking changes possible; ensure compatibility layer in wallet_factory.rs
5. **Smart Wallet Security:**
   - Passkey stored in platform secure enclave (Apple Secure Enclave / Android Strongbox)
   - Never exported; synced via iCloud Keychain / Google Password Manager
   - Risk: user loses device = loses passkey (but can register new passkey via recovery)

**Acceptance Criteria:**
- [ ] Passkey Kit integration guide: "passkey_kit_guide.md" with code examples
- [ ] secp256r1 architecture: "secp256r1_architecture.md" detailing __check_auth verification flow
- [ ] SEP-45 compatibility layer design: "sep45_compat.md" with fallback strategy for future breaking changes
- [ ] Launchtube relay integration: "launchtube_integration.md" with fee sponsorship model
- [ ] Security model: "smart_wallet_security.md" with passkey storage, recovery, and risk analysis

**Dependencies:** RES-004 (SEP standards)  
**Priority:** Critical  
**Estimated Effort:** L

**Handoff Notes:**
Developer will implement wallet_factory.rs and __check_auth() based on this research. Key bottleneck: Passkey Kit SDK maturity and Launchtube relay availability on testnet. Test registration flow thoroughly; passkey creation is UX-critical for adoption (must be <3 seconds). Ensure recovery flow works (new passkey registration) in case of device loss.

---

## 🛠️ DEVELOPER AGENT TASKS (DEV-###)

### DEV-001: Testnet Environment Setup & Verification
**Lane:** Developer  
**Epic:** M1 — Testnet Setup  
**Web3 Context:** Stellar Testnet Protocol 26, Stellar RPC, Friendbot faucet, soroban-cli v26  
**Description:**
Set up local + remote testnet environment for Noctis development:
1. Install soroban-cli v26.0.0: `cargo install soroban-cli --version 26.0.0`
2. Configure Stellar Testnet (Protocol 26 "Yardstick"):
   - Network passphrase: "Test SDF Network ; September 2015"
   - RPC endpoint: https://soroban-testnet.stellar.org
   - Horizon (read-only): https://horizon-testnet.stellar.org (for legacy only)
3. Generate testnet keypair: `stellar keys generate --network testnet employer-wallet`
4. Fund with Friendbot: `stellar keys fund --network testnet employer-wallet` or curl https://friendbot.stellar.org
5. Add USDC trustline via Stellar Lab or programmatically
6. Verify RPC connectivity: call `server.getLatestLedger()` and confirm sequence number increments
7. Set up local Soroban test environment (if needed): `soroban network local start` or use remote testnet only
8. Verify all endpoints are live:
   - RPC responds to simulations
   - Friendbot funds accounts
   - Stellar Lab is accessible

**Acceptance Criteria:**
- [ ] soroban-cli v26.0.0 installed & verified: `soroban --version`
- [ ] Testnet keypair created & funded with testnet XLM
- [ ] USDC trustline added to funded account
- [ ] RPC endpoint confirmed live: `curl https://soroban-testnet.stellar.org` returns JSON
- [ ] Network passphrase correctly set in all config files
- [ ] Hardcoded network guard in place: app rejects transactions if STELLAR_NETWORK !== "TESTNET"

**Dependencies:** NONE  
**Priority:** Critical  
**Estimated Effort:** S

**Handoff Notes:**
This is the foundation for all other tasks. No development can proceed without testnet access. Do NOT use mainnet keys or mainnet RPC. Create separate testnet and mainnet config files with explicit guards. Test network verification must pass before moving to M2.

---

### DEV-002: Smart Wallet Factory Contract (wallet_factory.rs)
**Lane:** Developer  
**Epic:** M2 — Smart Wallets  
**Web3 Context:** Soroban SDK v26.0.0, secp256r1 (CAP-0051), SEP-45 WebAuthn interface, Passkey Kit  
**Description:**
Implement the smart wallet factory contract that deploys secp256r1-signed wallet contracts:
1. **Contract Structure (Rust + soroban-sdk v26.0.0):**
   ```rust
   #[contract]
   pub struct WalletFactory;

   #[contracttype]
   pub struct WalletAccount {
       pub owner: Address,
       pub passkey_pubkey: BytesN<32>,    // secp256r1 public key
       pub policy_signer: Address,         // policy enforcement module
       pub created_at: u64,                // ledger height
   }

   #[contractimpl]
   impl WalletFactory {
       pub fn deploy_wallet(env: Env, passkey_pubkey: BytesN<32>) -> Result<Address, Error>
       pub fn add_passkey(env: Env, wallet: Address, new_key: BytesN<32>) -> Result<(), Error>
       pub fn check_auth(env: Env, sig: BytesN<64>) -> Result<bool, Error>
       pub fn policy_check(env: Env, wallet: Address) -> Result<(), Error>
   }
   ```
2. **Key Functions:**
   - `deploy_wallet()`: Creates new smart wallet account contract with secp256r1 pubkey
   - `add_passkey()`: Registers additional passkey (multi-device support)
   - `check_auth()`: Verifies secp256r1 signature inside __check_auth hook
   - `policy_check()`: Delegates to policy_signer module for spending limits, allow-lists, etc.
3. **Integration with Passkey Kit:**
   - Passkey Kit SDK calls `deploy_wallet()` via Launchtube relay
   - Passkey Kit provides secp256r1 public key from WebAuthn ceremony
   - No seed phrases exposed to user
4. **Security Requirements:**
   - All privileged operations gated by Address::require_auth()
   - secp256r1 signature must be verified before state modification
   - Prevent double-registration of same passkey

**Acceptance Criteria:**
- [ ] wallet_factory.rs compiles without warnings: `cargo build --target wasm32-unknown-unknown --release`
- [ ] Unit tests pass: deploy_wallet, add_passkey, check_auth with mock signatures
- [ ] Deployed to testnet: contract address logged as CDEPLOYTESTNETWALLET
- [ ] Passkey Kit integration test: TypeScript SDK successfully deploys wallet via factory
- [ ] secp256r1 signature verification works in __check_auth
- [ ] No seed phrases or private keys in contract code (only public keys stored)

**Dependencies:** DEV-001 (Testnet setup), RES-009 (Passkey architecture)  
**Priority:** Critical  
**Estimated Effort:** L

**Handoff Notes:**
This is the entry point for all user authentication. Get secp256r1 signature verification right first — test with vectors from Passkey Kit SDK. Integration with __check_auth is non-obvious; Launchtube relay must pass the signature in the auth entry. Once deployed, Researcher will test Passkey Kit integration. Do NOT expose Ed25519 keys; only secp256r1 in user-facing flows.

---

### DEV-003: Policy Signer Module (policy_signer.rs)
**Lane:** Developer  
**Epic:** M2 — Smart Wallets  
**Web3 Context:** Soroban SDK v26.0.0, policy enforcement, multi-sig thresholds, spending limits  
**Description:**
Implement policy enforcement module for smart wallets (spending limits, timelocks, multi-sig, allow-lists):
1. **Contract Structure (Rust + soroban-sdk v26.0.0):**
   ```rust
   #[contract]
   pub struct PolicySigner;

   #[contracttype]
   pub enum PolicyType {
       SpendingLimit,    // max amount per operation
       Timelock,         // min delay before execution
       MultiSigThreshold, // required signatures
       AllowList,        // approved addresses only
   }

   #[contracttype]
   pub struct PolicyRule {
       pub rule_type: PolicyType,
       pub threshold: i128,      // amount or time
       pub exemptions: Vec<Address>,
   }

   #[contractimpl]
   impl PolicySigner {
       pub fn set_limit(env: Env, wallet: Address, limit: i128) -> Result<(), Error>
       pub fn check_auth(env: Env, wallet: Address, amount: i128) -> Result<bool, Error>
       pub fn revoke(env: Env, wallet: Address, policy_id: u32) -> Result<(), Error>
   }
   ```
2. **Key Functions:**
   - `set_limit()`: Set max spending per transaction/day
   - `check_auth()`: Verify transaction complies with active policies
   - `revoke()`: Remove specific policy rule
3. **Use Cases in Noctis:**
   - Employer: spending limit per batch payroll (prevents accidental overspend)
   - Employee: spending limit per claim (prevents loss due to account compromise)
   - AI Agent (Phase 3): multi-sig threshold for autonomous payment approval
4. **Security:**
   - Policies are composable (multiple rules can apply)
   - Revocation is immediate (no timelock on policy changes)
   - Fallback: if policy engine fails, deny operation

**Acceptance Criteria:**
- [ ] policy_signer.rs compiles: `cargo build --target wasm32-unknown-unknown --release`
- [ ] Unit tests pass: set_limit, check_auth with various thresholds, revoke
- [ ] Deployed to testnet: contract address logged as CDEPLOYTESTNETPOLICY
- [ ] Integration test with wallet_factory: wallet enforces policy on auth check
- [ ] Supports at least 3 policy types: SpendingLimit, Timelock, AllowList
- [ ] Policy rules can be chained (multiple rules active simultaneously)

**Dependencies:** DEV-002 (Smart wallet factory), RES-009 (Passkey architecture)  
**Priority:** High  
**Estimated Effort:** M

**Handoff Notes:**
Policy engine is critical for enterprise adoption (spending limits prevent catastrophic loss). Keep policy logic simple for MVP (no recursive checks or complex scoring). Implement revocation as "remove from active set" not "store revocation reason". Integrate with wallet_factory's policy_check() call before any state modification.

---

### DEV-004: ZK Payroll Dispatcher Contract (payroll_dispatcher.rs)
**Lane:** Developer  
**Epic:** M3 — Core Payroll Contract  
**Web3 Context:** Soroban SDK v26.0.0, Groth16 proofs, BLS12-381, Protocol 25 X-Ray, nullifiers  
**Description:**
Implement core ZK payroll dispatcher contract:
1. **Contract Structure (Rust + soroban-sdk v26.0.0):**
   ```rust
   #[contract]
   pub struct PayrollDispatcher;

   #[contracttype]
   pub struct PayrollBatch {
       pub employer: Address,
       pub total_amount: i128,    // visible — sum only
       pub commitment_root: BytesN<32>, // Merkle root
       pub zk_proof: Bytes,        // Groth16 proof
       pub nullifiers: Vec<BytesN<32>>, // prevent double-pay
   }

   #[contractimpl]
   impl PayrollDispatcher {
       pub fn batch_pay(env: Env, batch: PayrollBatch) -> Result<(), Error>
       pub fn verify_zk_proof(env: Env, proof: Bytes) -> bool
       pub fn emit_nullifier(env: Env, n: BytesN<32>)
   }
   ```
2. **Key Functions:**
   - `batch_pay()`: Accept employer-signed payroll batch, verify ZK proof, emit nullifiers
   - `verify_zk_proof()`: Call Protocol 25 X-Ray BLS12-381 host functions to verify Groth16 proof
   - `emit_nullifier()`: Store nullifier hash on-chain to prevent replay/double-payment
3. **ZK Integration:**
   - Expects Groth16 proof (bytes format) compiled from circom circuit
   - Uses Protocol 25 X-Ray host functions: bls12_381_g1_add, bls12_381_g2_add, bls12_381_pairing
   - Proof verification must happen on-chain (no off-chain oracle)
4. **Nullifier Storage:**
   - Each payment commitment emits unique nullifier hash
   - Check nullifier set before executing each payment
   - Prevent replay attacks without revealing recipient identity

**Acceptance Criteria:**
- [ ] payroll_dispatcher.rs compiles: `cargo build --target wasm32-unknown-unknown --release`
- [ ] Unit tests pass: batch_pay with mock Groth16 proof, nullifier check
- [ ] Deployed to testnet: contract address logged as CDEPLOYTESTNETDISPATCHER
- [ ] ZK proof verification uses Protocol 25 X-Ray host functions (not custom implementation)
- [ ] Nullifier set prevents double-payment (test: submit same batch twice, second fails)
- [ ] batch_pay() with ≥10 recipients succeeds; visible data: batch_total, proof_hash, nullifiers only
- [ ] Stellar Explorer shows only total_amount and proof validity, no individual recipient amounts

**Dependencies:** DEV-001 (Testnet setup), RES-002 (ZK circuit design), DEV-002 (Smart wallets)  
**Priority:** Critical  
**Estimated Effort:** XL

**Handoff Notes:**
Core contract; most complex. ZK proof verification is non-trivial: ensure Protocol 25 X-Ray host functions are used correctly. Test with generated Groth16 proofs from circom circuit (Researcher provides test vectors). Nullifier set must be queryable on-chain (store in map). Watch gas costs carefully (ZK verification can be expensive); optimize if necessary using CAP-81 eviction improvements. No Horizon; use RPC only.

---

### DEV-005: Streaming Vault Contract (streaming_vault.rs)
**Lane:** Developer  
**Epic:** M5 — Payment Streaming  
**Web3 Context:** Soroban SDK v26.0.0, per-second accrual, clawback for cancellation  
**Description:**
Implement streaming vault for per-second salary accrual:
1. **Contract Structure (Rust + soroban-sdk v26.0.0):**
   ```rust
   #[contract]
   pub struct StreamingVault;

   #[contracttype]
   pub struct Stream {
       pub employer: Address,
       pub employee: Address,
       pub amount_total: i128,
       pub start_time: u64,        // ledger timestamp
       pub end_time: u64,
       pub amount_claimed: i128,
       pub is_active: bool,
   }

   #[contractimpl]
   impl StreamingVault {
       pub fn start_stream(env: Env, employee: Address, amount: i128, duration_secs: u64) -> Result<u32, Error>
       pub fn claim_stream(env: Env, stream_id: u32) -> Result<i128, Error>
       pub fn cancel_stream(env: Env, stream_id: u32) -> Result<(), Error>
   }
   ```
2. **Key Functions:**
   - `start_stream()`: Employer creates stream; deposits total amount; employee accrues linearly per second
   - `claim_stream()`: Employee withdraws all accrued tokens (from stream start to now)
   - `cancel_stream()`: Employer cancels stream; unclaimed tokens return to employer; claimed tokens stay with employee
3. **Accrual Logic:**
   - Per-second rate: total_amount / duration_secs = tokens_per_second
   - Accrued balance at time T: tokens_per_second * (T - start_time), capped at total_amount
   - No cliff; continuous accrual from second 1
4. **x402 Integration (M6 dependency):**
   - Streaming Vault can be charged via x402 for API call metering
   - Balance must be sufficient to cover x402 charge before claim succeeds

**Acceptance Criteria:**
- [ ] streaming_vault.rs compiles: `cargo build --target wasm32-unknown-unknown --release`
- [ ] Unit tests pass: start_stream, claim_stream with time progression, cancel_stream
- [ ] Deployed to testnet: contract address logged as CDEPLOYTESTNETVAULT
- [ ] Accrual math verified: test 3600-second stream, claim at 50% → receive exactly 50% of amount
- [ ] Cancel works: employer cancels 50% accrued stream → employee gets claimed amount, employer gets remainder
- [ ] Employee can claim multiple times (accrual resets from last claim time)
- [ ] Gas costs reasonable for high-frequency claims (optimize if >100k gas per claim)

**Dependencies:** DEV-004 (ZK dispatcher), RES-006 (Blend/Soroswap integration)  
**Priority:** High  
**Estimated Effort:** L

**Handoff Notes:**
Streaming contract is simple but must handle time correctly (ledger timestamps, not wall clock). Test accrual math extensively (off-by-one errors in per-second calculation are easy). Integration with Yield Router (DEV-006) passes idle capital to lending pools. No seed phrase exposure; employees access via smart wallet. Use SafeMath (Soroban i128 handles overflow safely).

---

### DEV-006: Yield Router Contract (yield_router.rs)
**Lane:** Developer  
**Epic:** M7 — Yield Routing  
**Web3 Context:** Soroban SDK v26.0.0, Blend Protocol (testnet), Soroswap (testnet), contract-to-contract calls  
**Description:**
Implement yield router that auto-deposits idle payroll capital into lending pools:
1. **Contract Structure (Rust + soroban-sdk v26.0.0):**
   ```rust
   #[contract]
   pub struct YieldRouter;

   #[contracttype]
   pub struct YieldPosition {
       pub employer: Address,
       pub vault: Address,        // Blend or Soroswap contract
       pub token: Address,
       pub amount_deposited: i128,
       pub yield_earned: i128,
   }

   #[contractimpl]
   impl YieldRouter {
       pub fn deposit_idle(env: Env, vault: Address, token: Address, amount: i128) -> Result<(), Error>
       pub fn withdraw_yield(env: Env, vault: Address) -> Result<i128, Error>
       pub fn get_apy(env: Env, vault: Address, token: Address) -> Result<i128, Error>
   }
   ```
2. **Key Functions:**
   - `deposit_idle()`: Employer calls after payroll batch; idle USDC/EURC routed to Blend or Soroswap
   - `withdraw_yield()`: Employer withdraws earned yield (not principal); principal stays in vault
   - `get_apy()`: Query current APY from Blend or Soroswap oracle
3. **Yield Split (per RES-006):**
   - 80% of yield returned to employer
   - 15% to employee bonus pool (distributed at fiscal year-end)
   - 5% reserved for protocol fee subsidy
4. **Contract-to-Contract Calls:**
   - Invoke Blend deposit() with USDC
   - Invoke Soroswap Earn pool deposit()
   - Query APY via external call (must handle failures gracefully)

**Acceptance Criteria:**
- [ ] yield_router.rs compiles: `cargo build --target wasm32-unknown-unknown --release`
- [ ] Unit tests pass: deposit_idle, withdraw_yield, get_apy with mock responses
- [ ] Deployed to testnet: contract address logged as CDEPLOYTESTNETYIELD
- [ ] Integration test: deposit $1000 USDC to Blend, verify deposit accepted
- [ ] APY oracle works: get_apy() returns live rate from Blend/Soroswap
- [ ] Yield withdrawal works: withdraw yield without touching principal
- [ ] Yield split math correct: 1000 yield → 800 employer, 150 bonus pool, 50 protocol
- [ ] Fallback to Soroswap if Blend unavailable

**Dependencies:** DEV-005 (Streaming vault), RES-006 (Blend/Soroswap research)  
**Priority:** High  
**Estimated Effort:** L

**Handoff Notes:**
Yield Router enables Noctis's unique value prop (passive income on idle capital). Tricky part: contract-to-contract calls can fail if Blend/Soroswap is unavailable or pool is paused. Implement graceful fallback (if Blend fails, try Soroswap). APY oracle must be cached (not queried per-second to avoid gas explosion). Test contract interactions thoroughly; re-entrancy is safe but state consistency is not. Track yield earned separately from principal.

---

### DEV-007: ZK Proof Generation & Verification (Client-Side Integration)
**Lane:** Developer  
**Epic:** M4 — ZK Proof Integration  
**Web3 Context:** circom, snarkjs, Groth16, Protocol 25 X-Ray, client-side proof generation  
**Description:**
Integrate client-side ZK proof generation and on-chain verification:
1. **Circuit Compilation (using circom from RES-002):**
   - Compile circom circuit: `circom payroll_circuit.circom --r1cs --wasm --sym`
   - Generate witness: snarkjs wtns create payroll_circuit.wasm input.json witness.wtns
   - Generate proof: snarkjs groth16 prove payroll_circuit.zkey witness.wtns
   - Export proof in Soroban format (bytes)
2. **TypeScript Integration (Next.js Frontend):**
   ```typescript
   import * as snarkjs from "snarkjs";

   async function generatePayrollProof(payrollData) {
       const circuit = require("./payroll_circuit.wasm");
       const zkey = await fetch("./payroll_circuit.zkey").then(r => r.arrayBuffer());
       const witness = await snarkjs.wtns.create(circuit, payrollData);
       const { proof, publicSignals } = await snarkjs.groth16.prove(zkey, witness);
       return { proof, publicSignals };
   }
   ```
3. **On-Chain Verification (Soroban):**
   - payroll_dispatcher.verify_zk_proof() uses Protocol 25 X-Ray BLS12-381 host functions
   - Proof is expected as Bytes; parse G1/G2 points from Groth16 format
4. **Performance & UX:**
   - Proof generation time: target <5 seconds per batch on modern browser
   - Fallback: server-side proof generation if client-side times out
   - Show progress bar to user during proof generation

**Acceptance Criteria:**
- [ ] Circuit compiles: payroll_circuit.wasm and payroll_circuit.zkey generated
- [ ] snarkjs integration: witness creation and proof generation works in Node.js
- [ ] TypeScript client: generatePayrollProof() function exported and callable
- [ ] Proof format correct: bytes serialization matches on-chain expectation
- [ ] On-chain verification: proof submitted to payroll_dispatcher, verify_zk_proof() returns true
- [ ] Performance: proof generation <5 seconds per batch (10 recipients)
- [ ] Error handling: graceful fallback if proof generation fails

**Dependencies:** DEV-004 (ZK dispatcher), RES-002 (ZK circuit design)  
**Priority:** Critical  
**Estimated Effort:** L

**Handoff Notes:**
Proof generation is the largest UX bottleneck. Test on real hardware (mobile device) to ensure <5 second target is realistic. If not, implement server-side fallback (Researcher can optimize circom constraints later). Proof serialization from snarkjs to Soroban bytes is easy but easy to get wrong; test with known good proof vectors. Client-side generation requires large WASM file (~5MB); consider lazy loading or Web Worker.

---

### DEV-008: Stellar RPC Client Setup (@stellar/stellar-sdk v14.6.1)
**Lane:** Developer  
**Epic:** M1 — Testnet Setup  
**Web3 Context:** @stellar/stellar-sdk v14.6.1, Stellar RPC, transaction simulation, contract binding generation  
**Description:**
Set up Stellar RPC client and generate TypeScript contract bindings:
1. **Installation:**
   ```bash
   npm install @stellar/stellar-sdk@14.6.1
   npm install --save-dev @stellar/stellar-sdk # for development
   ```
2. **RPC Client Initialization (TypeScript):**
   ```typescript
   import { rpc } from "@stellar/stellar-sdk";

   const server = new rpc.Server("https://soroban-testnet.stellar.org");
   const network = "Test SDF Network ; September 2015";
   ```
3. **Common Operations:**
   - Get account: `server.getAccount(publicKey)`
   - Get latest ledger: `server.getLatestLedger()`
   - Simulate transaction: `server.simulateTransaction(txBuilder.build())`
   - Submit transaction: `server.submitTransaction(signedTx)`
   - Get contract events: `server.getEvents({ ..., filters: [{ type: "contract" }] })`
4. **Contract Binding Generation:**
   ```bash
   npx @stellar/stellar-sdk generate \
     --wasm ./target/wasm32-unknown-unknown/release/payroll_dispatcher.wasm \
     --output-dir ./src/contracts/payroll-client \
     --contract-name payroll-dispatcher \
     --network testnet
   ```
5. **Generated Bindings (TypeScript):**
   - Functions for each Soroban contract function
   - Type-safe parameter marshaling
   - Response deserialization

**Acceptance Criteria:**
- [ ] @stellar/stellar-sdk v14.6.1 installed and imported successfully
- [ ] RPC client connects to testnet: `await server.getLatestLedger()` succeeds
- [ ] Contract bindings generated for all 5 Noctis contracts
- [ ] Generated TypeScript types compile without errors
- [ ] Test operations work: get account, simulate tx, submit tx
- [ ] No Horizon API calls in final code (all through RPC)

**Dependencies:** DEV-001 (Testnet setup)  
**Priority:** Critical  
**Estimated Effort:** S

**Handoff Notes:**
RPC client is used by all frontend and backend code. Contract bindings are auto-generated; regenerate after each contract deployment. Error handling is different than Horizon (different error response formats). Test RPC response times; if slow, implement caching for frequently-accessed data (account info, latest ledger).

---

### DEV-009: Passkey Kit Integration (Next.js Frontend)
**Lane:** Developer  
**Epic:** M2 — Smart Wallets  
**Web3 Context:** Passkey Kit SDK, Launchtube relay, secp256r1, WebAuthn/FIDO2  
**Description:**
Integrate Passkey Kit into Next.js frontend for smart wallet registration and auth:
1. **Installation:**
   ```bash
   npm install passkey-kit launchtube
   ```
2. **Passkey Registration Flow (TypeScript/React):**
   ```typescript
   import { PasskeyKit } from "passkey-kit";

   async function registerPasskey() {
       const kit = new PasskeyKit();
       const passkey = await kit.register({
           username: employerEmail,
           displayName: companyName,
       });
       // Launchtube deploys smart wallet contract
       const wallet = await kit.deploySmartWallet(passkey);
       return wallet;
   }
   ```
3. **Passkey Login Flow:**
   ```typescript
   async function loginWithPasskey() {
       const kit = new PasskeyKit();
       const assertion = await kit.authenticate();
       const signedAuth = kit.signTransaction(txBuilder, assertion);
       // Submit transaction via Launchtube relay
       const relay = new Launchtube();
       await relay.submitTransaction(signedAuth);
   }
   ```
4. **UX Requirements:**
   - Registration: <3 seconds (biometric prompt)
   - No seed phrases shown to user
   - Error handling: device not supported, passkey not enrolled, network failure
   - Mobile support: iOS (Face ID), Android (fingerprint)

**Acceptance Criteria:**
- [ ] Passkey Kit SDK installed and imports successfully
- [ ] Registration flow works: user creates passkey, smart wallet deployed, wallet address returned
- [ ] Login flow works: user authenticates with passkey, transaction signed, submitted via Launchtube
- [ ] secp256r1 signature verified on-chain via __check_auth
- [ ] Mobile tested: works on iOS (Face ID) and Android (fingerprint)
- [ ] Error messages user-friendly: "Passkey not found, please register" (not technical errors)
- [ ] No Ed25519 keys exposed; only secp256r1 in frontend code

**Dependencies:** DEV-002 (Smart wallet factory), DEV-001 (Testnet setup)  
**Priority:** High  
**Estimated Effort:** M

**Handoff Notes:**
This is the critical UX entry point for employees and employers. Passkey registration must be frictionless (<3 seconds). Test on real devices; emulators may not support biometric prompts. Launchtube relay must be configured correctly (testnet facilitator). If Launchtube fails, graceful error: "Transaction relay unavailable, try again later." Integration with wallet_factory.rs must use correct secp256r1 signature format.

---

### DEV-010: x402 Micropayment Server (API Endpoint Gating)
**Lane:** Developer  
**Epic:** M6 — x402 Micropayments  
**Web3 Context:** x402 protocol, Coinbase facilitator (stellar:testnet), HTTP 402 status, Soroban auth entries  
**Description:**
Implement x402 server for gating employer API endpoints (CSV batch upload, report generation):
1. **x402 Protocol Overview:**
   - Client calls API without payment → HTTP 402 Accepted
   - Response includes payment request (amount, recipient address)
   - Client signs Soroban authorization entry with payment details
   - Client re-submits request with signed auth entry → HTTP 200 (payment processed)
2. **Backend Setup (Node.js/Express or similar):**
   ```typescript
   import { x402 } from "x402-stellar";

   const x402Handler = x402({
       facilitator: "Coinbase", // stellar:testnet
       endpoints: [
           { path: "/api/batch-upload", amount: 1000, token: "USDC" },
           { path: "/api/report-generate", amount: 500, token: "USDC" },
       ],
   });

   app.post("/api/batch-upload", x402Handler.verify, (req, res) => {
       // Payment verified; process batch upload
       const batch = parseBatchCSV(req.body);
       // ... call payroll_dispatcher.batch_pay()
   });
   ```
3. **Payment Verification:**
   - Decode authorization entry from request header
   - Verify employer signature (secp256r1 from smart wallet)
   - Check amount matches expected charge
   - Submit payment to Streaming Vault (or direct to protocol treasury)
4. **Testnet Facilitator:**
   - Coinbase facilitator handles fee sponsorship
   - All x402 charges on testnet routed through Coinbase
   - No real payments (testnet USDC only)

**Acceptance Criteria:**
- [ ] x402 server endpoint active: `POST /api/batch-upload` returns HTTP 402 on first call
- [ ] Client library integration: PaymentRequest generated correctly
- [ ] Signature verification: secp256r1 signature verified successfully
- [ ] Payment processing: charge applied to employer's Streaming Vault
- [ ] HTTP 200 response after payment accepted
- [ ] Multiple endpoints gated: batch-upload and report-generate both chargeable
- [ ] Testnet facilitator working: no mainnet touchpoints

**Dependencies:** DEV-009 (Passkey integration), RES-007 (x402 protocol research)  
**Priority:** Medium  
**Estimated Effort:** M

**Handoff Notes:**
x402 is advanced; start with basic HTTP 402 → payment → 200 flow, no fancy re-negotiation. Testnet Coinbase facilitator may have rate limits. Error handling: if payment fails, return HTTP 402 again with new payment request. Do NOT charge on mainnet; hardcode testnet facilitator. Integration with Streaming Vault: payment charges must be deductible from available balance.

---

### DEV-011: Employee Portal (Next.js + React)
**Lane:** Developer  
**Epic:** M8 — Employee Portal  
**Web3 Context:** Next.js 15, React 19, Passkey Kit, Mercury indexing, Soroswap Aggregator, smart wallet auth  
**Description:**
Build employee self-service portal:
1. **Features:**
   - Passkey login (FaceID/TouchID)
   - View accrued salary balance (private, fetched from Mercury indexer)
   - Claim accrued salary → auto-convert to preferred stablecoin
   - View transaction history (indexed privately)
   - Settings: change preferred stablecoin, register backup passkey

2. **Tech Stack:**
   - Next.js 15 + React 19
   - Tailwind 4 for styling
   - Passkey Kit for authentication
   - Mercury indexer for private event history
   - Soroswap Aggregator for FX conversion

3. **Key Pages:**
   - `/login`: Passkey authentication screen
   - `/dashboard`: Accrued balance, claim button, recent history
   - `/claim`: Claim flow, stablecoin selection, confirmation
   - `/settings`: Preferred currency, backup passkey
   - `/history`: Full transaction history (indexed from Mercury)

4. **Accrual Calculation (Client-Side):**
   ```typescript
   function calculateAccrued(stream: Stream, currentTime: number): i128 {
       const rate = stream.amount_total / (stream.end_time - stream.start_time);
       const elapsed = Math.max(0, currentTime - stream.start_time);
       return Math.floor(rate * elapsed);
   }
   ```

5. **Claim Flow:**
   - Employee clicks "Claim" → confirm amount
   - Select preferred stablecoin (USDC, EURC, etc.)
   - Sign transaction with passkey (via Passkey Kit)
   - Submit to Streaming Vault contract + auto-swap via Soroswap Aggregator
   - Show success screen with txn hash (not to end user; only "Claimed!")

**Acceptance Criteria:**
- [ ] Portal live on testnet: employee can login with passkey
- [ ] Accrued balance displayed correctly (updated every 5 seconds)
- [ ] Claim flow works: employee claims salary, receives USDC in wallet
- [ ] Auto-conversion works: employee selects EURC, receives EURC (swapped via Soroswap)
- [ ] History loaded from Mercury indexer: "Last 5 claims" shown with dates/amounts
- [ ] Mobile responsive: works on iPhone, Android
- [ ] Loading states: "Fetching balance...", "Processing claim..." shown
- [ ] Error handling: "Network error, try again" (never show raw errors)
- [ ] No raw transaction hashes shown to user
- [ ] Passkey recovery option: "Register backup passkey"

**Dependencies:** DEV-009 (Passkey integration), RES-008 (Mercury indexing)  
**Priority:** High  
**Estimated Effort:** L

**Handoff Notes:**
Employee portal is the most user-facing component. Keep UI simple and clear (non-technical audience). Accrued balance must update in near-real-time (query Mercury or Streaming Vault every 5 seconds, cache result). Claim process must be <3 clicks (confirm → select currency → submit). Error messages must be user-friendly (no "contract revert error" messages). Mobile testing essential (this is used by global workforce).

---

### DEV-012: Employer Dashboard (Next.js + React)
**Lane:** Developer  
**Epic:** M9 — Employer Dashboard  
**Web3 Context:** Next.js 15, React 19, Passkey Kit, CSV parsing, ZK proof generation  
**Description:**
Build employer batch payroll UI:
1. **Features:**
   - Passkey login (secp256r1)
   - CSV upload (columns: recipient_address, amount_usdc, stream_duration_secs)
   - Preview batch: show recipients, total amount, estimated yield
   - Approve & pay: trigger PayrollDispatcher.batch_pay() with ZK proof
   - Batch history: previous payrolls, status (pending, dispatched, claimed)
   - Settings: spending limits, multi-sig policy, trusted signers

2. **Tech Stack:**
   - Next.js 15 + React 19
   - Tailwind 4
   - Passkey Kit for auth
   - CSV parsing library (papaparse or similar)
   - snarkjs for ZK proof generation
   - Soroswap Aggregator preview for yield projection

3. **Key Pages:**
   - `/login`: Passkey authentication
   - `/dashboard`: Quick stats (total paid this month, avg claim rate, current yield %)
   - `/batch-upload`: CSV file picker, preview, approve
   - `/batch-history`: past batches with status
   - `/settings`: spending limits, policy configuration

4. **Batch Upload Flow:**
   ```
   1. Click "Upload Payroll" → file picker
   2. Parse CSV → show preview (10 rows)
   3. Calculate: total amount, Merkle root, ZK circuit input
   4. Generate Groth16 proof (client-side, ~3-5 seconds)
   5. Show proof status: "Generating proof..." → "Proof ready"
   6. Employer approves with passkey
   7. Send payroll_dispatcher.batch_pay(batch) via Launchtube
   8. Show: "Payroll dispatched! ✓" → payment streams active
   ```

5. **CSV Format:**
   ```csv
   recipient_address,amount_usdc,stream_duration_secs
   GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5V,1000,2592000
   GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBXYZ,1500,2592000
   ```

**Acceptance Criteria:**
- [ ] Dashboard live on testnet: employer can login with passkey
- [ ] CSV upload: parse file, validate recipient addresses (G... format)
- [ ] Preview shows: 10 recipients, total amount, estimated yield % (from Yield Router)
- [ ] ZK proof generated: show progress bar during generation
- [ ] Approval flow: employer signs with passkey, batch submitted
- [ ] Batch status tracked: "Dispatched", "Streams Active", "Employees Claiming"
- [ ] History shows: date, recipients count, total amount, claim rate %
- [ ] Settings functional: set spending limit, update policy
- [ ] Mobile responsive: CSV upload works on mobile (file picker)
- [ ] Error handling: invalid addresses, insufficient balance, network errors

**Dependencies:** DEV-007 (ZK proof generation), DEV-009 (Passkey integration), DEV-006 (Yield router)  
**Priority:** High  
**Estimated Effort:** L

**Handoff Notes:**
Employer dashboard is sales-critical; UI/UX matters significantly. CSV parsing must be robust (handle different line endings, missing columns, invalid addresses). ZK proof generation progress should be shown (takes 3-5 seconds); don't freeze UI. Estimated yield calculation should be conservative (use yesterday's APY, not live rate). Security: ensure only employer can approve their own batches (passkey signature verification).

---

### DEV-013: Full End-to-End Testing & Demo Flow
**Lane:** Developer  
**Epic:** M10 — Demo Day Ready  
**Web3 Context:** Testnet integration testing, contract interactions, UI polish, security audit  
**Description:**
Complete end-to-end testing and demo preparation:
1. **Integration Testing Checklist:**
   - [ ] Testnet Setup: All services live (RPC, Friendbot, Blend, Soroswap)
   - [ ] Smart Wallets: Passkey registration + login works (iOS/Android)
   - [ ] Payroll Dispatcher: ZK batch with ≥10 recipients processed successfully
   - [ ] ZK Proofs: Groth16 verification on-chain using Protocol 25 X-Ray functions
   - [ ] Streaming: Per-second accrual visible in UI; claim works
   - [ ] Yield: Idle capital deposited to Blend; APY displayed; withdrawal works
   - [ ] x402: HTTP 402 → payment → 200 flow demonstrated
   - [ ] UI Polish: Responsive, loading states, error messages (no raw txn hashes shown)

2. **Demo Flow (5-minute scripted demo):**
   - **[0:00-1:00]** Intro: Privacy-first payroll on Stellar
   - **[1:00-1:30]** Employer login: Passkey registration (show FaceID)
   - **[1:30-2:30]** Upload batch: CSV with 10 recipients, preview, approve
   - **[2:30-3:00]** ZK proof generation: Show progress, verify on explorer
   - **[3:00-4:00]** Employee flow: Employee login, view accrued balance, claim salary
   - **[4:00-4:30]** Yield demo: Show APY, idle capital in Blend, yield earned
   - **[4:30-5:00]** Wrap-up: All on testnet, no mainnet touch, Protocol 26 efficiency

3. **Security Audit Checklist:**
   - [ ] No seed phrases exposed (only secp256r1 passkeys)
   - [ ] No mainnet keys in code (testnet only)
   - [ ] Hardcoded network guard: app rejects non-testnet transactions
   - [ ] All auth guarded by Address::require_auth()
   - [ ] Nullifier set prevents double-payment
   - [ ] ZK proofs verified on-chain (not off-chain)
   - [ ] Re-entrancy not possible (Soroban safe)
   - [ ] Integer overflow checks in place (Rust i128)

4. **Performance Baseline:**
   - Proof generation: <5 seconds per 10-recipient batch
   - Claim transaction: <10 seconds submit + confirmation
   - Dashboard load: <2 seconds
   - API endpoint (x402): <1 second response time

**Acceptance Criteria:**
- [ ] End-to-end demo completes without errors (5-minute flow)
- [ ] All M1–M9 milestones marked complete
- [ ] Stellar Explorer shows: batch_total, nullifiers, proof validity (no individual amounts)
- [ ] Employee sees only their accrued balance (private per Mercury indexer)
- [ ] Performance meets baselines (proof <5s, claim <10s, dashboard <2s)
- [ ] Security checklist: all items ✓ (no seed phrases, testnet-only, auth guards, etc.)
- [ ] UI polished: no raw errors shown, all loading states present
- [ ] Mobile tested: works on iOS 15+ and Android 11+
- [ ] Demo recording prepared for YouTube

**Dependencies:** All prior tasks (DEV-001 through DEV-012, RES-001 through RES-009)  
**Priority:** Critical  
**Estimated Effort:** XL

**Handoff Notes:**
This is the final integration milestone. Spend time on demo scripting and polish. Test the full flow multiple times to identify edge cases. If any part fails, it's a blocker for M10 completion. Security audit must be thorough (involve Security Engineer). Performance optimization: if proof generation >5 seconds, implement server-side fallback. Recording should showcase both employer and employee flows seamlessly.

---

## 📊 TASK DEPENDENCY GRAPH

```
┌─ RES-001 (Protocol 26 Impact) ────────────────────────────┐
│                                                             │
├─ RES-002 (ZK Circuit Design) ──────────────────────────────┤
│                                                             │
├─ RES-003 (Stellar RPC Migration) ──────────────────────────┤
│                        │                                    │
│                        ▼                                    │
│            ┌─ DEV-001 (Testnet Setup) ─────────────────────┤
│            │                                                │
│            └─ DEV-008 (RPC Client Setup) ────────────────────┤
│                                                             │
├─ RES-004 (SEP Standards) ──────────────────────────────────┤
│            │                                                │
│            ▼                                                │
│       ┌─ DEV-002 (Smart Wallet Factory) ────────────────────┤
│       │                                                      │
│       ├─ DEV-003 (Policy Signer Module) ─────────────────────┤
│       │                                                      │
│       └─ RES-009 (Passkey Architecture) ─────────────────────┤
│            │                                                 │
│            ▼                                                 │
│       ┌─ DEV-009 (Passkey Kit Integration) ───────────────────┤
│       │                                                       │
│       ├─ RES-005 (Competitive Analysis) ──────────────────────┤
│       │                                                       │
│       └─ DEV-004 (ZK Payroll Dispatcher) ───────────────────────┤
│            │                                                  │
│            ├─ RES-002 (ZK Circuit Design) ──────────────────────┤
│            │                                                  │
│            └─ DEV-007 (ZK Proof Generation) ──────────────────────┤
│                                                               │
│       ┌─ DEV-005 (Streaming Vault) ──────────────────────────────┤
│       │                                                        │
│       ├─ RES-006 (Blend/Soroswap Research) ──────────────────────┤
│       │                                                        │
│       └─ DEV-006 (Yield Router) ───────────────────────────────────┤
│                                                                │
├─ RES-007 (x402/MPP Deep Dive) ──────────────────────────────────┤
│            │                                                  │
│            ▼                                                  │
│       ┌─ DEV-010 (x402 Micropayment Server) ──────────────────────┤
│       │                                                       │
│       └─ RES-008 (Mercury Indexing) ──────────────────────────────┤
│            │                                                  │
│            ▼                                                  │
│       ┌─ DEV-011 (Employee Portal) ────────────────────────────────┤
│       │                                                        │
│       └─ DEV-012 (Employer Dashboard) ───────────────────────────┤
│                                                                │
│       ┌─ DEV-013 (End-to-End Testing) ──────────────────────────┤
│       │  (depends on ALL prior tasks)                          │
│       └──────────────────────────────────────────────────────────┘
```

---

## 🚀 EXECUTION ROADMAP (2-Week Sprints)

### **SPRINT 1 (Week 1-2): Foundation & Core Contracts**
**Research Tasks:**
- RES-001: Protocol 26 Impact Analysis ✓
- RES-002: ZK Circuit Design ✓
- RES-003: Stellar RPC Migration ✓
- RES-004: SEP Standards Compliance ✓

**Developer Tasks:**
- DEV-001: Testnet Setup ✓
- DEV-008: RPC Client Setup ✓
- DEV-002: Smart Wallet Factory ✓
- DEV-003: Policy Signer Module ✓

**Exit Criteria:** M1–M2 complete, all contracts compile, RPC live, passkey registration works

---

### **SPRINT 2 (Week 3-4): ZK & Streaming**
**Research Tasks:**
- RES-009: Passkey Architecture ✓
- RES-006: Blend/Soroswap Integration ✓
- RES-007: x402/MPP Deep Dive ✓

**Developer Tasks:**
- DEV-004: ZK Payroll Dispatcher ✓
- DEV-007: ZK Proof Generation ✓
- DEV-005: Streaming Vault ✓
- DEV-009: Passkey Kit Integration ✓

**Exit Criteria:** M3–M5 complete, ZK proofs verify on-chain, streaming per-second working, passkey auth live

---

### **SPRINT 3 (Week 5-6): Yield, x402, Portals**
**Research Tasks:**
- RES-008: Mercury Indexing ✓
- RES-005: Competitive Analysis ✓

**Developer Tasks:**
- DEV-006: Yield Router ✓
- DEV-010: x402 Server ✓
- DEV-011: Employee Portal ✓
- DEV-012: Employer Dashboard ✓

**Exit Criteria:** M6–M9 complete, yield routed to Blend, x402 HTTP 402 flow working, portals live

---

### **SPRINT 4 (Week 7-8): Polish & Demo**
**Developer Tasks:**
- DEV-013: End-to-End Testing ✓
- UI/UX polish
- Performance optimization
- Demo script + video recording

**Exit Criteria:** M10 complete, all milestones ✓, demo ready, security audit passed

---

## 📋 QUICK REFERENCE: TASK ID MAPPING

### Research Agent (RES-###)
| ID | Task | Epic | Duration |
|----|------|------|----------|
| RES-001 | Protocol 26 Impact Analysis | M1 | S |
| RES-002 | ZK Circuit Design | M3 | L |
| RES-003 | Stellar RPC Migration | M1 | M |
| RES-004 | SEP Standards Matrix | M2 | M |
| RES-005 | Competitive Differentiation | Strategy | S |
| RES-006 | Blend/Soroswap Research | M7 | M |
| RES-007 | x402/MPP Protocol | M6 | M |
| RES-008 | Mercury Indexing | M8 | M |
| RES-009 | Passkey Architecture | M2 | L |

**Research Total: 9 tasks, ~8 weeks effort (S+L+M+M+S+M+M+M+L)**

### Developer Agent (DEV-###)
| ID | Task | Epic | Duration |
|----|------|------|----------|
| DEV-001 | Testnet Setup | M1 | S |
| DEV-002 | Smart Wallet Factory | M2 | L |
| DEV-003 | Policy Signer | M2 | M |
| DEV-004 | ZK Payroll Dispatcher | M3 | XL |
| DEV-005 | Streaming Vault | M5 | L |
| DEV-006 | Yield Router | M7 | L |
| DEV-007 | ZK Proof Generation | M4 | L |
| DEV-008 | RPC Client | M1 | S |
| DEV-009 | Passkey Integration | M2 | M |
| DEV-010 | x402 Server | M6 | M |
| DEV-011 | Employee Portal | M8 | L |
| DEV-012 | Employer Dashboard | M9 | L |
| DEV-013 | End-to-End Testing | M10 | XL |

**Developer Total: 13 tasks, ~12 weeks effort (S+L+M+XL+L+L+L+S+M+M+L+L+XL)**

---

## 🎯 SUCCESS METRICS

### Milestone Completion
- [ ] M1–M10 all complete by demo day
- [ ] Zero P0 bugs blocking demo
- [ ] All acceptance criteria met per task

### On-Chain Metrics
- [ ] ZK batch: ≥10 recipients processed successfully
- [ ] Proof verification: uses Protocol 25 X-Ray BLS12-381 functions
- [ ] Streaming: per-second accrual visible + claimable
- [ ] Yield: idle capital deposited to Blend; APY live
- [ ] Nullifier: prevents double-payment (test by resubmitting batch)

### UX Metrics
- [ ] Passkey registration: <3 seconds
- [ ] ZK proof generation: <5 seconds per batch
- [ ] Dashboard load: <2 seconds
- [ ] Mobile responsive: iOS 15+, Android 11+
- [ ] No seed phrases shown to any user

### Security Metrics
- [ ] All auth guarded by Address::require_auth()
- [ ] Zero mainnet keys in codebase
- [ ] Hardcoded testnet network guard
- [ ] No exposed transaction hashes in UI
- [ ] Re-entrancy analysis: Soroban safe by default ✓

### Demo Day Readiness
- [ ] 5-minute scripted demo completes smoothly
- [ ] Employer → Employee flow end-to-end
- [ ] Stellar Explorer shows privacy (no individual amounts visible)
- [ ] Video recording prepared
- [ ] Competitive positioning clear to judges

---

## ⚠️ RISK MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| ZK proof generation too slow (>5s) | UX friction, demo fail | Server-side fallback ready; optimize circom constraints |
| Blend/Soroswap unavailable on testnet | Yield feature broken | Fallback to Soroswap-only; test both paths |
| Launchtube relay rate-limited | Transactions fail | Implement retry logic + backoff; monitor relay status |
| Mercury indexer privacy leak | ZK privacy defeated | Test Mercury carefully; fallback to app-side encryption |
| secp256r1 signature mismatch | Passkey auth fails | Test with Passkey Kit SDK vectors; verify Launchtube format |
| Protocol 26 breaking change | Contract incompatibility | Monitor Stellar protocol discussion; have rollback plan |

---

## 📞 HANDOFF CHECKLIST

**For Developer Agent:**
- [ ] Read all DEV-### task descriptions + acceptance criteria
- [ ] Understand Web3 context (Stellar, Soroban, Protocol 26)
- [ ] Access testnet endpoints + Friendbot
- [ ] Install required SDKs (soroban-sdk v26, @stellar/stellar-sdk v14.6.1)
- [ ] Coordinate with Researcher on interdependent tasks (ZK circuit, protocol research)
- [ ] Set up CI/CD for contract testing
- [ ] Clone Noctis repo + set up IDE

**For Research Agent:**
- [ ] Read all RES-### task descriptions + acceptance criteria
- [ ] Understand Protocol 26, Protocol 25 X-Ray, x402/MPP
- [ ] Access Stellar docs, Soroswap/Blend testnet instances
- [ ] Research order: RES-001 → RES-009 (foundation first)
- [ ] Coordinate with Developer on feasibility estimates
- [ ] Document all findings in /docs directory
- [ ] Flag any blockers immediately

**For Product Manager (You):**
- [ ] Track sprint velocity: story points completed per 2 weeks
- [ ] Unblock research/developer dependencies daily
- [ ] Communicate timeline to stakeholders weekly
- [ ] Prepare demo day pitch + competitive positioning
- [ ] Escalate P0 issues (protocol breaking changes, testnet outages)
- [ ] Celebrate M1–M10 completions with team

---

**Document Status:** ✅ Ready for Execution  
**Generated:** May 27, 2026  
**Next Step:** Hand off to Developer and Research agents; begin Sprint 1  

