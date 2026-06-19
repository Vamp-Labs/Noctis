# Sprint 1 — Foundation & Core Contracts
## ZK-SDP: Confidential Payroll on Stellar
**Sprint Duration:** Week 1 — June 19 (Fri) to June 26 (Fri) | **12 Days**
**Goal:** UltraHonk verifier deployed on testnet + ConfidentialPayrollContract written and tested + Backend services functional

---

## Sprint Overview

This sprint is the heaviest engineering lift. We need to get the cryptographic foundation right: the Noir circuit, the Soroban contracts, and the off-chain tree builder. Frontend scaffolds in parallel.

### Sprint Capacity

| Agent | Available Days | Focus |
|-------|---------------|-------|
| Smart Contract Engineer | 12 | Circuit + Contracts + Deploy |
| Backend Engineer | 10 | Tree builder + Indexer + API |
| Frontend Engineer | 10 | Scaffold + Employer Portal |
| PM | 12 | Coordination + Specs + Audit scheduling |

---

## Tickets

### Phase 0: Research & Setup (Days 1–3)

#### S1-001 — Deploy UltraHonkVerifierContract to testnet
- **Agent:** Smart Contract Engineer
- **Priority:** P0 — Critical Path
- **Story Points:** 5
- **Description:**
  1. Clone `indextree/ultrahonk_soroban_contract` repo
  2. Build WASM binary for the verifier contract
  3. Deploy to Stellar testnet using `stellar contract deploy`
  4. Record contract address and verification key hash
- **Acceptance Criteria:**
  - [ ] Verifier contract returns `true` for a known-valid proof
  - [ ] Contract address documented in `planning/specs/testnet_addresses.md`
  - [ ] Transaction explorer links working
- **Dependencies:** None
- **Reference:** PRD §3.2, §8.2.2, Appendix A

#### S1-002 — Write & compile `payroll_withdrawal.nr` circuit
- **Agent:** Smart Contract Engineer
- **Priority:** P0 — Critical Path
- **Story Points:** 8
- **Description:**
  - Implement the Noir circuit as specified in PRD §8.3
  - Circuit must prove: leaf commitment, Merkle inclusion, nullifier derivation, amount binding
  - Compile with `nargo compile`
  - Generate verification key with `bb write_vk`
- **Acceptance Criteria:**
  - [ ] Circuit compiles without errors
  - [ ] `nargo info` shows constraint count (< 500k gates target)
  - [ ] ACIR artifact at `circuits/payroll_withdrawal/target/payroll_withdrawal.json`
  - [ ] VK generated at `circuits/payroll_withdrawal/target/vk`
- **Dependencies:** None
- **Reference:** PRD §8.3, §9.4

#### S1-003 — Verify circuit locally
- **Agent:** Smart Contract Engineer
- **Priority:** P0
- **Story Points:** 3
- **Description:**
  - Write a test script that: generates witnesses, proves with `bb prove`, verifies with `bb verify`
  - Test with known inputs for a depth-16 Merkle tree
  - Measure proof generation time
- **Acceptance Criteria:**
  - [ ] `bb prove` succeeds on valid witness
  - [ ] `bb verify` returns true for valid proof
  - [ ] `bb verify` returns false for tampered proof
  - [ ] Proof generation time benchmarked
- **Dependencies:** S1-002

#### S1-004 — Deploy verifier with circuit VK on testnet
- **Agent:** Smart Contract Engineer
- **Priority:** P0
- **Story Points:** 3
- **Description:**
  - Use the VK from S1-002 to deploy the UltraHonkVerifierContract
  - Test cross-contract call from a test harness
- **Acceptance Criteria:**
  - [ ] Verifier contract deployed with correct VK
  - [ ] `verify(proof, public_inputs)` returns true on testnet
  - [ ] Contract ID documented
- **Dependencies:** S1-001, S1-003

#### S1-005 — Set up monorepo (Turborepo)
- **Agent:** Backend Engineer (with DevOps)
- **Priority:** P1
- **Story Points:** 5
- **Description:**
  - Initialize Turborepo with packages: `contracts/`, `circuits/`, `frontend/`, `services/`
  - Configure `pnpm` workspaces
  - Set up TypeScript, ESLint, Prettier configs
  - Verify `pnpm dev` works across all packages
- **Acceptance Criteria:**
  - [ ] `pnpm build` runs across all packages
  - [ ] Shared TypeScript configs in place
  - [ ] CI lint passes
- **Dependencies:** None
- **Reference:** PRD §10 Phase 0

---

### Phase 1: Core Contracts (Days 3–5)

#### S1-006 — Write ConfidentialPayrollContract (Rust)
- **Agent:** Smart Contract Engineer
- **Priority:** P0 — Critical Path
- **Story Points:** 13
- **Description:**
  - Implement `ConfidentialPayrollContract` per PRD §8.2.1
  - Functions: `initialize`, `create_batch`, `withdraw`, `get_root`, `is_spent`
  - Use Soroban SDK types: `BytesN<32>`, `Address`, `Map`, `Vec`
  - Cross-contract call to UltraHonkVerifierContract
  - Nullifier set as `DataKey::NullifierSpent(BytesN<32>)`
  - Events: `BatchCreated`, `Withdrawn` (NO salary in events)
- **Acceptance Criteria:**
  - [ ] `initialize()` sets verifier address and admin
  - [ ] `create_batch()` stores root, transfers tokens, emits event
  - [ ] `withdraw()` verifies proof, checks nullifier, transfers salary
  - [ ] Re-entrancy safe: nullifier marked BEFORE transfer
  - [ ] Batch root immutable after creation
  - [ ] `require_auth()` on all admin operations
- **Dependencies:** S1-004
- **Reference:** PRD §8.2.1, §12.2

#### S1-007 — Unit tests for ConfidentialPayrollContract
- **Agent:** Smart Contract Engineer
- **Priority:** P0
- **Story Points:** 8
- **Description:**
  - Use `soroban_sdk::testutils` to write comprehensive unit tests
  - Test cases:
    - Happy path: create_batch → withdraw
    - Double-spend: withdraw twice with same nullifier → revert
    - Root mismatch: wrong Merkle root → revert
    - Invalid proof: tampered proof → revert
    - Unauthorized: non-employer tries create_batch → revert
    - Zero amount/total → revert
- **Acceptance Criteria:**
  - [ ] All test cases pass
  - [ ] 100% coverage of public functions
  - [ ] Re-entrancy attack simulation passes
- **Dependencies:** S1-006

#### S1-008 — Integration test: full flow (local testnet)
- **Agent:** Smart Contract Engineer
- **Priority:** P0
- **Story Points:** 5
- **Description:**
  - Deploy both contracts to local soroban-preview testnet
  - Full flow: generate tree → deposit → generate ZK proof → withdraw
  - Script end-to-end with TypeScript
- **Acceptance Criteria:**
  - [ ] Flow completes on local testnet
  - [ ] Proof generated in script matches on-chain verify
  - [ ] Nullifier correctly marked as spent
- **Dependencies:** S1-007, S1-003

#### S1-009 — Deploy ConfidentialPayrollContract to public testnet
- **Agent:** Smart Contract Engineer
- **Priority:** P1
- **Story Points:** 3
- **Description:**
  - Deploy to `https://soroban-testnet.stellar.org`
  - Verify cross-contract call works
  - Record all contract addresses
- **Acceptance Criteria:**
  - [ ] Contract deployed and verified
  - [ ] Cross-contract call to UltraHonkVerifier passes
  - [ ] Addresses documented
- **Dependencies:** S1-008, S1-004

#### S1-010 — Smart contract security review (internal)
- **Agent:** Smart Contract Engineer + Security Engineer
- **Priority:** P1
- **Story Points:** 5
- **Description:**
  - Systematic review of ConfidentialPayrollContract
  - Check: re-entrancy, overflow, auth, root mutability, nullifier uniqueness
  - Document findings in `planning/audits/internal_review_sprint1.md`
- **Acceptance Criteria:**
  - [ ] All findings documented
  - [ ] P0/P1 items fixed before proceeding
- **Dependencies:** S1-006

---

### Phase 2: Off-Chain Services (Days 4–6 — Partial)

#### S1-011 — Poseidon2 Merkle tree builder (TypeScript)
- **Agent:** Backend Engineer (shared utility with Frontend)
- **Priority:** P1
- **Story Points:** 8
- **Description:**
  - Implement `PayrollTreeBuilder` class per PRD §8.4
  - Poseidon2 hash via WASM (`@noir-lang/noir_wasm` or custom implementation)
  - Incremental Merkle tree (depth 16 for MVP, configurable)
  - Output: Merkle root, leaves with siblings + path indices
  - Tree builder runs **client-side** (browser WASM) for privacy
- **Acceptance Criteria:**
  - [ ] `buildTree(rows)` returns correct `TreeBuildResult`
  - [ ] Merkle root matches Noir circuit's root for same inputs
  - [ ] 200-employee tree builds in < 5s
  - [ ] Unit tests with known test vectors
  - [ ] Exported as shared NPM package in monorepo
- **Dependencies:** None (spike completed in R-07)
- **Reference:** PRD §8.4, §9.2

#### S1-012 — Withdrawal payload encoder/decoder
- **Agent:** Frontend Engineer (shared utility)
- **Priority:** P1
- **Story Points:** 3
- **Description:**
  - Encode `WithdrawalPayload` (PRD §9.2) as URL-safe base64 JSON
  - Decode and validate payload on receipt
  - Round-trip test: encode → decode → compare fields
- **Acceptance Criteria:**
  - [ ] Payload encodes/decodes losslessly
  - [ ] URL-safe base64 (no `+` or `/`)
  - [ ] Length fits in browser URL limit (< 2000 chars)
- **Dependencies:** S1-011
- **Reference:** PRD §9.2, FR-03

#### S1-013 — Supabase project setup + database schema
- **Agent:** Backend Engineer
- **Priority:** P1
- **Story Points:** 5
- **Description:**
  - Create Supabase account and project (free tier)
  - Write and run migration: `batches` + `batch_events` tables
  - Enable Realtime on both tables
  - Configure local Supabase dev environment (`supabase start`)
  - Document connection strings for Frontend Engineer
- **Acceptance Criteria:**
  - [ ] Supabase project created and linked
  - [ ] `batches` table with correct columns and indexes
  - [ ] `batch_events` table with correct columns and indexes
  - [ ] Realtime enabled on both tables
  - [ ] Local `supabase start` works
  - [ ] Connection string + anon key shared with Frontend
- **Dependencies:** None
- **Reference:** Backend Engineer handoff §3.2

#### S1-014 — Edge Function: Soroban event indexer
- **Agent:** Backend Engineer
- **Priority:** P1
- **Story Points:** 8
- **Description:**
  - Write Supabase Edge Function (Deno) that polls `SorobanRpc.getEvents()`
  - Track last-processed ledger via `_indexer_meta` table
  - On `BatchCreated`: insert row into `batches` + `batch_events`
  - On `Withdrawn`: update `claimed_count` + insert into `batch_events`
  - Configure cron schedule (every 30 seconds)
  - Handle RPC errors with exponential backoff
- **Acceptance Criteria:**
  - [ ] Edge Function deployed and running
  - [ ] Cron schedule active (every 30s)
  - [ ] Correctly processes both event types
  - [ ] No duplicate events on restart
  - [ ] Environment variables configured (CONTRACT_ID, RPC_URL)
- **Dependencies:** S1-013, S1-009
- **Reference:** Backend Engineer handoff §3.3

---

### Phase 3: Frontend (Days 6–9 — Early Start)

#### S1-016 — Frontend scaffold (Next.js 14 + Tailwind + Shadcn)
- **Agent:** Frontend Engineer
- **Priority:** P1
- **Story Points:** 5
- **Description:**
  - Init Next.js 14 App Router project
  - Install Tailwind CSS, Shadcn/UI components
  - Set up dark theme (PRD §7.4 design system)
  - Configure Freighter API types, Stellar SDK
  - Configure for Cloudflare Pages deployment (`@cloudflare/next-on-pages`)
- **Acceptance Criteria:**
  - [ ] `pnpm dev` runs at `localhost:3000`
  - [ ] Dark theme applied (purple-900 primary, sky-500 secondary)
  - [ ] Freighter `window.stellar` types available
  - [ ] `npx @cloudflare/next-on-pages` build succeeds
- **Dependencies:** S1-005
- **Reference:** PRD §7.1, §7.4

#### S1-017 — Landing page
- **Agent:** Frontend Engineer
- **Priority:** P2
- **Story Points:** 5
- **Description:**
  - HeroSection: headline, sub, CTA buttons
  - ProtocolStackDiagram: SVG layer diagram
  - HowItWorksSteps: 4-step explainer (Commit → Deposit → Prove → Claim)
  - TechBadges: Stellar, Noir, UltraHonk, BN254 logos
- **Acceptance Criteria:**
  - [ ] Responsive design (mobile + desktop)
  - [ ] OpenGraph metadata correct
  - [ ] CTAs link to `/employer/connect` and `/withdraw`
- **Dependencies:** S1-016
- **Reference:** PRD §7.3.1

#### S1-018 — Employer CSV upload + PayrollPreviewTable
- **Agent:** Frontend Engineer
- **Priority:** P1
- **Story Points:** 8
- **Description:**
  - `<CSVUploader>` with drag-and-drop, file validation
  - Parse CSV into `PayrollRow[]`
  - `<PayrollPreviewTable>` with salary toggle (hide/show)
  - Error display for malformed rows
- **Acceptance Criteria:**
  - [ ] Drag-and-drop + file picker both work
  - [ ] Validates columns: employee_index, wallet_address, salary_amount_usdc
  - [ ] Shows row count + total salary sum
  - [ ] Toggle hides/shows salary column
  - [ ] Handles 500+ rows without lag
- **Dependencies:** S1-016
- **Reference:** PRD §7.3.2

---

## Sprint Retrospective Notes (To Fill After Sprint)

| Item | Notes |
|------|-------|
| **Velocity** | Planned: XX pts | Delivered: XX pts | %: XX% |
| **P0 missed** | (list any) |
| **Blockers** | (list any) |
| **Learnings** | (key takeaways) |
| **Process changes** | (for next sprint) |

---

## Definition of Done

- [ ] Code reviewed by at least one other agent
- [ ] Unit tests passing
- [ ] Integration test passing (where applicable)
- [ ] Documentation updated (README, inline comments)
- [ ] No P0/P1 security issues
- [ ] Performance benchmark recorded
- [ ] PM notified for demo preparation

---

*Sprint owned by Product Manager. Tickets tracked in Linear.*
