# ZK-SDP: Confidential Institutional Payroll
## Full MVP Product Requirements Document — Stellar Testnet
### Version 1.0 | Real-World ZK on Stellar Hackathon | June 2026

---

> **Codename:** ZK-SDP  
> **Full Name:** Zero-Knowledge Stellar Disbursement Protocol for Confidential Payroll  
> **Target Network:** Stellar Testnet (Protocol 26 / Yardstick)  
> **Hackathon:** Stellar Hacks: Real-World ZK — DoraHacks  
> **Status:** MVP Specification — Ready for Development  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Impact](#2-problem-statement--impact)
3. [Protocol Stack](#3-protocol-stack)
4. [Target Audience & User Personas](#4-target-audience--user-personas)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Frontend Specification](#7-frontend-specification)
8. [Technical Architecture](#8-technical-architecture)
9. [Data Model](#9-data-model)
10. [Roadmap & Milestones](#10-roadmap--milestones)
11. [Success Metrics & KPIs](#11-success-metrics--kpis)
12. [Security Considerations](#12-security-considerations)
13. [Open Questions & Decisions Needed](#13-open-questions--decisions-needed)
14. [Glossary](#14-glossary)

---

## 1. Executive Summary

### What We Are Building

ZK-SDP is a **privacy-preserving confidential payroll system** built natively on the Stellar blockchain. It engineers a zero-knowledge cryptographic orchestration layer directly atop Stellar's open-source **Stellar Disbursement Platform (SDP)** — an existing tool designed for transparent bulk payouts — and transforms it into a fully confidential payroll settlement engine.

The system solves a fundamental paradox: enterprises want to leverage the speed and cost efficiency of Stellar's payment rails, but on-chain transparency violates labor law privacy obligations and corporate confidentiality requirements. ZK-SDP resolves this through a **commitment-nullifier-proof architecture** using Noir circuits and Soroban smart contracts.

### How It Works — One Paragraph

An enterprise HR system builds a pay batch locally, calculates per-employee salary commitments via **Poseidon2 hashing** over the BN254 scalar field, inserts them into an **incremental Merkle tree**, and deposits the total payroll pool plus the locked **Merkle root** into a Soroban smart contract. Each employee opens a browser tab, generates a **UltraHonk zero-knowledge proof** client-side (in WASM via Noir.js) that cryptographically proves: (a) their salary allocation is a leaf in the committed Merkle tree, and (b) their one-time nullifier has never been spent. The on-chain `ConfidentialPayrollContract` calls the deployed `UltraHonkVerifierContract`, verifies the proof against the locked root, marks the nullifier as spent, and atomically transfers the exact salary amount to the employee's address — **without ever recording the salary amount in any publicly readable ledger field.**

### Why Now

Stellar's Protocol 25 (X-Ray, live mainnet January 22 2026) and Protocol 26 (Yardstick, live mainnet May 6 2026) have collectively delivered the ZK infrastructure stack that makes this feasible:

- **CAP-0074**: Native BN254 elliptic curve host functions (ec_add, ec_mul, ec_multi_pairing)
- **CAP-0075**: Poseidon and Poseidon2 permutation primitives as native host functions
- **CAP-0080** (Protocol 26): Nine additional BN254 host functions including multi-scalar multiplication (MSM), scalar-field arithmetic, and curve-membership checks — making Noir/UltraHonk proof verification **meaningfully cheaper on-chain**
- **`indextree/ultrahonk_soroban_contract`**: A production-reference Soroban contract wrapping the Noir UltraHonk verifier (Arkworks/co-noir backend), already demonstrating testnet deployments

The Nethermind team's **Stellar Private Payments (PoolStellar)** reference implementation validates the browser-WASM → Soroban verification pipeline using Circom/Groth16. ZK-SDP adapts and specializes this infrastructure for institutional payroll using the more expressive Noir language with UltraHonk.

### Hackathon Positioning

This submission targets the **"Real-World ZK on Stellar"** track: privacy pools, private payments, confidential payroll. ZK-SDP represents a genuinely novel real-world application — not a toy circuit, but a production-architecture MVP addressing a concrete enterprise pain point, deployed end-to-end on Stellar Testnet with a live browser demo.

---

## 2. Problem Statement & Impact

### 2.1 The Privacy Paradox of On-Chain Payroll

Public blockchains achieve trust through radical transparency: every transaction, amount, sender, and receiver is permanently and publicly visible. This is precisely the property that makes them unsuitable for enterprise payroll without privacy infrastructure.

**The regulatory exposure problem:** Labor laws and data privacy regulations in most jurisdictions — including Indonesia's UU PDP (Personal Data Protection Law), the EU's GDPR, and US federal wage privacy standards — require that employee compensation data be kept strictly confidential. Posting salary amounts on-chain violates these regulations by definition.

**The competitive intelligence problem:** If an enterprise paid 200 contractors on-chain using a transparent system, a competitor could trivially map wallet addresses to individuals (via KYC records, LinkedIn correlation, or social engineering) and reconstruct the full salary structure, seniority map, and talent investment strategy of the organization.

**The existing tool gap:** The Stellar Disbursement Platform (SDP) is the most capable bulk payment tool on Stellar — it handles scheduling, recipient onboarding, CSV import, and multi-asset support. But it is architecturally transparent. Every disbursement record, amount, and recipient is visible to any observer. SDP's own documentation acknowledges this. There is currently no privacy-preserving fork or extension of SDP in production.

### 2.2 Why Existing Solutions Fail

| Solution | Problem |
|----------|---------|
| Off-chain payroll (banks/fiat) | High fees, 3-5 day settlement, no programmability, no audit trail |
| Transparent on-chain payroll (SDP) | Salary amounts publicly visible, legally non-compliant |
| Ethereum privacy tools (Tornado Cash fork) | High gas costs, blacklisted by regulators, wrong chain |
| Aztec Network | Separate L2, not Stellar-native, complex migration |
| Manual obfuscation (many wallets) | Operational nightmare, destroys auditability |
| Centralized privacy APIs | Trusted third-party, not verifiably private |

### 2.3 Quantified Impact

- **Global gig economy payroll:** Over $200B in contractor payments processed annually. A significant fraction (growing post-COVID) is cross-border, where stablecoin settlement offers 10-15x cost savings but privacy requirements block adoption.
- **USDC on Stellar:** Stellar already processes millions in USDC disbursements monthly, primarily through humanitarian organizations and SDF-backed programs. Extending to corporate payroll requires confidentiality.
- **Southeast Asia context:** Indonesia alone has 13+ million gig workers. MSME exporters paying distributed contractors face the exact dual problem of wanting Stellar's remittance rails while needing wage privacy.
- **Enterprise sales blocker:** In conversations with potential institutional adopters, the #1 technical objection to on-chain payroll is salary transparency. ZK-SDP directly eliminates this blocker.

### 2.4 Problem in Three Sentences

Enterprises cannot use Stellar's superior payment rails for payroll because on-chain transparency exposes confidential salary data. Existing privacy tools are too expensive, too complex, or live on the wrong chain. ZK-SDP solves this by making individual salary amounts cryptographically invisible while keeping the total payroll commitment verifiable and the system fully auditable to authorized parties.

---

## 3. Protocol Stack

### 3.1 Layer-by-Layer Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER LAYER (Browser)                        │
│   Employer Portal          Employee Withdrawal Portal           │
│   Next.js + React          Noir.js WASM Proof Generation        │
│   Freighter Wallet         Freighter Wallet                     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                    PROOF GENERATION LAYER                       │
│   Noir Circuit (payroll_withdrawal.nr)                          │
│   Backend: Barretenberg / UltraHonk                            │
│   Runtime: @noir-lang/noir_js (WASM in-browser)                │
│   Hash: Poseidon2 over BN254 scalar field                       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                    SOROBAN CONTRACT LAYER                       │
│   ConfidentialPayrollContract (Rust)                            │
│     ├─ Merkle root storage                                      │
│     ├─ Nullifier set (spent tracker)                            │
│     ├─ Token pool (SAC / USDC)                                  │
│     └─ Calls UltraHonkVerifierContract.verify()                 │
│   UltraHonkVerifierContract (indextree/ultrahonk_soroban)       │
│     └─ Arkworks-based Noir UltraHonk verifier (no_std Rust)     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                STELLAR PROTOCOL LAYER (P25 + P26)               │
│   BN254 host functions (CAP-0074): ec_add, ec_mul, pairing      │
│   Poseidon2 host functions (CAP-0075): ZK-native hashing        │
│   BN254 MSM + scalar arithmetic (CAP-0080 / Protocol 26)        │
│   Ledger close: ~5s | Fees: ~0.00001 XLM base                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 ZK Proving System: Noir + UltraHonk

**Noir** is a domain-specific language developed by Aztec for writing zero-knowledge circuits. Unlike Circom (which compiles to R1CS), Noir compiles to **ACIR (Abstract Circuit Intermediate Representation)**, which is backend-agnostic. For this project we use the **UltraHonk** backend via Barretenberg.

**UltraHonk** is a proving system from Aztec/Barretenberg that uses the PLONK arithmetization family with ultra-wide gates. Key properties:
- Transparent setup (no trusted ceremony required for SNARK)
- Efficient recursion support
- Native Poseidon2 gate support
- Compatible with BN254 curve — matching Stellar's Protocol 25/26 host functions

The **`indextree/ultrahonk_soroban_contract`** is the canonical reference for deploying this on Stellar. It wraps the Arkworks-based UltraHonk verifier from Taceo Labs' `co-noir`, refactored to `no_std` for Wasm32 deployment on Soroban. The VK (Verification Key) is set at deploy time; the contract exposes a single `verify(public_inputs, proof) → bool` entrypoint.

**Alternative proven on testnet** (Nethermind PoolStellar): Uses Circom + Groth16 with a separate Groth16 verifier contract and BN254 pairing host functions from CAP-0074. This validates the general pipeline; ZK-SDP specifically uses Noir + UltraHonk for the richer constraint expressibility and no-ceremony advantage.

### 3.3 Cryptographic Primitives

| Primitive | Specification | Stellar Native? | Used For |
|-----------|--------------|-----------------|----------|
| Elliptic Curve | BN254 (Alt-BN128) | ✅ CAP-0074 | Proof pairing verification |
| Hash (ZK-native) | Poseidon2 (BN254 Fr, t=3, d=5) | ✅ CAP-0075 | Merkle tree, leaf commitments, nullifiers |
| Hash (data) | SHA-256 | ✅ (Soroban built-in) | Employee identity hashing (off-chain) |
| MSM | BN254 MSM | ✅ CAP-0080 | UltraHonk verifier polynomial evaluation |
| Scalar Field | BN254 Fr | ✅ CAP-0080 | Circuit arithmetic |
| Proving System | UltraHonk | ✅ (via contract) | ZK proof generation and verification |
| Commitment | Poseidon2(amount ‖ secret ‖ index) | ✅ | Salary commitment (leaf) |
| Nullifier | Poseidon2(secret) | ✅ | Double-spend prevention |

### 3.4 Reference Repositories

| Repo | Role in ZK-SDP |
|------|----------------|
| `indextree/ultrahonk_soroban_contract` | Verifier contract — deploy on testnet, call from payroll contract |
| `NethermindEth/stellar-private-payments` | Pipeline reference — deposit/withdraw flow, ASP pattern, browser WASM integration |
| `stellar/stellar-disbursement-platform-backend` | SDP reference — employer portal UX patterns, disbursement API patterns |
| `stellar/stellar-disbursement-platform-frontend` | SDP dashboard — employer batch management UX reference |
| `noir-lang/noir` | Circuit DSL and `noir_js` WASM runtime |
| `co-noir` (Taceo Labs) | UltraHonk Rust verifier (Arkworks-based) used by indextree contract |
| `alaadotsol/merkle-poseidon` | Poseidon2 sparse Merkle tree in Rust (off-chain tree builder) |
| `tupui/ultrahonk_soroban_contract` | Sudoku ZK example — full client-side proof generation → on-chain verify workflow |

---

## 4. Target Audience & User Personas

### 4.1 Primary Users

**Persona 1: Sofia — Enterprise HR/Finance Director**
- Age: 38 | Role: Head of People Operations, mid-size fintech or export company
- Context: Manages payroll for 50–500 employees/contractors across multiple countries
- Pain Points: Wire fees ($20–$50/transfer), 3–5 day settlement, currency volatility risk, compliance burden of SWIFT documentation
- On-Chain Blocker: "We looked at Stellar USDC but couldn't do it — our employees' salaries would be public."
- Goal: Run confidential payroll in USDC to 200 contractors with proof of payment for auditors, zero salary disclosure on-chain
- Technical Level: Low-to-medium. Uses CSV exports from Workday/SAP. Needs a familiar dashboard.
- Success Signal: Monthly payroll run completed in < 30 minutes, zero compliance escalations

**Persona 2: Dimas — Individual Contractor/Employee**
- Age: 26 | Role: Remote developer/freelancer, paid in USDC
- Context: Receives monthly salary from an enterprise HR system
- Pain Points: Bank takes 3–5 days and charges 2–3% FX fees. Doesn't want employer knowing his wallet balance history.
- On-Chain Concern: Doesn't want coworkers or family correlating his wallet to his salary
- Goal: Receive exact salary securely, generate proof in browser, cash out to bank via Stellar anchor
- Technical Level: Developer-comfortable. Will use browser extension wallet.
- Success Signal: Proof generates in < 2 minutes in browser, payment arrives in one ledger close (~5s)

**Persona 3: Arya — Compliance/Auditor**
- Age: 45 | Role: External auditor or internal CFO
- Context: Must verify that total payroll disbursed matches ledger commitments, without seeing individual salaries
- Pain Points: No existing tool lets him verify on-chain payroll integrity while preserving confidentiality
- Goal: Recompute commitment tree from revealed leaf data (HR CSV), verify Merkle root matches on-chain commitment, confirm no double-spend
- Technical Level: High — familiar with financial data reconciliation, basic cryptographic concepts
- Success Signal: Can independently verify payroll batch solvency from public on-chain data + HR-disclosed CSV

### 4.2 Secondary Users

**Persona 4: Developer / Hackathon Judge**
- Wants to see: clean circuit code, testnet deployment, clear README, working demo
- Evaluates: ZK integration depth, smart contract correctness, UX polish, real-world applicability

---

## 5. User Stories

### Employer (Sofia) Flow

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| E-01 | As an employer, I want to upload a CSV of employee wallets and salary amounts so that I can prepare a payroll batch without manually entering each record | CSV parsed, preview shown with row count and total, validation errors flagged |
| E-02 | As an employer, I want the system to automatically generate Poseidon2 leaf commitments and build a Merkle tree so that individual salaries are hidden before anything touches the chain | Merkle root computed off-chain, leaf secrets generated per employee, employer can download secrets CSV |
| E-03 | As an employer, I want to approve and deposit the total payroll into the confidential payroll contract on Stellar Testnet so that funds are locked and the Merkle root is committed | Freighter signs deposit tx, contract emits `BatchCreated` event, root stored on-chain |
| E-04 | As an employer, I want to notify each employee of their salary and unique withdrawal secret so that they can claim their payment independently | Per-employee notification payload generated (secret + merkle path), shareable via secure channel |
| E-05 | As an employer, I want to see a payroll dashboard showing how many employees have claimed so that I know the batch status | Real-time dashboard pulling Soroban event stream via WebSocket / polling |
| E-06 | As an employer, I want to export an audit report showing commitments and the Merkle root so that an auditor can verify batch integrity | PDF/CSV export with commitments, root, total, batch ID — but no individual salaries |

### Employee (Dimas) Flow

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| W-01 | As an employee, I receive a withdrawal link with my secret encoded so that I can initiate the claim process | Link decodes secret and amount, shows "You have N USDC to claim" |
| W-02 | As an employee, I connect my Freighter wallet so that my withdrawal goes to my chosen address | Wallet connects, address displayed, confirmable |
| W-03 | As an employee, I want the ZK proof to generate automatically in my browser so that I don't need any technical setup | Noir WASM runs in-browser, progress spinner shown, proof generated in < 120s |
| W-04 | As an employee, I want to submit my proof and receive my salary in a single Stellar transaction so that I am paid exactly the right amount | One Freighter signature, transaction lands on-chain, amount credited to wallet |
| W-05 | As an employee, I want to see confirmation that my withdrawal was successful so that I know payment is final | Transaction hash displayed, Stellar Expert explorer link, amount confirmed |
| W-06 | As an employee, I should be blocked from claiming twice so that my nullifier protects me and the employer from double-spend errors | Second withdrawal attempt returns "Nullifier already spent" error |

### Auditor (Arya) Flow

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| A-01 | As an auditor, I want to input a payroll CSV and the on-chain Merkle root so that I can verify batch integrity | Tool recomputes root from CSV leaves, shows match/mismatch vs on-chain |
| A-02 | As an auditor, I want to see a nullifier audit log showing how many leaves have been claimed so that I can confirm no double-spending | Nullifier set size vs leaf count, no duplicate nullifiers |
| A-03 | As an auditor, I can verify total locked amount matches sum of leaves so that I can confirm employer solvency | Contract balance = sum of unclaimed allocations (provable from CSV + on-chain state) |

---

## 6. Functional Requirements

### 6.1 Core System Requirements

#### FR-01: Payroll Commitment Generation (Off-Chain)
- **MUST** accept CSV input: `[employee_index, wallet_address, salary_amount_usdc]`
- **MUST** generate a random 32-byte `nullifier_secret` per employee
- **MUST** compute leaf commitment: `Poseidon2([salary_amount_field, nullifier_secret, employee_index])` over BN254 Fr
- **MUST** build an incremental Poseidon2 Merkle tree of depth 20 (supporting up to 1,048,576 employees)
- **MUST** output: `{ merkle_root, leaves[], per_employee_secrets[] }`
- **MUST** allow employer to verify tree before on-chain commitment

#### FR-02: Payroll Batch Deposit (On-Chain, Soroban)
- **MUST** call `ConfidentialPayrollContract::create_batch(merkle_root, total_amount, batch_id)`
- **MUST** transfer `total_amount` of USDC (or XLM for testnet) from employer address into contract escrow
- **MUST** store `merkle_root` immutably for the batch
- **MUST** emit event: `BatchCreated { batch_id, employer, merkle_root, total_amount, timestamp }`
- **MUST** reject if `total_amount` is zero or merkle_root is zero
- **MUST NOT** allow modifying the Merkle root after commitment

#### FR-03: Employee Withdrawal Secret Distribution
- **MUST** generate per-employee withdrawal payload: `{ batch_id, employee_index, salary_amount, nullifier_secret, merkle_siblings[], merkle_path_indices[] }`
- **MUST** encode payload as URL-safe base64 for secure link sharing
- **SHOULD** allow employer to export bulk payload CSV for delivery via existing HR channels
- **MUST NOT** store withdrawal secrets in any server database (client-side generation only)

#### FR-04: Client-Side ZK Proof Generation
- **MUST** run Noir WASM runtime in-browser via `@noir-lang/noir_js`
- **MUST** generate a UltraHonk proof for circuit `payroll_withdrawal.nr`
- Circuit **MUST** prove:
  - `Poseidon2([salary, nullifier_secret, index]) == merkle_leaf`
  - Merkle path from `merkle_leaf` to `merkle_root` is valid
  - `Poseidon2([nullifier_secret]) == nullifier_hash` (public output)
- Public inputs: `[merkle_root, nullifier_hash, recipient_address, salary_amount]`
- Private inputs: `[salary_amount, nullifier_secret, employee_index, merkle_siblings[20], merkle_path_indices[20]]`
- **MUST** complete proof generation in < 120 seconds on modern hardware
- **MUST** show progress indicator during proof generation

#### FR-05: On-Chain Proof Verification & Payout (Soroban)
- **MUST** call `ConfidentialPayrollContract::withdraw(proof_bytes, public_inputs, recipient)`
- **MUST** verify: `nullifier_hash` not in nullifier set (double-spend prevention)
- **MUST** call `UltraHonkVerifierContract::verify(vk, proof, public_inputs) → bool`
- **MUST** verify public input `merkle_root` matches stored batch root
- On success: mark `nullifier_hash` as spent, transfer `salary_amount` to `recipient`
- On failure: revert with descriptive error: `ProofInvalid`, `NullifierSpent`, `RootMismatch`
- **MUST** emit event: `SalaryWithdrawn { nullifier_hash, recipient, amount, timestamp }` (no salary amount in event — amount only known to recipient and employer)
- **MUST NOT** store salary amount in contract storage (amount proven via ZK, not stored)

#### FR-06: Audit Tools
- **MUST** provide a web-based auditor tool that:
  - Accepts CSV + batch_id as inputs
  - Recomputes Merkle root from leaf commitments
  - Compares computed root vs on-chain root
  - Reports `MATCH` / `MISMATCH`
- **MUST** fetch nullifier set from chain and show claimed/unclaimed ratio

### 6.2 Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Proof generation < 120s on Chrome (modern laptop) |
| Availability | Testnet deployment live for full hackathon judging window |
| Scalability | Merkle tree supports up to depth 20 (1M+ employees) |
| Cost | Single withdrawal tx < 0.1 XLM in Soroban compute fees |
| Security | Nullifier set must be on-chain (not off-chain DB) |
| Privacy | Salary amounts must never appear in Stellar ledger entries, events, or contract storage |
| Auditability | Employer can always recompute and verify the tree from CSV |
| UX | Employee proof-to-payment flow requires < 3 user actions |

---

## 7. Frontend Specification

### 7.1 Application Overview

**Stack:** Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + Shadcn/UI  
**Wallet:** `@stellar/freighter-api`  
**ZK Runtime:** `@noir-lang/noir_js` + `@noir-lang/backend_barretenberg`  
**Stellar SDK:** `@stellar/stellar-sdk` (JS)  
**Routing:** Two-portal SPA — Employer Portal and Employee Withdrawal Portal

### 7.2 Page & Route Structure

```
/                         → Landing Page (Product pitch + CTA buttons)
/employer
  /employer/connect        → Connect Freighter wallet
  /employer/batch/new      → Create new payroll batch (CSV upload)
  /employer/batch/[id]     → Batch detail dashboard
  /employer/batch/[id]/audit → Audit report for batch
/withdraw/[payload_b64]   → Employee withdrawal portal (deep link)
/auditor                  → Standalone auditor tool
```

### 7.3 Component Breakdown

#### 7.3.1 Landing Page (`/`)

| Component | Description |
|-----------|-------------|
| `<HeroSection />` | Headline: "Payroll. Private by proof." Sub: ZK-SDP tagline, CTA buttons |
| `<ProtocolStackDiagram />` | Visual SVG showing the layers: Employer → Noir → Soroban → Employee |
| `<HowItWorksSteps />` | 4-step explainer with icons (Commit → Deposit → Prove → Claim) |
| `<TechBadges />` | Stellar, Noir, UltraHonk, Poseidon2, BN254, Soroban logos |

**Metadata:**
```typescript
export const metadata: Metadata = {
  title: "ZK-SDP — Confidential Payroll on Stellar",
  description: "Privacy-preserving institutional payroll using zero-knowledge proofs on Stellar Soroban. Powered by Noir UltraHonk.",
  openGraph: { title: "ZK-SDP", image: "/og-zksdp.png" }
}
```

#### 7.3.2 Employer Batch Creation (`/employer/batch/new`)

| Component | Props / State | Behavior |
|-----------|---------------|----------|
| `<CSVUploader />` | `onParsed: (rows: PayrollRow[]) => void` | Drag-and-drop CSV, validates columns, shows preview table |
| `<PayrollPreviewTable />` | `rows: PayrollRow[]`, `showSalaries: boolean` | Preview with toggle to hide salary column |
| `<CommitmentBuilder />` | `rows: PayrollRow[]` | Runs Poseidon2 tree builder (WASM), shows progress, outputs merkle root |
| `<MerkleTreeVisualizer />` | `root: string`, `leafCount: number` | Mini tree diagram showing depth and root hash (truncated) |
| `<DepositConfirmModal />` | `totalAmount, merkleRoot, batchId` | Summary screen before signing Freighter tx |
| `<SecretExporter />` | `secrets: PerEmployeeSecret[]` | Download JSON/CSV of per-employee withdrawal payloads |

**CSV Format:**
```
employee_index,wallet_address,salary_amount_usdc
0,GDQJUTQYK2MQX2CLIS73IFRGT34NKQFZQWM...,5000.00
1,GBQX...,3500.00
```

**Commitment Builder Logic:**
```typescript
// In-browser (runs in Web Worker to avoid blocking UI)
async function buildCommitmentTree(rows: PayrollRow[]): Promise<TreeResult> {
  const { poseidon2Hash, buildMerkleTree } = await import('./zk-utils.wasm');
  
  const leaves = rows.map(row => ({
    index: row.employee_index,
    secret: crypto.getRandomValues(new Uint8Array(32)),
    commitment: poseidon2Hash([
      toBN254Field(row.salary_amount_usdc),
      toBN254Field(row.secret),
      toBN254Field(row.employee_index)
    ])
  }));
  
  const tree = buildMerkleTree(leaves.map(l => l.commitment), TREE_DEPTH);
  return { root: tree.root, leaves, tree };
}
```

#### 7.3.3 Batch Dashboard (`/employer/batch/[id]`)

| Component | Data Source | Description |
|-----------|-------------|-------------|
| `<BatchHeader />` | On-chain state | Batch ID, status badge, total locked, employer address |
| `<ClaimProgressBar />` | Nullifier count / leaf count | "47 of 200 employees claimed" |
| `<RecentClaimsTable />` | Soroban event stream | Nullifier hash, timestamp, amount (hidden) — no employee identification |
| `<BatchActions />` | — | Buttons: "Export Audit Report", "View Merkle Root", "Copy Root Hash" |
| `<WebSocketStatus />` | WS connection | Live indicator for real-time event streaming |

#### 7.3.4 Employee Withdrawal Portal (`/withdraw/[payload_b64]`)

This is the most UX-critical page. Must be understandable to a non-technical employee.

| Component | State | Description |
|-----------|-------|-------------|
| `<PaymentBanner />` | Decoded payload | "You have {amount} USDC ready to claim from {company}" |
| `<WalletConnector />` | `walletAddress, isConnected` | "Connect Freighter" button, shows address on connect |
| `<ProofGenerator />` | `status: idle/generating/done/error` | Central UX element — progress ring, step indicators |
| `<ProofStepIndicator />` | `currentStep: 1-4` | "Loading circuit... Constructing witnesses... Proving... Done ✓" |
| `<WithdrawButton />` | `proof, publicInputs, isReady` | Disabled until proof ready, triggers Freighter sign |
| `<SuccessScreen />` | `txHash` | Confirmation: "Payment received!", Stellar Expert link, amount |
| `<ErrorScreen />` | `error: AppError` | User-friendly error messages (NullifierSpent, ProofFailed, etc.) |

**Proof Generation Flow (in component):**
```typescript
async function generateProof(payload: WithdrawalPayload, recipientAddress: string) {
  setStatus('loading_circuit');
  const { Noir } = await import('@noir-lang/noir_js');
  const { UltraHonkBackend } = await import('@noir-lang/backend_barretenberg');
  
  const circuit = await fetch('/circuits/payroll_withdrawal.json').then(r => r.json());
  const backend = new UltraHonkBackend(circuit.bytecode);
  const noir = new Noir(circuit);
  
  setStatus('constructing_witness');
  const { witness } = await noir.execute({
    // Private inputs
    salary_amount: payload.salary_amount,
    nullifier_secret: payload.nullifier_secret,
    employee_index: payload.employee_index,
    merkle_siblings: payload.merkle_siblings,
    merkle_path_indices: payload.merkle_path_indices,
    // Public inputs
    merkle_root: payload.merkle_root,
    expected_amount: payload.salary_amount,
    recipient_address: addressToField(recipientAddress),
  });
  
  setStatus('proving');
  const { proof, publicInputs } = await backend.generateProof(witness);
  
  setStatus('done');
  return { proof, publicInputs };
}
```

#### 7.3.5 Auditor Tool (`/auditor`)

| Component | Description |
|-----------|-------------|
| `<BatchIdInput />` | Enter batch ID or on-chain address |
| `<CSVReloader />` | Upload original employer CSV (salaries revealed to auditor) |
| `<RootVerifierWidget />` | Computes root from CSV leaves, shows ✅ MATCH / ❌ MISMATCH |
| `<NullifierAuditTable />` | Shows on-chain nullifier set, claimed status per leaf |
| `<SolvencyReport />` | Total locked vs claimed vs remaining — balance proof |

### 7.4 Design System

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#6B21A8` (purple-900) | ZK/crypto aesthetic, primary CTAs |
| Secondary | `#0EA5E9` (sky-500) | Stellar blue, secondary elements |
| Background | `#0F0A1A` | Deep dark background |
| Surface | `#1A1030` | Cards, panels |
| Success | `#10B981` | Proof verified, payment confirmed |
| Error | `#EF4444` | Proof failed, nullifier spent |
| Font | Inter (UI) + JetBrains Mono (hashes, keys) | |
| Border radius | 12px cards, 8px inputs | |

### 7.5 Metadata Specification

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: { template: '%s | ZK-SDP', default: 'ZK-SDP — Confidential Payroll on Stellar' },
  description: 'Privacy-preserving institutional payroll using Noir zero-knowledge proofs on Stellar Soroban. UltraHonk + Poseidon2 + Protocol 26.',
  keywords: ['Stellar', 'zero-knowledge', 'ZK', 'payroll', 'Noir', 'UltraHonk', 'Soroban', 'privacy', 'BN254'],
  authors: [{ name: 'ArbaLabs' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://zksdp.vercel.app',
    siteName: 'ZK-SDP',
    title: 'ZK-SDP — Confidential Payroll on Stellar',
    description: 'Salary amounts hidden by cryptographic proof. Verified on-chain. Compliant.',
    images: [{ url: '/og-zksdp.png', width: 1200, height: 630, alt: 'ZK-SDP' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZK-SDP — Confidential Payroll on Stellar',
    description: 'Zero-knowledge payroll: Noir + UltraHonk + Soroban.',
    images: ['/og-zksdp.png'],
  },
}
```

---

## 8. Technical Architecture

### 8.1 System Architecture Diagram

```
                    ┌──────────────────────────────────────────┐
                    │           EMPLOYER SYSTEM                │
                    │                                          │
                    │  CSV (salaries) ──► Tree Builder (WASM)  │
                    │                         │                │
                    │              Merkle Root + Leaf Secrets  │
                    └──────────────┬───────────────────────────┘
                                   │ Deposit TX (Freighter)
                    ┌──────────────▼───────────────────────────┐
                    │        STELLAR TESTNET LAYER             │
                    │                                          │
                    │  ┌────────────────────────────────────┐  │
                    │  │  ConfidentialPayrollContract       │  │
                    │  │  ├─ State: merkle_root             │  │
                    │  │  ├─ State: nullifier_set (Map)     │  │
                    │  │  ├─ State: token_balance           │  │
                    │  │  └─ create_batch() / withdraw()    │  │
                    │  └─────────────┬──────────────────────┘  │
                    │                │ XCall (cross-contract)   │
                    │  ┌─────────────▼──────────────────────┐  │
                    │  │  UltraHonkVerifierContract         │  │
                    │  │  (indextree/ultrahonk_soroban)     │  │
                    │  │  verify(vk, proof, pub_inputs)     │  │
                    │  │  Uses: BN254 host functions         │  │
                    │  │        Poseidon2 host functions     │  │
                    │  │        BN254 MSM (P26)              │  │
                    │  └────────────────────────────────────┘  │
                    └────────────┬─────────────────────────────┘
                                 │ Events (BatchCreated, SalaryWithdrawn)
              ┌──────────────────▼──────────────────┐
              │        EVENT INDEXER / WS RELAY      │
              │  stellar-sdk EventsRPC polling       │
              │  WebSocket broadcast (Socket.io)     │
              └──────────────────┬──────────────────┘
                                 │
         ┌───────────────────────▼──────────────────────┐
         │            EMPLOYEE BROWSER                   │
         │                                               │
         │  Payload (b64) ──► ZK Proof Gen (Noir WASM)  │
         │                         │                     │
         │  public_inputs + proof ─► Withdraw TX         │
         │  (Freighter signs and submits to Soroban)     │
         └───────────────────────────────────────────────┘
```

### 8.2 Smart Contract Layer

#### 8.2.1 `ConfidentialPayrollContract` (Soroban / Rust)

```rust
// contracts/confidential_payroll/src/lib.rs
use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, Map, Vec, token};

#[contracttype]
pub enum DataKey {
    MerkleRoot(u64),        // batch_id → root
    TokenBalance(u64),      // batch_id → locked amount  
    NullifierSpent(BytesN<32>), // nullifier_hash → bool
    VerifierContract,        // Address of UltraHonk verifier
    Admin,                   // Employer/deployer
}

#[contract]
pub struct ConfidentialPayrollContract;

#[contractimpl]
impl ConfidentialPayrollContract {
    
    /// Deploy and initialize the contract
    pub fn initialize(
        env: Env,
        verifier: Address,     // UltraHonkVerifierContract address
        vk_hash: BytesN<32>,   // Hash of the verification key (for verification)
    ) {
        env.storage().instance().set(&DataKey::VerifierContract, &verifier);
    }

    /// Employer: deposit total payroll and commit Merkle root
    pub fn create_batch(
        env: Env,
        employer: Address,
        batch_id: u64,
        merkle_root: BytesN<32>,
        token: Address,
        total_amount: i128,
    ) {
        employer.require_auth();
        
        // Store Merkle root (immutable after this)
        let root_key = DataKey::MerkleRoot(batch_id);
        assert!(!env.storage().instance().has(&root_key), "Batch already exists");
        env.storage().instance().set(&root_key, &merkle_root);
        
        // Transfer tokens from employer to contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&employer, &env.current_contract_address(), &total_amount);
        env.storage().instance().set(&DataKey::TokenBalance(batch_id), &total_amount);
        
        // Emit event
        env.events().publish(
            (symbol_short!("BatchCreated"), batch_id),
            (employer, merkle_root, total_amount),
        );
    }
    
    /// Employee: submit ZK proof and receive salary
    pub fn withdraw(
        env: Env,
        batch_id: u64,
        proof: Bytes,
        public_inputs: Vec<BytesN<32>>,
        // public_inputs = [merkle_root, nullifier_hash, recipient_address_field, salary_amount_field]
        recipient: Address,
        token: Address,
        salary_amount: i128,
    ) {
        // 1. Extract and verify public inputs
        let claimed_root: BytesN<32> = public_inputs.get(0).unwrap();
        let nullifier_hash: BytesN<32> = public_inputs.get(1).unwrap();
        
        // 2. Check Merkle root matches batch commitment
        let stored_root: BytesN<32> = env.storage().instance()
            .get(&DataKey::MerkleRoot(batch_id)).unwrap();
        assert!(claimed_root == stored_root, "Root mismatch");
        
        // 3. Check nullifier not spent (anti-double-spend)
        let nf_key = DataKey::NullifierSpent(nullifier_hash.clone());
        assert!(!env.storage().instance().has(&nf_key), "Nullifier already spent");
        
        // 4. Call UltraHonk verifier (cross-contract call)
        let verifier: Address = env.storage().instance().get(&DataKey::VerifierContract).unwrap();
        let verifier_client = UltraHonkVerifierContractClient::new(&env, &verifier);
        let verified = verifier_client.verify(&proof, &public_inputs);
        assert!(verified, "Proof verification failed");
        
        // 5. Mark nullifier as spent (BEFORE transfer — re-entrancy safe)
        env.storage().instance().set(&nf_key, &true);
        
        // 6. Transfer salary to recipient
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &recipient, &salary_amount);
        
        // 7. Emit event — NO salary amount in event (privacy preserved)
        env.events().publish(
            (symbol_short!("Withdrawn"), nullifier_hash),
            (recipient, env.ledger().timestamp()),
        );
    }
    
    /// Read-only: get stored Merkle root
    pub fn get_root(env: Env, batch_id: u64) -> Option<BytesN<32>> {
        env.storage().instance().get(&DataKey::MerkleRoot(batch_id))
    }
    
    /// Read-only: check if nullifier is spent
    pub fn is_spent(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().instance().has(&DataKey::NullifierSpent(nullifier))
    }
}
```

#### 8.2.2 `UltraHonkVerifierContract` (Reference: `indextree/ultrahonk_soroban_contract`)

Deployed as a **separate contract** on testnet. ZK-SDP's payroll contract calls it via cross-contract invocation. The verifier:
- Accepts `(proof: Bytes, public_inputs: Vec<BytesN<32>>)` 
- VK is set at deploy time (circuit-specific)
- Returns `bool`
- Uses CAP-0074 BN254 host functions + CAP-0080 MSM host functions

**Deployment:**
```bash
# Build circuit and extract VK
cd circuits/payroll_withdrawal
nargo compile
bb write_vk -b ./target/payroll_withdrawal.json
# VK is at ./target/vk

# Deploy verifier (testnet)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/ultrahonk_soroban_contract.wasm \
  --source deployer \
  --network testnet \
  -- \
  --vk_bytes-file-path ./circuits/payroll_withdrawal/target/vk
```

### 8.3 Noir Circuit Layer (`circuits/payroll_withdrawal/src/main.nr`)

```noir
use dep::std::hash::poseidon2;

// Merkle tree depth
global DEPTH: u32 = 20;

fn merkle_root(
    leaf: Field,
    index: Field,
    path: [Field; 20],
    path_indices: [u1; 20]
) -> Field {
    let mut current = leaf;
    let index_bits = index.to_le_bits(DEPTH);
    
    for i in 0..DEPTH {
        let sibling = path[i];
        let is_right = path_indices[i];
        
        let (left, right) = if is_right == 1 {
            (sibling, current)
        } else {
            (current, sibling)
        };
        
        current = poseidon2::Poseidon2::hash([left, right], 2);
    }
    current
}

fn main(
    // === PRIVATE INPUTS ===
    salary_amount: u64,
    nullifier_secret: Field,
    employee_index: Field,
    merkle_siblings: [Field; 20],
    merkle_path_indices: [u1; 20],
    
    // === PUBLIC INPUTS ===
    merkle_root_pub: pub Field,
    nullifier_hash_pub: pub Field,
    recipient_address: pub Field,
    expected_amount: pub u64,
) {
    // 1. Enforce salary matches declared amount (prevents proof reuse for different amounts)
    assert(salary_amount == expected_amount);
    
    // 2. Compute leaf commitment: Poseidon2(amount, secret, index)
    let leaf = poseidon2::Poseidon2::hash(
        [salary_amount as Field, nullifier_secret, employee_index], 
        3
    );
    
    // 3. Verify Merkle inclusion proof
    let computed_root = merkle_root(leaf, employee_index, merkle_siblings, merkle_path_indices);
    assert(computed_root == merkle_root_pub);
    
    // 4. Compute and verify nullifier (prevents double-spend)
    let computed_nullifier = poseidon2::Poseidon2::hash([nullifier_secret], 1);
    assert(computed_nullifier == nullifier_hash_pub);
    
    // 5. Recipient binding — recipient_address is public, binding to this proof
    // (No constraint needed; being public makes it part of the verification key check)
    let _ = recipient_address;
}
```

**Nargo.toml:**
```toml
[package]
name = "payroll_withdrawal"
type = "bin"
authors = ["ArbaLabs"]
compiler_version = ">=0.36.0"

[dependencies]
std = { path = "../../node_modules/@noir-lang/noir_stdlib" }
```

### 8.4 Agent Layer (Off-Chain TypeScript Service)

The agent layer handles computationally intensive or stateful off-chain tasks:

#### `tree-builder` — Merkle Tree Construction
```typescript
// services/tree-builder/index.ts
export class PayrollTreeBuilder {
  private depth: number = 20;
  
  async buildTree(rows: PayrollRow[]): Promise<TreeBuildResult> {
    const leaves: LeafData[] = rows.map(row => {
      const secret = generateSecureSecret(); // crypto.getRandomValues
      const commitment = poseidon2Hash([
        toField(row.salary_amount),
        toField(secret),
        toField(row.employee_index)
      ]);
      return { index: row.employee_index, secret, commitment, wallet: row.wallet_address };
    });
    
    const tree = new IncrementalPoseidon2MerkleTree(this.depth);
    for (const leaf of leaves) {
      tree.insert(leaf.commitment);
    }
    
    const merkleRoot = tree.root();
    const withPaths = leaves.map(leaf => ({
      ...leaf,
      siblings: tree.siblings(leaf.index),
      pathIndices: tree.pathIndices(leaf.index)
    }));
    
    return { merkleRoot, leaves: withPaths };
  }
}
```

#### `event-indexer` — Soroban Event Listener
```typescript
// services/event-indexer/index.ts
import { SorobanRpc } from '@stellar/stellar-sdk';

class SorobanEventIndexer {
  async pollBatchEvents(contractId: string, batchId: bigint) {
    const rpc = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    const events = await rpc.getEvents({
      startLedger: this.lastLedger,
      filters: [{
        type: 'contract',
        contractIds: [contractId],
        topics: [['BatchCreated', batchId.toString()], ['Withdrawn']]
      }]
    });
    
    this.broadcast(events.events);
  }
}
```

### 8.5 Cross-Chain Layer

**MVP Scope (Testnet):** Stellar-only. No cross-chain for MVP.

**Post-MVP Cross-Chain Design:**

```
Stellar Testnet ──────────────────────────────────────────────────
  ConfidentialPayrollContract                                      
  ZK Proof Verified On Stellar                                     
         │                                                         
         │ Wormhole Message (verified-payment-receipt)             
         ▼                                                         
  Ethereum / Base ────────────────────────────────────────────────
  CrossChainPayrollSettlement.sol                                  
  Mints USDC on destination chain to recipient                     
```

Rationale: Some enterprise workflows require settlement on multiple chains (e.g., Stellar for global payroll, Base for DeFi yield on salary). Wormhole VAA (Verified Action Approval) would carry the proof verification result cross-chain. This is a post-MVP milestone.

### 8.6 Web2 Layer (Backend API)

For MVP, the backend is minimal and stateless — the goal is maximum decentralization:

```
/api
  /api/batch/[id]/status          → Proxy to Soroban RPC for batch state
  /api/batch/[id]/events          → SSE stream of SorobanEventIndexer events
  /api/circuit/payroll_withdrawal  → Serve compiled circuit JSON (can also be CDN)
```

No salary data, secrets, or PII is stored on the backend. All sensitive state is:
- Employer-side: locally generated secrets CSV
- Employee-side: URL-encoded payload
- On-chain: Merkle root + nullifier set (no salaries)

**Tech:** Node.js + Hono.js (lightweight) or Next.js API routes

### 8.7 WebSocket Layer

Real-time employer dashboard uses WebSocket for live batch status:

```typescript
// server/ws/batch-events.ts
import { Server as SocketServer } from 'socket.io';

export function attachBatchSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, { cors: { origin: '*' } });
  
  io.on('connection', (socket) => {
    socket.on('subscribe_batch', async (batchId: string) => {
      // Join batch-specific room
      socket.join(`batch:${batchId}`);
      
      // Send current state immediately
      const state = await getBatchState(batchId);
      socket.emit('batch_state', state);
    });
  });
  
  // Event indexer → broadcast to room
  eventIndexer.on('SalaryWithdrawn', (event) => {
    io.to(`batch:${event.batchId}`).emit('claim_event', {
      nullifierHash: event.nullifierHash,  // NO amount, NO recipient identification
      timestamp: event.timestamp,
      claimedCount: event.totalClaimed,
    });
  });
}
```

**WebSocket Events:**
| Event | Direction | Payload | Notes |
|-------|-----------|---------|-------|
| `subscribe_batch` | Client→Server | `{ batchId }` | Subscribe to batch updates |
| `batch_state` | Server→Client | `{ root, totalLeaves, claimedCount, totalAmount }` | Initial state |
| `claim_event` | Server→Client | `{ nullifierHash, timestamp, claimedCount }` | New claim — no salary |
| `batch_closed` | Server→Client | `{ batchId, finalCount }` | All claimed |

---

## 9. Data Model

### 9.1 On-Chain State (Soroban Contract Storage)

```
ConfidentialPayrollContract storage:
┌─────────────────────────────────────────────────────────────────┐
│ Key                              │ Value                        │
├──────────────────────────────────┼──────────────────────────────┤
│ DataKey::MerkleRoot(batch_id)    │ BytesN<32>  (Poseidon2 root) │
│ DataKey::TokenBalance(batch_id)  │ i128        (USDC locked)    │
│ DataKey::NullifierSpent(nf_hash) │ bool        (true if spent)  │
│ DataKey::VerifierContract        │ Address                      │
│ DataKey::Admin                   │ Address                      │
└─────────────────────────────────────────────────────────────────┘

CRITICAL: salary_amount is NEVER stored in contract state.
```

### 9.2 Off-Chain Data Structures (Employer-Side)

```typescript
// Payroll batch input (CSV → in-memory)
interface PayrollRow {
  employee_index: number;        // 0-indexed, determines leaf position in tree
  wallet_address: string;        // Stellar G-address
  salary_amount_usdc: number;    // Plain number, e.g. 5000.00
}

// Generated leaf data
interface LeafData {
  employee_index: number;
  wallet_address: string;
  salary_amount: bigint;         // In stroops or USDC micro units
  nullifier_secret: Uint8Array;  // 32 random bytes — MUST be kept secret
  commitment: Field;             // Poseidon2(amount, secret, index) — BN254 Fr element
  merkle_siblings: Field[];      // Length = DEPTH (20)
  merkle_path_indices: number[]; // 0 or 1 per level
}

// Per-employee withdrawal payload (encoded in URL)
interface WithdrawalPayload {
  batch_id: string;
  contract_address: string;      // Soroban contract ID
  token_address: string;         // USDC SAC address on testnet
  employee_index: number;
  salary_amount: string;         // Human-readable: "5000.00"
  salary_amount_field: string;   // BN254 Fr representation
  nullifier_secret: string;      // Hex-encoded 32 bytes
  merkle_root: string;           // Hex
  merkle_siblings: string[];     // Array of 20 hex strings
  merkle_path_indices: number[]; // Array of 20 bits
}

// Tree build result
interface TreeBuildResult {
  batch_id: string;
  merkle_root: string;           // 0x-prefixed hex
  total_amount: number;          // Sum of all salaries
  leaf_count: number;
  leaves: LeafData[];
}
```

### 9.3 Soroban Events Schema

```typescript
// BatchCreated event
{
  topics: ['BatchCreated', batch_id: u64],
  data: {
    employer: Address,
    merkle_root: BytesN<32>,
    total_amount: i128,
    // Note: total amount IS visible to show solvency — only individual salaries are hidden
  }
}

// SalaryWithdrawn event
{
  topics: ['Withdrawn', nullifier_hash: BytesN<32>],
  data: {
    recipient: Address,
    timestamp: u64,
    // NO amount — privacy preserved even in events
  }
}
```

### 9.4 ZK Circuit Witness Schema

```
Private (not on-chain, not in proof, known only to prover):
├── salary_amount: u64           — The employee's salary in base units
├── nullifier_secret: Field      — 32-byte secret, BN254 Fr element
├── employee_index: Field        — Position in Merkle tree
├── merkle_siblings[20]: Field[] — Co-path for Merkle proof
└── merkle_path_indices[20]: u1[]— Left/right indicators

Public (in proof, verified on-chain):
├── merkle_root_pub: Field       — Locked Merkle root (matches on-chain storage)
├── nullifier_hash_pub: Field    — Poseidon2(secret) — stored in nullifier set
├── recipient_address: Field     — Target Stellar address as field element
└── expected_amount: u64         — Amount to receive (verified via ZK, not stored)
```

### 9.5 Merkle Tree Specification

| Parameter | Value |
|-----------|-------|
| Type | Incremental (append-only) |
| Hash function | Poseidon2 (BN254 Fr, t=3, d=5, rounds_f=8, rounds_p=56) |
| Depth | 20 (capacity: 1,048,576 employees) |
| Empty leaf | `Poseidon2([0])` (domain-separated zero value) |
| Leaf formula | `Poseidon2([amount ‖ secret ‖ index])` |
| Node formula | `Poseidon2([left_child ‖ right_child])` |
| Root | Single 32-byte BN254 Fr field element |

---

## 10. Roadmap & Milestones

### Phase 0: Research & Setup (Week 1 — Days 1-3)
| Task | Deliverable | Status |
|------|-------------|--------|
| Deploy `indextree/ultrahonk_soroban_contract` to testnet | Verifier contract address | 🔲 |
| Write and compile `payroll_withdrawal.nr` circuit | `payroll_withdrawal.json` artifact | 🔲 |
| Verify circuit with `nargo prove` + `bb verify` locally | Passing test | 🔲 |
| Deploy verifier with circuit VK on testnet | Testnet contract ID | 🔲 |
| Set up project monorepo (Turborepo: contracts/, circuits/, frontend/, services/) | Working `pnpm dev` | 🔲 |

### Phase 1: Core Contracts (Week 1 — Days 3-5)
| Task | Deliverable | Status |
|------|-------------|--------|
| Write `ConfidentialPayrollContract` in Rust | Contract source | 🔲 |
| Unit tests: `create_batch`, `withdraw`, nullifier checks | All tests passing | 🔲 |
| Integration test: full flow (deposit → prove → withdraw) | Local testnet passing | 🔲 |
| Deploy `ConfidentialPayrollContract` to Stellar testnet | Contract ID published | 🔲 |
| Verify cross-contract call to UltraHonk verifier on testnet | On-chain verification working | 🔲 |

### Phase 2: Off-Chain Services (Week 1-2 — Days 4-6)
| Task | Deliverable | Status |
|------|-------------|--------|
| Poseidon2 Merkle tree builder in TypeScript | `buildTree(rows) → TreeBuildResult` | 🔲 |
| Withdrawal payload encoder/decoder | URL payload round-trip test | 🔲 |
| Soroban event indexer (polling + SSE) | Real-time event stream | 🔲 |
| WebSocket server for employer dashboard | Live claim updates | 🔲 |

### Phase 3: Frontend (Week 2 — Days 6-9)
| Task | Deliverable | Status |
|------|-------------|--------|
| Landing page | Deployed on Vercel | 🔲 |
| Employer CSV upload + tree builder UI | Functional employer flow | 🔲 |
| Batch deposit (Freighter integration) | Live testnet deposit | 🔲 |
| Employer dashboard (real-time claims) | WebSocket updates working | 🔲 |
| Employee withdrawal portal (Noir WASM) | Proof generation in browser | 🔲 |
| Proof submission + payout confirmation | End-to-end working | 🔲 |
| Auditor tool | Root verification working | 🔲 |

### Phase 4: Integration & Polish (Week 2 — Days 10-12)
| Task | Deliverable | Status |
|------|-------------|--------|
| Full end-to-end test (3-employee batch on testnet) | Working demo | 🔲 |
| Demo video (2-3 min walkthrough) | Submitted | 🔲 |
| README documentation | Published on GitHub | 🔲 |
| DoraHacks submission | Submitted | 🔲 |

### Post-Hackathon Milestones (v1.0 — Production)

| Milestone | Timeline | Description |
|-----------|----------|-------------|
| Security audit | Month 1-2 | Full audit of Noir circuit and Soroban contracts |
| Trusted setup ceremony | Month 2 | If migrating to Groth16 for gas optimization |
| SDP Integration | Month 3 | Fork official SDP backend, add ZK payroll mode |
| USDC mainnet deployment | Month 4 | Deploy on Stellar mainnet with real USDC |
| KYB compliance layer (ASP) | Month 5 | Association Set Provider for regulatory compliance |
| Cross-chain settlement (Wormhole) | Month 6 | Multi-chain salary settlement |
| Mobile proof generation | Month 7 | iOS/Android Noir WASM via React Native |
| Enterprise pilot | Month 8 | First paying enterprise customer (50+ employees) |

---

## 11. Success Metrics & KPIs

### 11.1 Hackathon Evaluation Metrics (Immediate)

| Metric | Target | Measurement |
|--------|--------|-------------|
| ZK Proof generates on testnet | ✅ Yes | Live demo |
| Full E2E on Stellar Testnet | ✅ Yes | Testnet tx explorer links in README |
| Proof verification time (on-chain) | < 1 ledger close (~5s) | Soroban tx timing |
| Browser proof generation time | < 120 seconds | Timer in demo video |
| Circuit constraints count | < 500,000 gates | `nargo info` output |
| README quality | Comprehensive | Judging rubric |

### 11.2 Technical KPIs

| KPI | Target | How to Measure |
|-----|--------|----------------|
| Soroban instruction usage per verify call | < 25M instructions | Contract simulation |
| Proof size (UltraHonk) | < 10 KB | `proof.length` |
| Proof generation time (desktop browser) | < 120s | Chrome DevTools |
| Gas cost per withdrawal tx | < 0.1 XLM | Stellar testnet fee |
| Merkle tree build time (200 employees) | < 5 seconds | Performance benchmark |
| False positive proof acceptance rate | 0% | Security property |

### 11.3 Product KPIs (Post-Launch)

| KPI | 3-Month Target | 6-Month Target |
|-----|----------------|----------------|
| Enterprise pilots onboarded | 2 | 5 |
| Total payroll batches created | 10 | 50 |
| Total USDC disbursed privately | $10,000 | $500,000 |
| Employees successfully claimed | 50 | 500 |
| Double-spend attempts blocked | 0 successful | 0 successful |
| Average time: CSV upload → funds live | < 10 minutes | < 5 minutes |
| Employer NPS (survey) | > 7 | > 8 |
| Auditor verification success rate | 100% | 100% |

### 11.4 Security KPIs

| Security Metric | Target |
|-----------------|--------|
| Nullifier collisions (across batches) | 0 |
| Proof forgeries (invalid proofs accepted) | 0 |
| Salary amounts exposed on-chain | 0 |
| Employee wallet addresses linkable to salary | 0 (only recipient can correlate) |

---

## 12. Security Considerations

### 12.1 Circuit Security

**Soundness:** The UltraHonk proving system guarantees computational soundness — an adversary cannot forge a valid proof without knowledge of the private inputs (salary, secret, Merkle path). The security rests on the hardness of discrete logarithm on BN254.

**Completeness:** An honest prover with correct private inputs will always generate a verifiable proof.

**Nullifier binding:** The nullifier is `Poseidon2(nullifier_secret)`. The nullifier_secret is known only to the employee. The nullifier is published on-chain when spent, making double-spending detectable without linking to identity.

**Amount binding:** The salary_amount is both a private input AND a public output in the circuit (`expected_amount`). This means the on-chain verifier confirms the amount without the contract needing to store it. The proof is tied to a specific amount — reusing a proof for a different amount will fail verification.

**Recipient binding:** The recipient_address is a public input to the circuit. This prevents proof relay attacks where a malicious party intercepts a proof and redirects the payout.

**Critical vulnerability to prevent:** Merkle root malleability. The `create_batch` function MUST store the root immutably and reject any attempt to change it after deposit. Verify in tests.

### 12.2 Smart Contract Security

| Risk | Mitigation |
|------|------------|
| Re-entrancy on withdraw | Mark nullifier as spent BEFORE token transfer |
| Batch root overwrite | `assert!` on `!env.storage().instance().has(&root_key)` |
| Integer overflow | Use Soroban `i128` checked arithmetic; Rust overflow panics |
| Unauthorized batch creation | `employer.require_auth()` gate |
| Verifier contract address manipulation | Set at initialization, no upgrade path in MVP |
| Token drain | `salary_amount` in public inputs must match ZK-proven amount |
| Nullifier grinding | Poseidon2 preimage resistance is computationally infeasible |
| Proof replay across batches | `merkle_root` is public input — different batches have different roots |

### 12.3 Frontend Security

| Risk | Mitigation |
|------|------------|
| Withdrawal payload interception | Payload is URL-encoded; use HTTPS only; recommend secure delivery (Signal, encrypted email) |
| Nullifier secret exposure | Never stored server-side; lives only in URL/memory; page cleared after claim |
| Browser storage of secrets | NEVER store nullifier_secret in localStorage or sessionStorage |
| WASM sandbox | Noir WASM runs in browser sandbox; no server calls during proof generation |
| Phishing portal | Warn users to verify URL; consider signing withdrawal links |

### 12.4 Privacy Properties

| Property | Guaranteed? | Mechanism |
|----------|-------------|-----------|
| Salary amounts hidden from public | ✅ | Never stored/emitted on-chain |
| Employee wallet ↔ salary unlinkable | ✅ | ZK proof proves inclusion without linking identity |
| Employer payroll structure hidden | ✅ | Only Merkle root on-chain |
| Double-spend prevention | ✅ | On-chain nullifier set |
| Employer solvency verifiable | ✅ | Total locked amount is public; auditor can recompute tree |
| Individual salaries auditable | ✅ (authorized only) | Employer discloses CSV to auditor privately |

### 12.5 Known Limitations & Risks

1. **No trusted setup ceremony** for UltraHonk (transparent setup is a feature, not a bug — no trusted party required).
2. **Circuit size vs proof time tradeoff**: Depth-20 tree → ~2M+ constraints. Proof generation may exceed 120s on low-end hardware. Mitigation: reduce tree depth to 16 for MVP (65,536 employees still sufficient).
3. **Soroban instruction limit**: UltraHonk verification is instruction-intensive. Protocol 26's BN254 MSM host functions significantly reduce this. Must benchmark.
4. **Withdrawal URL delivery is out of scope**: ZK-SDP provides the payload; secure delivery (encrypted email, Signal) is HR's responsibility.
5. **No on-chain employee registry**: Employees are anonymous to the contract. If a secret is lost, the salary cannot be recovered — document this clearly.

### 12.6 Hackathon Security Disclaimer

MVP is deployed on **Stellar Testnet only**. The Groth16 circuits from PoolStellar explicitly note "No Trusted Setup Ceremony — not for production." Similarly, the UltraHonk circuit and contracts have not undergone a formal security audit. The system demonstrates the architectural pattern; production deployment requires full audit.

---

## 13. Open Questions & Decisions Needed

### 13.1 Cryptographic Decisions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| Q1 | **Proving system for MVP?** | UltraHonk (no ceremony, Noir-native) vs Groth16 (smaller proofs, cheaper verify) | **UltraHonk** — no ceremony, aligns with hackathon Noir toolchain |
| Q2 | **Merkle tree depth?** | 20 (1M+ capacity) vs 16 (65K) vs 10 (1K) | **16 for MVP** — faster proof generation, sufficient for demo; note constraint count |
| Q3 | **Poseidon2 parameters?** | t=3 (standard) vs t=2 (binary tree, faster) | **t=3** — compatible with Stellar's CAP-0075 documented parameters |
| Q4 | **Nullifier derivation?** | Poseidon2(secret) vs Poseidon2(secret, index) | **Poseidon2(secret)** — simpler; add index binding post-audit |
| Q5 | **Amount precision?** | USDC base units (10^7) vs custom unit | **USDC micro-units** — consistent with Stellar SAC |

### 13.2 Product Decisions

| # | Question | Options | Decision Needed By |
|---|----------|---------|------------------|
| P1 | **Token for testnet demo?** | Native XLM vs testnet USDC | Day 1 — affects contract calls |
| P2 | **Secret delivery mechanism?** | URL deep-link vs downloadable JSON per employee | Day 2 — affects employer UX |
| P3 | **Multi-batch support in MVP?** | One active batch per employer vs unlimited | Day 2 — affects contract storage design |
| P4 | **Employer dashboard real-time?** | WebSocket vs polling every 5s | Day 3 — affects backend complexity |
| P5 | **Auditor tool in MVP?** | Full auditor page vs basic CLI script | Day 5 — scope decision |

### 13.3 Technical Unknowns

| # | Unknown | Risk | Investigation Needed |
|---|---------|------|---------------------|
| T1 | **Actual Soroban instruction count for UltraHonk verify** | May exceed current limits even with P26 | Test with simple circuit first, measure, then full circuit |
| T2 | **Noir WASM bundle size** | Barretenberg WASM can be 20-40 MB — may cause slow load | Check `@noir-lang/backend_barretenberg` bundle; consider lazy loading |
| T3 | **Browser proof gen time on mobile** | Mobile proof may be 5-10x slower than desktop | Test on Android device during dev |
| T4 | **Cross-contract call fees** | Payroll contract → Verifier contract may be expensive | Simulate before finalizing contract architecture |
| T5 | **Freighter WASM compatibility** | Freighter + Noir WASM may conflict on memory | Test both loaded simultaneously in browser |

### 13.4 Decisions Made (Resolved)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Use Stellar Testnet** | Hackathon requirement; Protocol 26 live on testnet |
| D2 | **Noir + UltraHonk** (not Circom + Groth16) | More expressive, aligns with hackathon theme, no ceremony |
| D3 | **`indextree/ultrahonk_soroban_contract` as verifier** | Battle-tested reference, open-source, testnet-proven |
| D4 | **Freighter wallet** | Standard Stellar browser wallet, stellar-sdk compatible |
| D5 | **Salary amounts NOT in Soroban events** | Core privacy requirement |

---

## 14. Glossary

### Cryptographic Terms

**BN254 (Alt-BN128)**: A pairing-friendly elliptic curve defined over a 254-bit prime field. Native to Ethereum's EVM via EIP-196/197 precompiles. Now natively supported in Stellar Soroban via CAP-0074. Used for pairing operations in zk-SNARK proof verification.

**BN254 Fr**: The scalar field of BN254, with order `r = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001`. All Poseidon2 hash inputs and outputs live in this field.

**Commitment**: A cryptographic binding of a value to a public hash. In ZK-SDP: `commitment = Poseidon2([salary, secret, index])`. The commitment is inserted into the Merkle tree as a leaf.

**Incremental Merkle Tree**: A Merkle tree where leaves are appended one at a time from left to right. Efficient for the ZK payroll use case because the employer appends one leaf per employee. The root represents all inserted commitments.

**Merkle Path (Siblings + Indices)**: The co-path of sibling node hashes required to reconstruct the root from a given leaf. In a depth-20 tree, the path consists of 20 sibling hashes and 20 left/right position bits.

**Merkle Root**: The single 32-byte hash at the top of the Merkle tree representing all leaves. This is the only value stored on-chain for the payroll batch.

**Noir**: A Rust-like domain-specific language for writing zero-knowledge circuits, developed by Aztec. Compiles to ACIR (Abstract Circuit Intermediate Representation). Used to write `payroll_withdrawal.nr`.

**Nullifier**: A one-way derived value from the nullifier_secret, computed as `Poseidon2([nullifier_secret])`. The nullifier is published on-chain when a salary is claimed, allowing the contract to prevent double-spending without revealing the employee's secret or identity.

**Poseidon2**: A ZK-optimized hash function using the HADES construction with alternating full and partial rounds. Operates natively over prime fields, making it ~10x more constraint-efficient than SHA-256 inside ZK circuits. Supported as a native Soroban host function via CAP-0075.

**Proof (ZK Proof)**: A compact cryptographic artifact proving that the prover knows private inputs satisfying the circuit constraints, without revealing those inputs. In ZK-SDP, the proof demonstrates salary inclusion and nullifier validity.

**Public Input**: A circuit value that is revealed as part of the proof — visible to the verifier. In ZK-SDP: `merkle_root, nullifier_hash, recipient_address, expected_amount`.

**Private Input**: A circuit value known only to the prover — never revealed. In ZK-SDP: `salary_amount, nullifier_secret, merkle_siblings, merkle_path_indices`.

**UltraHonk**: A PLONK-family proving system developed by Aztec/Barretenberg with ultra-wide gates and native Poseidon2 support. Produces proofs verifiable on-chain via the `UltraHonkVerifierContract`. Has a transparent setup (no trusted ceremony required).

**Verification Key (VK)**: A fixed circuit-specific key used to verify proofs. Set at contract deployment time. The VK encodes the circuit structure; different circuits have different VKs.

**WASM (WebAssembly)**: A binary instruction format enabling high-performance applications to run in web browsers. Used to run the Barretenberg proving engine client-side, enabling browser-based proof generation without server interaction.

**zk-SNARK**: Zero-Knowledge Succinct Non-Interactive Argument of Knowledge. A proof system where proofs are small and verification is fast. The class of proof systems used in ZK-SDP.

### Platform Terms

**CAP-0074**: Stellar Core Advancement Proposal adding BN254 elliptic curve host functions (`bn254_g1_add`, `bn254_g1_mul`, `bn254_multi_pairing`) to Soroban. Activated in Protocol 25 (X-Ray), January 22 2026.

**CAP-0075**: Stellar CAP adding Poseidon and Poseidon2 permutation primitives as Soroban host functions. Activated in Protocol 25 (X-Ray).

**CAP-0080**: Stellar CAP adding 9 additional BN254 host functions: multi-scalar multiplication (MSM), scalar-field arithmetic, and curve-membership checks. Activated in Protocol 26 (Yardstick), May 6 2026. Directly reduces UltraHonk verification cost.

**Freighter**: The standard Stellar browser extension wallet. Provides `publicKey`, `signTransaction`, and `signAuthEntry` APIs. Used by both employers and employees in ZK-SDP.

**Protocol 25 (X-Ray)**: Stellar mainnet upgrade (January 22 2026) introducing native ZK cryptographic primitives via CAP-0074 and CAP-0075.

**Protocol 26 (Yardstick)**: Stellar mainnet upgrade (May 6 2026) extending BN254 support via CAP-0080, making Noir/UltraHonk proof verification meaningfully cheaper.

**Soroban**: Stellar's smart contract platform. Contracts are written in Rust and compiled to WASM. Supports no_std Rust. The platform on which ZK-SDP contracts are deployed.

**Soroban RPC**: JSON-RPC server for submitting transactions and reading Soroban contract state and events. Testnet endpoint: `https://soroban-testnet.stellar.org`.

**SDP (Stellar Disbursement Platform)**: Open-source tool by Stellar Development Foundation for making bulk payments. GitHub: `stellar/stellar-disbursement-platform-backend`. ZK-SDP builds on SDP patterns for employer UX.

**Stellar Asset Contract (SAC)**: Soroban contract wrapping native Stellar assets (including USDC) with a standard `token::Client` interface, enabling Soroban contracts to transfer assets.

**Stellar Testnet**: Stellar's public test network. Fully resets periodically. Funds obtained via Friendbot. Runs the same protocol as mainnet. Required for hackathon submission.

### Protocol Terms

**Batch**: A single employer payroll run. One batch = one Merkle root + one deposited pool. Multiple batches can exist simultaneously.

**Leaf**: An entry in the Merkle tree representing one employee's salary commitment.

**Merkle Path**: The set of sibling node hashes needed to reconstruct the root from a specific leaf. Provided by the employer to each employee as part of their withdrawal payload.

**Withdrawal Payload**: The base64-encoded JSON object given to each employee containing all data needed to generate their withdrawal proof and claim their salary.

**ASP (Association Set Provider)**: A compliance pattern from the Nethermind PoolStellar reference implementation. Maintains allow/block Merkle trees for KYC compliance. Not in ZK-SDP MVP scope but noted for post-MVP integration.

---

## Appendix A: Reference Implementations

| Name | URL | Relevance |
|------|-----|-----------|
| ultrahonk_soroban_contract | `github.com/indextree/ultrahonk_soroban_contract` | ⭐ Core verifier contract |
| stellar-private-payments | `github.com/NethermindEth/stellar-private-payments` | ⭐ Full pipeline reference |
| stellar-disbursement-platform-backend | `github.com/stellar/stellar-disbursement-platform-backend` | UX patterns, employer portal |
| awesome-noir | `github.com/noir-lang/awesome-noir` | Circuit libraries, benchmarks |
| merkle-poseidon | `github.com/alaadotsol/merkle-poseidon` | Poseidon2 sparse Merkle in Rust |
| ultrahonk_soroban_contract (sudoku) | `github.com/tupui/ultrahonk_soroban_contract` | Full E2E workflow example |
| stellar-zk-docs | `developers.stellar.org/docs/build/apps/zk` | Official ZK on Stellar docs |

## Appendix B: Key Testnet Addresses (To Be Populated)

| Contract | Testnet Address |
|----------|----------------|
| UltraHonkVerifierContract | _Deploy and record during Phase 0_ |
| ConfidentialPayrollContract | _Deploy and record during Phase 1_ |
| USDC SAC (testnet) | `CBIELTK6YBZJU5UP2WWQEQ4YkSB1C3ED7JOMDLIN7YNKPOTFPJVULQH` |

---

*Document maintained by ArbaLabs. Last updated: June 2026.*  
*Hackathon: Stellar Hacks: Real-World ZK — DoraHacks*  
*Building on Protocol 26 (Yardstick) — the most ZK-capable Stellar ever.*
