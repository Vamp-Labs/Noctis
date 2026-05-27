
Noctis
Privacy-First Global Payroll on Stellar
"Pay globally. Stay private. Earn while paying."



PRD Version
v1.0 — Hackathon MVP
Target Network
Stellar TESTNET ONLY
Date
May 2026


Protocol 26
Soroban SDK v26
x402 + MPP Live
Testnet Only



1. Product Vision
Noctis is a privacy-first, enterprise-grade payroll and B2B settlement platform built natively on Stellar. It enables companies to pay global employees and vendors with full confidentiality, leveraging Stellar's 3–5 second finality, sub-cent fees, and Soroban smart contracts. All development and demonstration occurs exclusively on Stellar Testnet (Protocol 26 "Yardstick").

⚠  TESTNET-ONLY SCOPE
This PRD covers the Hackathon MVP. No transaction, wallet deployment, or contract invocation shall touch Stellar Mainnet. All contract addresses, account keys, and token balances are testnet-only and carry no real monetary value.


1.1 Product Names Considered
Noctis — primary (clear, technical)
Privora Pay — alternative (privacy-forward branding)
ShadowPay Stellar — alternative (dark-mode aesthetic)

1.2 Core Value Pillars
Privacy: Zero-Knowledge proofs hide salary amounts and recipient addresses on the public ledger.
Speed: Stellar's 3–5 second finality enables real-time per-second payment streaming.
Yield: Idle payroll capital auto-routed to Blend/Soroswap for yield-bearing RWAs.
Accessibility: Passkey (WebAuthn) login — no seed phrases, no crypto expertise required.
Compliance-Ready: SEP-8 regulated assets, AUTH_REQUIRED, and clawback supported.


2. Problem Statement
Traditional on-chain payroll exposes sensitive salary data, vendor amounts, and business relationships on public explorers — visible to competitors, employees, and regulators.
Enterprises hesitate to adopt crypto payroll due to privacy risks, compliance uncertainty, and poor UX (seed phrases, gas management).
High-frequency or cross-border payment systems on other chains incur prohibitive fees (Ethereum gas, BTC mining fees).
Idle payroll capital sitting in company wallets generates zero yield, representing a significant opportunity cost.
Current Web3 payroll tools lack programmable streaming, native ZK, or institutional-grade compliance hooks.


3. Target Users
3.1 Primary Users
SMEs & Remote-First Startups (10–500 employees): Need private, fast, low-cost multi-currency payroll without treasury overhead.
Freelance Platforms & Staffing Agencies: Batch weekly/monthly vendor payouts with confidential rate structures.
B2B Supply Chains (Cross-border): Invoice settlement across Southeast Asia, LATAM, Africa, Europe with FX auto-conversion.
3.2 Secondary Users
DAOs & Web3-Native Companies: Token-denominated payroll with on-chain governance approval.
NGOs & Aid Organisations: Transparent disbursement totals, confidential individual recipient amounts.
3.3 Geographic Focus
Primary corridors: Southeast Asia (IDR, PHP, VND), LATAM (MXN, BRL, ARS), Africa (NGN, KES, ZAR), Europe (EUR, GBP). Leverages Stellar's native USDC, EURC, and PYUSD stablecoins plus Soroswap DEX for FX settlement.


4. Technology Stack — Testnet Reference
All versions below are current as of May 2026. Note that Horizon is officially deprecated — all contract interactions and new features must use Stellar RPC.

LAYER
TECHNOLOGY
VERSION / ENDPOINT
PURPOSE
Network
Stellar Testnet
Protocol 26 "Yardstick"
Base settlement layer
Smart Contracts
Soroban (Rust)
soroban-sdk v26.0.0
Payroll logic, ZK proofs, yield routing
JS SDK
@stellar/stellar-sdk
v14.6.1 (npm)
RPC + contract bindings
RPC Node
Stellar RPC
https://soroban-testnet.stellar.org
Soroban contract calls (Horizon deprecated)
Legacy API
Horizon (read-only)
https://horizon-testnet.stellar.org
Account lookups only — deprecated; migrate to RPC
Testnet Faucet
Friendbot / fundAddress()
https://friendbot.stellar.org
Fund testnet accounts
Wallet Auth
Passkey Kit + WebAuthn
secp256r1 (CAP-0051)
Biometric login, no seed phrases
Smart Wallet
Launchtube
launchtube.xyz (testnet)
Fee sponsorship, tx relay for smart wallets
Frontend
Next.js 15 + Tailwind 4
React 19
User dashboard
Wallet Browser
Freighter Extension
v≥5.6.4
x402 auth-entry signing
Payment Protocol
x402 (Coinbase)
stellar:testnet live
HTTP-native micropayments
Agentic Payments
MPP (Stripe + Tempo)
stellar-mpp-sdk (experimental)
Machine-to-machine payment flows
Privacy/ZK
Protocol 25 X-Ray
BLS12-381 + Groth16
Native ZK primitives (on-chain)
DEX / AMM
Soroswap + Aquarius
Testnet live
Auto-swap XLM→USDC→EURC
Lending/Yield
Blend Protocol
Testnet live
Yield on idle payroll capital
RWA Tokens
Ondo USDY / Spiko USTBL
SAC testnet wrappers
Tokenized T-bills for yield
Stablecoins
USDC + EURC (Circle)
SAC via stellar contract id asset
Payment settlement tokens
Indexing
Mercury / Galexie
Testnet
Private tx history indexing
SEP Standards
SEP-41 + SEP-45
Token & WebAuthn contract interfaces
Token standard + smart wallet auth
Container
Docker (stellar-core v26)
Ubuntu 24.04 image
Local testnet node


4.1 Protocol 26 "Yardstick" — Key Changes
Protocol 26 went live on Testnet on April 16, 2026 (17:00 UTC) and on Mainnet on May 6, 2026.

CAP-81 Eviction Rewrite: Soroban eviction now works from in-memory state instead of scanning BucketList on disk — faster evictions, fewer disk reads, better scaling.
Protocol-Level Config: New granular configuration settings for smart contract execution, enabling per-contract resource limits.
Efficiency Gains: Significant I/O overhead reduction makes ZK-heavy contracts (like Noctis) more cost-effective at scale.
soroban-sdk v26.0.0: Released May 6, 2026. Updated stellar-xdr to 26.0.1, soroban-env-common/guest/host to 26.1.3. Error-returning codegen (no more panics on invalid UTF-8).


4.2 Protocol 25 "X-Ray" — ZK Cryptography Primitives
Protocol 25 launched on Mainnet January 22, 2026 and on Testnet January 7, 2026. It introduced native ZK cryptography support as a first-class protocol feature.
BLS12-381 Pairing Curve: Native support for pairing-based cryptography enabling Groth16 zk-SNARKs directly in Soroban contracts.
Confidential Asset Foundation: Groundwork for private, compliance-ready transfers — the cryptographic foundation for Noctis's privacy layer.
ZK Proof Verification Host Functions: Soroban host exposes bls12_381_g1_add, bls12_381_g2_add, bls12_381_pairing — the building blocks for Groth16 proof verification.

4.3 Stellar RPC vs Horizon
Horizon is officially deprecated.
Horizon will receive only protocol compatibility patches — no new features. Noctis uses Stellar RPC (soroban-testnet.stellar.org) as the primary data layer. Horizon may be used read-only for legacy account lookups during development but all Soroban interactions go through RPC.
import { rpc } from "@stellar/stellar-sdk";
const server = new rpc.Server("https://soroban-testnet.stellar.org");
// Use server.getLatestLedger(), server.simulateTransaction(), etc.


4.4 Passkey Smart Wallets (SEP-45 / WebAuthn)
Noctis uses Passkey Kit for smart wallet creation and authentication. This removes the need for seed phrases entirely.
secp256r1 (CAP-0051): Natively supported on Stellar since Protocol 21. Enables WebAuthn/passkey signatures to be verified inside Soroban contracts without third-party dependencies.
Passkey Kit SDK: TypeScript SDK for creating and managing Soroban contract accounts with WebAuthn credentials. Handles factory deployment + wallet initialization.
Launchtube: Relay service that abstracts fee payment and sequence number management for smart wallet transactions. Employees never need to hold XLM for gas.
SEP-45: Evolving standard for WebAuthn contract wallet interfaces. Noctis tracks the SEP-45 discussion to maintain compatibility with ecosystem wallets.
Policy Signers: Composable authorization modules (spending limits, allow-lists, timelocks, multi-sig thresholds). Used for employer approval flows and AI agent safety.

4.5 x402 + MPP — Payment Protocols
x402 (Coinbase, March 2026): HTTP-native payment protocol using the 402 status code. Clients pay for API access via signed Soroban authorization entries — no billing dashboards, no API keys. Live on Stellar Testnet with Coinbase facilitator (sponsored fees).
MPP — Machine Payments Protocol (April 3, 2026): Developed by Stripe and Tempo. Extends x402 into machine-readable payment negotiation for autonomous agents. Two modes: charge (one-shot per request) and channel (streaming commitment). Uses stellar-mpp-sdk (experimental) for Stellar integration.
Use in Noctis: x402 gates employer API endpoints (batch upload, report generation). MPP enables AI payroll agents to autonomously approve and route payments within policy limits.


5. Smart Contract Architecture
5.1 Contract Inventory
CONTRACT
FILE
KEY FUNCTIONS
TESTNET DEPLOY
ZK Payroll Dispatcher
payroll_dispatcher.rs
batch_pay(), verify_zk_proof(), emit_nullifier()
CDEPLOY_TESTNET_DISPATCHER
Streaming Vault
streaming_vault.rs
start_stream(), claim_stream(), cancel_stream()
CDEPLOY_TESTNET_VAULT
Yield Router
yield_router.rs
deposit_idle(), withdraw_yield(), get_apy()
CDEPLOY_TESTNET_YIELD
Smart Wallet Factory
wallet_factory.rs
deploy_wallet(), add_passkey(), policy_check()
passkey-kit (upstream)
Policy Signer
policy_signer.rs
set_limit(), check_auth(), revoke()
CDEPLOY_TESTNET_POLICY


5.2 ZK Payroll Dispatcher — Core Contract
The central Soroban contract. Accepts employer-signed payroll batches, verifies ZK proofs off-chain (via Route 14 / custom Groth16 circuit), and dispatches private payments.

Key Rust Structures (soroban-sdk v26.0.0)
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


5.3 ZK Privacy Model
What is PUBLIC on the Stellar ledger: Transaction existence, employer address, total batch amount, ZK proof validity boolean, nullifier hashes.
What is HIDDEN: Individual recipient addresses, individual payment amounts, recipient identity.
Proof System: Groth16 zk-SNARK over BLS12-381 (natively supported by Protocol 25 X-Ray host functions). Circuit proves: (1) each payment commitment is in the Merkle tree, (2) amounts sum correctly, (3) private keys authorize each leaf.
Nullifiers: Each payment leaf emits a unique nullifier hash stored on-chain. Prevents replay/double-payment without revealing who was paid.
Trusted Setup: Groth16 requires a trusted setup ceremony. For the hackathon MVP, a locally generated Powers of Tau ceremony (ptau) is used for testnet.

5.4 Payment Streaming Contract
Mechanism: Employer deposits total salary for a period into Streaming Vault. Contract unlocks tokens linearly over time (per-second accrual).
Claim Function: Employee calls claim_stream() at any time to withdraw all accrued tokens to date.
Cancel: Employer can cancel a stream; remaining un-accrued tokens return to employer; accrued tokens remain claimable by employee.
x402 Integration: Per-API-call streaming charges via x402 can be settled from the same Streaming Vault, enabling pay-as-you-use billing models.

5.5 Yield Router Contract
Auto-deposit: When employer funds payroll, idle capital (funds not yet accrued by employees) is auto-deposited into Blend Protocol lending pools.
Supported Yield Sources (Testnet): Blend USDC/EURC pools, Soroswap Earn, Soroswap+DeFindex EURC Earn, Ondo USDY SAC wrapper, Spiko USTBL/EUTBL wrappers.
Yield Split: 80% of yield returned to employer; 15% to employee bonus pool; 5% reserved for protocol fee subsidy.
APY Oracle: Reads current APY from Blend and Soroswap Aggregator via contract-to-contract calls. Employer UI shows live projected yield.


6. Testnet Endpoints & Network Reference
SERVICE
TESTNET ENDPOINT / VALUE
NOTES
Soroban RPC
https://soroban-testnet.stellar.org
Primary — use instead of Horizon
Horizon (deprecated)
https://horizon-testnet.stellar.org
Read-only legacy; migrate to RPC
Friendbot
https://friendbot.stellar.org?addr=<G...>
Fund XLM on testnet
Stellar Lab
https://lab.stellar.org
Build & submit txns, USDC trustline setup
Network Passphrase
Test SDF Network ; September 2015
Required for all testnet txns
x402 Facilitator
Coinbase facilitator (stellar:testnet)
Sponsored fees on testnet
Launchtube
https://launchtube.xyz
Smart wallet tx relay + fee sponsorship
Soroswap Testnet
https://soroswap.finance (testnet mode)
AMM swaps XLM/USDC/EURC
Blend Testnet
Blend Protocol testnet deployment
Yield pool for idle capital
Mercury Indexer
Mercury Zephyr (testnet)
Event indexing for private history


6.1 SDK Installation (Latest Versions)
Install latest packages — do NOT pin to older versions
# JavaScript/TypeScript SDK (v14.6.1)
npm install @stellar/stellar-sdk@latest

# Passkey Kit
npm install passkey-kit launchtube

# x402 Stellar package
npm install x402-stellar

# Rust / Soroban SDK (v26.0.0)
cargo add soroban-sdk@26.0.0

# Generate TypeScript bindings from WASM
npx @stellar/stellar-sdk generate \
  --wasm ./target/wasm32-unknown-unknown/release/payroll_dispatcher.wasm \
  --output-dir ./src/contracts/payroll-client \
  --contract-name payroll-dispatcher \
  --network testnet


6.2 Testnet Account Setup
Quickstart: Fund a testnet account
# Generate keypair
stellar keys generate --network testnet employer-wallet
stellar keys address employer-wallet   # -> G... public key

# Fund with XLM via Friendbot
stellar keys fund --network testnet employer-wallet
# OR: curl https://friendbot.stellar.org?addr=<G...>

# Add USDC trustline via Stellar Lab
# https://lab.stellar.org/account/fund  (button: "Add USDC trustline")

# In code: rpc.Server.fundAddress() (replaces deprecated requestAirdrop)
await server.fundAddress(keypair.publicKey());



7. SEP Standards Compliance
SEP
NAME
STATUS
USAGE IN Noctis
SEP-41
Token Interface
Required
All payroll tokens implement SEP-41 standard
SEP-45
WebAuthn Smart Wallets
Required
Passkey login + contract account auth
SEP-8
Regulated Assets
Optional
Compliance mode for regulated corridors
SEP-10
Stellar Web Auth
Optional
Fallback JWT auth for API access
SEP-24
Hosted Deposit/Withdrawal
Planned
On/off-ramp for fiat corridors
SEP-31
Cross-Border Payments
Planned
Direct anchor-to-anchor transfers


All token interactions in Noctis use the SEP-41 Token Interface. The StellarAssetClient (CAP-46-6) is used for SAC operations requiring mint/clawback. Smart wallet authentication follows the evolving SEP-45 WebAuthn interface standard tracked at stellar/stellar-protocol Discussion #1499.


8. User Flows (Testnet)
8.1 Employer Onboarding Flow
Navigate to app → click "Connect Wallet".
Register passkey (WebAuthn) → Passkey Kit deploys smart wallet contract via Launchtube factory.
Set policy: spending limit per batch, multi-sig threshold if needed, approved stablecoins.
Fund company wallet with testnet USDC via Friendbot + Stellar Lab.

8.2 Payroll Batch Processing Flow
Upload payroll CSV (columns: recipient_address, amount_usdc, stream_duration_secs).
Frontend generates Merkle tree of payment commitments + Groth16 circuit input.
ZK proof generated client-side (snarkjs / circom) and verified using Protocol 25 X-Ray BLS12-381 host functions.
Employer approves with passkey → PayrollDispatcher.batch_pay() invoked via Launchtube (no XLM gas needed by employer).
Idle capital immediately routed to YieldRouter → deposited into Blend/Soroswap Earn pools.
Streaming vaults activated; employees begin accruing salary per-second.

8.3 Employee Claim Flow
Employee receives push notification / email with claim link.
Login via FaceID / TouchID passkey → smart wallet contract authenticates via secp256r1 __check_auth.
Employee views accrued balance (private: amount visible only to them via indexed events on Mercury).
Click "Claim" → StreamingVault.claim_stream() distributes accrued USDC.
Auto-convert to preferred stablecoin via Soroswap Aggregator (USDC → EURC, XLM, etc.).


9. Hackathon Development Milestones
#
MILESTONE
DELIVERABLE
ACCEPTANCE CRITERIA
M1
Testnet Setup
Local + remote testnet nodes running Protocol 26
getNetwork() returns testnet passphrase; Friendbot funds OK
M2
Smart Wallets
Passkey Kit deployed, passkey registration working
secp256r1 signature verified on-chain in __check_auth
M3
Core Payroll Contract
ZK Payroll Dispatcher deployed to testnet
10-recipient batch processed; nullifiers emitted
M4
ZK Proof Integration
Groth16 proofs verified on-chain
verifyProof() returns true; amounts hidden on explorer
M5
Payment Streaming
Streaming Vault contract live
Per-second stream claimable; cancel_stream() works
M6
x402 Micropayments
x402 server endpoint active on testnet
HTTP 402 → pay → 200 flow demo works
M7
Yield Routing
Idle capital auto-deposited into Blend/Soroswap
APY visible in UI; withdraw_yield() tested
M8
Employee Portal
Self-service portal with passkey login
Employee claims salary; views private history
M9
Employer Dashboard
CSV upload + batch approval UI
Payroll file parsed; batch_pay() invoked
M10
Demo Day Ready
End-to-end demo: employer → employee flow
All M1–M9 pass; UI polished; no mainnet touches




10. Success Metrics (Hackathon Demo)
ZK Batch Payment: Successful private batch payment demo with ≥10 recipients on testnet; Stellar Explorer shows only total + proof, no individual amounts.
Proof Verification: Groth16 proof verified on-chain using Protocol 25 X-Ray BLS12-381 host functions; verify_zk_proof() returns true.
Payment Streaming: Per-second stream visible in UI; claim_stream() callable at any time; real balance updates shown.
Yield Generation: Idle capital deposited into Blend pool; live APY displayed; yield accumulation shown in real time.
Passkey Login: FaceID/TouchID registration and login working; secp256r1 signature verified in __check_auth; no seed phrase shown to user.
x402 Demo: HTTP 402 → payment → 200 flow demonstrated; employer API call gated and charged via x402 on testnet.
UI Polish: Clean Next.js dashboard; responsive; loading states; zero raw txn hashes exposed to end user.
No Mainnet Touches: Hardcoded network guard — if STELLAR_NETWORK !== "TESTNET" app refuses to submit transactions.


11. Competitive Differentiation
11.1 vs. PayZoll (Hackathon 1st Place Reference)
Noctis adds: Groth16 ZK proofs hide individual amounts (PayZoll payments are amount-visible); yield generation on idle capital; x402 and MPP agentic payment integration.
11.2 vs. Traditional Crypto Payroll
Noctis advantages: Fully non-custodial, privacy-preserving, and streaming-native. Policy signers and passkeys match enterprise security requirements without requiring crypto expertise.
11.3 Unique Technical Stack Leverage
Protocol 25 X-Ray: First hackathon project to use native Stellar ZK host functions for payroll privacy.
Protocol 26 Yardstick: Built against the latest testnet protocol; demonstrates Protocol 26 efficiency gains under ZK-heavy workloads.
x402 + MPP: Combines both live agentic payment protocols for employer API metering and AI-driven payroll routing.


12. Security Model
12.1 Smart Contract Security
Re-entrancy: Soroban contracts are inherently re-entrancy safe — each invocation is isolated; no cross-contract call mid-execution.
Integer Overflow: Rust i128 arithmetic with overflow checks; soroban-sdk provides safe math primitives.
Access Control: All privileged functions (batch_pay, set_policy, cancel_stream) gated by Address::require_auth() before execution.
Nullifier Set: On-chain nullifier storage prevents replay attacks; checked before every payment leaf execution.
Clawback / AUTH_REQUIRED: Employer can configure Stellar native AUTH_REQUIRED and AUTH_CLAWBACK flags on payroll token trustlines for regulatory compliance.
12.2 Key Management
Employer Keys: secp256r1 passkey stored in platform secure enclave (Apple Secure Enclave / Android Strongbox). Never exported. Synced via iCloud Keychain / Google Password Manager.
Employee Keys: Same passkey model. Launchtube relay handles all gas — employees never expose Ed25519 keys.
Testnet Keys Only: All keypairs generated with stellar keys --network testnet flag. Hardcoded network guard in frontend prevents mainnet use.
12.3 ZK Circuit Security
Trusted Setup: Hackathon MVP uses a local Powers of Tau ceremony (ptau file) for Groth16 setup. Production would require a multi-party computation (MPC) ceremony.
Circuit Audit: Circom circuit for payment commitment verified against test vectors before testnet deployment.
Soundness: Groth16 is computationally sound — a fraudulent employer cannot forge a proof for a batch they did not authorize without breaking the elliptic curve discrete log.


13. Future Roadmap (Post-Hackathon)
Phase 1 — Hackathon MVP (Current)
Testnet ZK batch payroll, streaming, yield, passkey login, x402.
Protocol 26 testnet deployment; all milestones M1–M10 complete.
Phase 2 — Mainnet Alpha
MPC trusted setup ceremony for Groth16 circuits.
SEP-8 full integration for regulated asset corridors.
Production Launchtube + Mercury indexer deployment.
Fiat on-ramp via SEP-24 anchor integrations.
Phase 3 — AI Payroll Agent
MCP server wrapping payroll contract — natural language payroll via Claude / GPT.
x402-MCP integration: AI agent autonomously calls payroll APIs within employer-set policy limits.
MPP channel mode for high-frequency micro-reimbursement flows.
Phase 4 — Institutional Grade
Tax compliance report generation (PDF export, jurisdiction-aware).
Invoice factoring via Blend RWA lending pools.
Cross-chain bridge for EVM payroll → Stellar settlement.
Full SEP-31 cross-border payment corridor integrations.


Appendix A — References
Protocol 26 Upgrade Guide: https://stellar.org/blog/foundation-news/stellar-yardstick-protocol-26-upgrade-guide
Soroban SDK v26.0.0: https://docs.rs/soroban-sdk/26.0.0
@stellar/stellar-sdk v14.6.1: https://www.npmjs.com/package/@stellar/stellar-sdk
Stellar RPC Docs: https://developers.stellar.org/docs/data/rpc
Smart Wallets / Passkey Kit: https://developers.stellar.org/docs/build/guides/contract-accounts/smart-wallets
SEP-45 Discussion: https://github.com/stellar/stellar-protocol/discussions/1499
x402 on Stellar: https://developers.stellar.org/docs/build/agentic-payments/x402
MPP Docs: https://developers.stellar.org/docs/build/agentic-payments/mpp
Soroswap: https://soroswap.finance
Blend Protocol: https://blend.capital
Mercury Indexer: https://mercurydata.app
Stellar Lab: https://lab.stellar.org
Software Versions: https://developers.stellar.org/docs/networks/software-versions

