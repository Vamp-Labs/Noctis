# ZK-SDP Product Backlog
## Full Prioritized Feature & Task Index
### PM: ArbaLabs | June 2026

---

> **Backlog management:** Items are sorted by priority (P0 → P3) within each phase. P0 = must-ship for hackathon. P1 = important. P2 = nice-to-have. P3 = post-hackathon.

---

## Legend

| Priority | Definition | Hackathon Impact |
|----------|-----------|------------------|
| **P0** | Blocking path — ship or demo fails | Critical |
| **P1** | Core feature — expected in MVP | High |
| **P2** | Polishing — improves UX substantially | Medium |
| **P3** | Post-MVP — production only | Low (deferred) |

---

## Epics

| Epic ID | Epic Name | Sprint | Total SP | Status |
|---------|----------|--------|----------|--------|
| E-01 | Noir Circuit & Verification | Sprint 1 | 19 | 🔲 |
| E-02 | Smart Contract Layer | Sprint 1 | 34 | 🔲 |
| E-03 | Off-Chain Services | Sprint 1–2 | 28 | 🔲 |
| E-04 | Employer Portal UI | Sprint 1–2 | 35 | 🔲 |
| E-05 | Employee Withdrawal Portal | Sprint 2 | 38 | 🔲 |
| E-06 | Auditor Tool | Sprint 2 | 13 | 🔲 |
| E-07 | Integration & Polish | Sprint 2 | 25 | 🔲 |
| E-08 | Hackathon Submission | Sprint 2 | 11 | 🔲 |

---

## Full Backlog

### Epic E-01: Noir Circuit & Verification

| ID | Title | Priority | SP | Dependencies | Owner | Status |
|----|-------|----------|----|-------------|-------|--------|
| S1-001 | Deploy UltraHonkVerifierContract to testnet | P0 | 5 | — | Smart Contract | 🔲 |
| S1-002 | Write & compile payroll_withdrawal.nr circuit | P0 | 8 | — | Smart Contract | 🔲 |
| S1-003 | Verify circuit locally (nargo prove + bb verify) | P0 | 3 | S1-002 | Smart Contract | 🔲 |
| S1-004 | Deploy verifier with circuit VK on testnet | P0 | 3 | S1-001, S1-003 | Smart Contract | 🔲 |
| **Total** | | | **19** | | | |

### Epic E-02: Smart Contract Layer

| ID | Title | Priority | SP | Dependencies | Owner | Status |
|----|-------|----------|----|-------------|-------|--------|
| S1-006 | Write ConfidentialPayrollContract (Rust) | P0 | 13 | S1-004 | Smart Contract | 🔲 |
| S1-007 | Unit tests (create_batch, withdraw, nullifier) | P0 | 8 | S1-006 | Smart Contract | 🔲 |
| S1-008 | Integration test: full flow (local) | P0 | 5 | S1-007, S1-003 | Smart Contract | 🔲 |
| S1-009 | Deploy ConfidentialPayrollContract to testnet | P1 | 3 | S1-008, S1-004 | Smart Contract | 🔲 |
| S1-010 | Smart contract security review (internal) | P1 | 5 | S1-006 | Smart Contract + Security | 🔲 |
| **Total** | | | **34** | | | |

### Epic E-03: Off-Chain Services

| ID | Title | Priority | SP | Dependencies | Owner | Status |
|----|-------|----------|----|-------------|-------|--------|
| S1-005 | Set up monorepo (Turborepo) | P1 | 5 | — | DevOps/Backend | 🔲 |
| S1-011 | Poseidon2 Merkle tree builder (TS) | P1 | 8 | — | Backend | 🔲 |
| S1-012 | Withdrawal payload encoder/decoder | P1 | 5 | S1-011 | Backend | 🔲 |
| S1-013 | Soroban event indexer (polling) | P2 | 5 | S1-009 | Backend | 🔲 |
| S2-001 | WebSocket server for dashboard | P1 | 5 | S1-013 | Backend | 🔲 |
| S2-002 | API routes (status, events, circuit) | P1 | 5 | S1-013, S1-009 | Backend | 🔲 |
| S2-003 | Auditor CLI tool | P2 | 5 | S1-011, S1-009 | Backend | 🔲 |
| **Total** | | | **38** | | | |

### Epic E-04: Employer Portal UI

| ID | Title | Priority | SP | Dependencies | Owner | Status |
|----|-------|----------|----|-------------|-------|--------|
| S1-014 | Frontend scaffold (Next.js + Tailwind + Shadcn) | P1 | 5 | S1-005 | Frontend | 🔲 |
| S1-015 | Landing page | P2 | 5 | S1-014 | Frontend | 🔲 |
| S1-016 | Employer CSV upload + PayrollPreviewTable | P1 | 8 | S1-014 | Frontend | 🔲 |
| S2-005 | Freighter wallet connect | P1 | 3 | S1-014 | Frontend | 🔲 |
| S2-004 | CommitmentBuilder UI + MerkleTreeVisualizer | P1 | 8 | S1-016, S1-011 | Frontend | 🔲 |
| S2-006 | Deposit confirm modal + Freighter tx signing | P1 | 5 | S2-004, S2-005, S1-009 | Frontend | 🔲 |
| S2-007 | Employer batch dashboard (real-time WS) | P1 | 8 | S2-001, S2-002, S2-006 | Frontend | 🔲 |
| S2-008 | SecretExporter component | P1 | 3 | S2-004, S1-012 | Frontend | 🔲 |
| **Total** | | | **45** | | | |

### Epic E-05: Employee Withdrawal Portal

| ID | Title | Priority | SP | Dependencies | Owner | Status |
|----|-------|----------|----|-------------|-------|--------|
| S2-009 | Withdrawal portal: proof generation UI | P0 | 13 | S2-005, S1-002, S1-012 | Frontend | 🔲 |
| S2-010 | Noir WASM proof generation integration | P0 | 13 | S2-009, S1-003 | Frontend + Backend | 🔲 |
| S2-011 | Withdraw button + Freighter tx + success screen | P0 | 8 | S2-010, S1-009 | Frontend | 🔲 |
| **Total** | | | **34** | | | |

### Epic E-06: Auditor Tool

| ID | Title | Priority | SP | Dependencies | Owner | Status |
|----|-------|----------|----|-------------|-------|--------|
| S2-012 | Auditor tool page | P2 | 5 | S2-003, S1-014 | Frontend | 🔲 |
| S2-003 | Auditor CLI tool (backend) | P2 | 5 | S1-011, S1-009 | Backend | 🔲 |
| **Total** | | | **10** | | | |

### Epic E-07: Integration & Polish

| ID | Title | Priority | SP | Dependencies | Owner | Status |
|----|-------|----------|----|-------------|-------|--------|
| S2-013 | Full E2E test (3-employee batch on testnet) | P0 | 8 | S2-007, S2-011, S2-012 | All (PM coord) | 🔲 |
| S2-014 | Error handling polish | P2 | 5 | S2-011 | Frontend | 🔲 |
| S2-015 | Loading states + skeleton screens | P2 | 3 | S2-013 | Frontend | 🔲 |
| S2-016 | Mobile responsive design pass | P2 | 3 | S2-013 | Frontend | 🔲 |
| S2-017 | Performance: proof gen benchmark | P2 | 3 | S2-010 | Backend + Frontend | 🔲 |
| **Total** | | | **22** | | | |

### Epic E-08: Hackathon Submission

| ID | Title | Priority | SP | Dependencies | Owner | Status |
|----|-------|----------|----|-------------|-------|--------|
| S2-018 | Demo video (2–3 min walkthrough) | P1 | 3 | S2-013 | PM | 🔲 |
| S2-019 | README + GitHub documentation | P1 | 5 | S2-013 | PM | 🔲 |
| S2-020 | DoraHacks submission | P0 | 3 | S2-018, S2-019 | PM | 🔲 |
| **Total** | | | **11** | | | |

---

## Post-Hackathon Backlog (P3)

| ID | Title | Priority | SP (Est.) | Owner | Notes |
|----|-------|----------|-----------|-------|-------|
| PH-01 | Full security audit (professional) | P0 (post) | — | Security | Trail of Bits or OtterSec |
| PH-02 | Tree depth optimization (16→20 with perf) | P3 | 8 | Smart Contract | Benchmark and optimize |
| PH-03 | SDP integration (fork backend) | P3 | 21 | Backend | Add ZK payroll mode to official SDP |
| PH-04 | USDC mainnet deployment | P0 (post) | 5 | All | Requires security audit sign-off |
| PH-05 | Multi-batch support (unlimited batches) | P3 | 8 | Smart Contract | Contract storage redesign |
| PH-06 | KYB compliance layer (ASP) | P3 | 13 | Smart Contract + Backend | Association Set Provider |
| PH-07 | Cross-chain settlement (Wormhole) | P3 | 21 | Smart Contract + Backend | Multi-chain salary settlement |
| PH-08 | Mobile proof generation (React Native) | P3 | 13 | Frontend | iOS/Android Noir WASM |
| PH-09 | Enterprise pilot program | P0 (post) | — | PM | First paying customer |
| PH-10 | Governance proposal for fee switch | P3 | 5 | PM | Protocol DAO governance |
| PH-11 | Email notification delivery for secrets | P3 | 8 | Backend | Encrypted email delivery |
| PH-12 | Gas optimization pass | P3 | 8 | Smart Contract | Reduce Soroban instruction usage |

---

## Backlog Grooming Schedule

| Activity | Frequency | Participants |
|----------|-----------|-------------|
| Backlog refinement | Weekly (Wed) | PM + Lead engineers |
| Priority review | Sprint boundary | PM + All agents |
| Estimation session | Per epic kickoff | PM + Assignee |
| Deprecation review | Monthly | PM |

---

## Velocity Tracking

| Sprint | Committed (SP) | Delivered (SP) | Velocity % | Notes |
|--------|---------------|----------------|------------|-------|
| Sprint 1 | — | — | — | In progress |
| Sprint 2 | — | — | — | Planned |

---

*Backlog maintained in Linear. This file is a snapshot for reference.*
