# Sprint 2 — Frontend Completion & Integration
## ZK-SDP: Confidential Payroll on Stellar
**Sprint Duration:** Week 2 — June 26 (Fri) to July 3 (Fri) | **7 Days**
**Goal:** All frontend features complete, end-to-end flow working on testnet, demo-ready

---

## Sprint Overview

Sprint 2 is about closing the loop: completing all frontend features, integrating with contracts and services, polishing the UX, and delivering the hackathon submission.

### Sprint Capacity

| Agent | Available Days | Focus |
|-------|---------------|-------|
| Smart Contract Engineer | 5 | Bug fixes, optimization, E2E support |
| Backend Engineer | 5 | API completion, event indexer, WebSocket, audit tool |
| Frontend Engineer | 7 | All remaining UI: dashboard, withdrawal portal, auditor, polish |
| PM | 7 | Demo video, README, submission, coordination |

---

## Tickets

### Completion of Phase 2: Off-Chain Services

#### S2-001 — Supabase Realtime channel configuration
- **Agent:** Backend Engineer
- **Priority:** P1
- **Story Points:** 3
- **Description:**
  - Verify `supabase_realtime` publication includes `batches` and `batch_events`
  - Test Realtime subscription with a Deno script
  - Document channel name and filter for Frontend Engineer
  - Test end-to-end: Edge Function insert → Realtime broadcast → client receives
- **Acceptance Criteria:**
  - [ ] Realtime broadcasts `INSERT` on `batch_events`
  - [ ] Frontend test subscription receives events
  - [ ] No auth required (anon key works for read)
  - [ ] Connection status events work (SUBSCRIBED/CHANNEL_ERROR)
- **Dependencies:** S1-014
- **Reference:** Backend Engineer handoff §3.5

#### S2-002 — Edge Function: batch-status endpoint
- **Agent:** Backend Engineer
- **Priority:** P1
- **Story Points:** 3
- **Description:**
  - Deploy batch-status Edge Function to Supabase
  - Accepts `batch_id` query param
  - Returns batch state from PostgreSQL
  - Add CORS headers
- **Acceptance Criteria:**
  - [ ] `GET https://[project].supabase.co/functions/v1/batch-status?batch_id=1` returns correct JSON
  - [ ] Returns 404 for unknown batch
  - [ ] CORS headers allow browser requests
- **Dependencies:** S1-013
- **Reference:** Backend Engineer handoff §3.4

#### S2-003 — Circuit JSON as static asset
- **Agent:** All (PM coordinates)
- **Priority:** P1
- **Story Points:** 2
- **Description:**
  - Copy compiled circuit JSON from `circuits/` to `frontend/public/circuits/`
  - Commit and verify it's served at `/circuits/payroll_withdrawal.json`
  - Test CDN caching works
- **Acceptance Criteria:**
  - [ ] `curl https://zksdp.pages.dev/circuits/payroll_withdrawal.json` returns valid JSON
  - [ ] Response has `Cache-Control: public, max-age=3600`
- **Dependencies:** S1-003

#### S2-004 — Auditor CLI tool
- **Agent:** Backend Engineer
- **Priority:** P2
- **Story Points:** 5
- **Description:**
  - CLI tool that accepts CSV + batch ID
  - Recomputes Merkle root from CSV leaves
  - Fetches on-chain root from ConfidentialPayrollContract
  - Reports MATCH / MISMATCH
  - Shows claimed/unclaimed ratio from nullifier set
- **Acceptance Criteria:**
  - [ ] `zksdp-audit --csv payroll.csv --batch 1` works
  - [ ] Correctly detects root match/mismatch
  - [ ] Shows nullifier audit table
- **Dependencies:** S1-011, S1-009
- **Reference:** PRD §FR-06, A-01

---

### Phase 3: Frontend (Continuation)

#### S2-004 — CommitmentBuilder UI + MerkleTreeVisualizer
- **Agent:** Frontend Engineer
- **Priority:** P1
- **Story Points:** 8
- **Description:**
  - `<CommitmentBuilder>` component: calls tree builder service (S1-011) or in-browser WASM
  - Shows progress during tree construction
  - `<MerkleTreeVisualizer>`: displays Merkle root (truncated), leaf count
  - Connect to CSV upload results
- **Acceptance Criteria:**
  - [ ] Merkle root computed and displayed
  - [ ] Progress spinner during computation
  - [ ] Error handling if tree builder fails
- **Dependencies:** S1-016, S1-011
- **Reference:** PRD §7.3.2

#### S2-005 — Freighter wallet connect (employer & employee)
- **Agent:** Frontend Engineer
- **Priority:** P1
- **Story Points:** 3
- **Description:**
  - Connect Freighter wallet on employer and employee portals
  - Display connected wallet address
  - Handle: disconnected, connecting, connected, wrong network states
- **Acceptance Criteria:**
  - [ ] `window.stellar` detection
  - [ ] Request `publicKey` on connect
  - [ ] Network check (must be testnet)
  - [ ] Disconnect button
- **Dependencies:** S1-016
- **Reference:** PRD §7.3.4

#### S2-006 — Deposit confirm modal + Freighter tx signing
- **Agent:** Frontend Engineer
- **Priority:** P1
- **Story Points:** 5
- **Description:**
  - `<DepositConfirmModal>`: shows total amount, Merkle root, batch ID
  - Employer signs `create_batch` transaction via Freighter
  - Submit to Soroban RPC
  - Show success/error state with tx hash
- **Acceptance Criteria:**
  - [ ] Modal shows correct summary
  - [ ] Freighter signs successfully
  - [ ] Transaction lands on testnet
  - [ ] Batch ID displayed for employer
- **Dependencies:** S2-004, S2-005, S1-009
- **Reference:** PRD §7.3.2, FR-02

#### S2-007 — Employer batch dashboard (Supabase Realtime)
- **Agent:** Frontend Engineer
- **Priority:** P1
- **Story Points:** 8
- **Description:**
  - `<BatchHeader>`: batch ID, status badge, total locked, employer address
  - `<ClaimProgressBar>`: "X of Y employees claimed" with visual progress
  - `<RecentClaimsTable>`: nullifier hash, timestamp (NO amount, NO employee ID)
  - Supabase Realtime subscription for live updates (instead of WebSocket)
  - Subscribe to `batch_events` INSERTs on the batch_id channel
- **Acceptance Criteria:**
  - [ ] Dashboard loads batch state from Supabase Edge Function
  - [ ] Real-time updates via Supabase Realtime (postgres_changes)
  - [ ] ClaimProgressBar updates as employees claim
  - [ ] Connection status indicator (SUBSCRIBED / CHANNEL_ERROR)
  - [ ] Works for 200+ employee batch without lag
- **Dependencies:** S2-001 (Realtime channel), S2-002 (Edge Function), S2-006
- **Reference:** PRD §7.3.3

#### S2-008 — SecretExporter component
- **Agent:** Frontend Engineer
- **Priority:** P1
- **Story Points:** 3
- **Description:**
  - Download per-employee withdrawal payloads as JSON/CSV
  - Each payload: `{ batch_id, employee_index, salary_amount, nullifier_secret, merkle_siblings, merkle_path_indices }`
  - Warning: "Download these secrets — they cannot be recovered"
- **Acceptance Criteria:**
  - [ ] One-click download of secrets JSON
  - [ ] File includes all required fields for employee withdrawal
  - [ ] Clear security warning displayed
- **Dependencies:** S2-004, S1-012
- **Reference:** PRD §7.3.2, FR-03

#### S2-009 — Employee withdrawal portal: proof generation UI
- **Agent:** Frontend Engineer
- **Priority:** P0 — Critical Path
- **Story Points:** 13
- **Description:**
  - `<PaymentBanner>`: decodes payload, shows "You have {amount} USDC from {company}"
  - `<ProofGenerator>`: central UX element with progress ring
  - `<ProofStepIndicator>`: 4-step process (Loading circuit → Constructing witnesses → Proving → Done)
  - Error states: payload expired, invalid payload, network error
  - Load Noir WASM from CDN with lazy loading
- **Acceptance Criteria:**
  - [ ] Payload decodes and displays correctly
  - [ ] 4-step progress shown during proof generation
  - [ ] Error states handled gracefully with recoverable actions
  - [ ] Memory cleanup after proof generation
- **Dependencies:** S2-005, S1-002, S1-012
- **Reference:** PRD §7.3.4, FR-04

#### S2-010 — Noir WASM proof generation integration
- **Agent:** Frontend Engineer (with Backend support)
- **Priority:** P0 — Critical Path
- **Story Points:** 13
- **Description:**
  - Import `@noir-lang/noir_js` and `@noir-lang/backend_barretenberg`
  - Fetch compiled circuit JSON
  - Generate UltraHonk proof in-browser via Web Worker
  - Extract public inputs: `[merkle_root, nullifier_hash, recipient_address, expected_amount]`
  - Benchmark proof generation time
- **Acceptance Criteria:**
  - [ ] Proof generates in < 120s (Chrome, modern laptop)
  - [ ] Web Worker: UI remains responsive during generation
  - [ ] Progress callbacks update UI
  - [ ] Proof + public inputs ready for submission
  - [ ] Clean error on generation failure
- **Dependencies:** S2-009, S1-003
- **Reference:** PRD §7.3.4 (code snippet)

#### S2-011 — Withdraw button + Freighter tx + success screen
- **Agent:** Frontend Engineer
- **Priority:** P0 — Critical Path
- **Story Points:** 8
- **Description:**
  - `<WithdrawButton>`: disabled until proof ready, then triggers Freighter signing
  - Construct `withdraw()` transaction for ConfidentialPayrollContract
  - Submit via Soroban RPC
  - `<SuccessScreen>`: tx hash, Stellar Expert link, amount confirmed
  - `<ErrorScreen>`: NullifierSpent, ProofFailed, NetworkError with friendly messages
- **Acceptance Criteria:**
  - [ ] Proof+public inputs submitted to contract
  - [ ] Transaction appears on testnet explorer
  - [ ] Success screen shows within 10s of submission
  - [ ] Error messages are user-friendly (not raw contract errors)
- **Dependencies:** S2-010, S1-009
- **Reference:** PRD §7.3.4, FR-05

#### S2-012 — Auditor tool page
- **Agent:** Frontend Engineer
- **Priority:** P2
- **Story Points:** 5
- **Description:**
  - `<BatchIdInput>`: enter batch ID to audit
  - `<CSVReloader>`: upload original payroll CSV
  - `<RootVerifierWidget>`: recompute root, show ✅ MATCH / ❌ MISMATCH
  - `<NullifierAuditTable>`: claimed/unclaimed status per leaf (fetches from Supabase or Soroban RPC)
  - `<SolvencyReport>`: total locked vs claimed vs remaining
- **Acceptance Criteria:**
  - [ ] Root verification works with real batch data
  - [ ] Nullifier audit table displays correctly
  - [ ] Solvency math is accurate
- **Dependencies:** S2-004, S1-016
- **Reference:** PRD §7.3.5, FR-06

---

### Phase 4: Integration & Polish (Days 10–12)

#### S2-013 — Full E2E test (3-employee batch on testnet)
- **Agent:** All agents (PM coordinates)
- **Priority:** P0 — Critical Path
- **Story Points:** 8
- **Description:**
  - Create 3-employee batch via employer portal
  - Export secrets
  - Open 3 withdrawal links in separate browser tabs
  - Generate proofs and withdraw
  - Verify batch dashboard shows 3/3 claimed
  - Verify auditor tool shows MATCH
- **Acceptance Criteria:**
  - [ ] All 3 employees successfully claim
  - [ ] No double-spend possible
  - [ ] Dashboard shows correct claim count
  - [ ] Auditor shows root MATCH
- **Dependencies:** S2-007, S2-011, S2-012, S1-009, S2-001

#### S2-014 — Error handling polish
- **Agent:** Frontend Engineer
- **Priority:** P2
- **Story Points:** 5
- **Description:**
  - Add all error states across all pages
  - Network failure handling with retry buttons
  - Wallet disconnection detection
  - Expired/Invalid payload handling
  - Generic error boundary at app level
- **Acceptance Criteria:**
  - [ ] No unhandled error states in user-facing flows
  - [ ] All errors have user-friendly messages and recovery actions
- **Dependencies:** S2-011

#### S2-015 — Loading states + skeleton screens
- **Agent:** Frontend Engineer
- **Priority:** P2
- **Story Points:** 3
- **Description:**
  - Skeleton loaders for all data-fetching components
  - Smooth transitions between states
  - Loading spinners for long operations (WASM loading, proof generation)
- **Acceptance Criteria:**
  - [ ] No blank/white screens during data loading
  - [ ] Skeleton matches component layout
- **Dependencies:** S2-013

#### S2-016 — Mobile responsive design pass
- **Agent:** Frontend Engineer
- **Priority:** P2
- **Story Points:** 3
- **Description:**
  - Test all pages at 320px, 768px, 1280px widths
  - Fix layout breaks, font sizes, touch targets
  - Ensure Freighter wallet flow works on mobile
- **Acceptance Criteria:**
  - [ ] All pages render correctly at 320px–1920px
  - [ ] Touch targets ≥ 44px
  - [ ] No horizontal scroll on mobile
- **Dependencies:** S2-013

#### S2-017 — Performance: proof gen benchmark
- **Agent:** Backend Engineer + Frontend Engineer
- **Priority:** P2
- **Story Points:** 3
- **Description:**
  - Benchmark proof generation on: Chrome desktop, Firefox, mobile Chrome
  - Measure: WASM load time, witness construction, proving time
  - Document results in `planning/benchmarks/proof_generation.md`
  - Optimize if > 120s
- **Acceptance Criteria:**
  - [ ] Benchmark results documented
  - [ ] Proof generation < 120s on at least one target
- **Dependencies:** S2-010

#### S2-018 — Demo video (2–3 min walkthrough)
- **Agent:** PM
- **Priority:** P1
- **Story Points:** 3
- **Description:**
  - Record screen demo of full E2E flow
  - Voiceover explaining: problem, solution, architecture, live demo
  - Upload to YouTube/DoraHacks
- **Acceptance Criteria:**
  - [ ] Video recorded and uploaded
  - [ ] Shows: CSV upload → tree build → deposit → employee claim → success
- **Dependencies:** S2-013

#### S2-019 — README + GitHub documentation
- **Agent:** PM
- **Priority:** P1
- **Story Points:** 5
- **Description:**
  - Project README with: description, architecture diagram, quick start, testnet links
  - Setup instructions for each package
  - Links to deployed contracts
  - Screenshots/gif of demo
- **Acceptance Criteria:**
  - [ ] README published on GitHub
  - [ ] Clear setup instructions
  - [ ] Contract addresses documented
- **Dependencies:** S2-013

#### S2-020 — DoraHacks submission
- **Agent:** PM
- **Priority:** P0 — Critical Path
- **Story Points:** 3
- **Description:**
  - Submit to DoraHacks Stellar Hacks: Real-World ZK track
  - Include: GitHub repo link, demo video, contract addresses, team info
- **Acceptance Criteria:**
  - [ ] Submission completed before deadline
  - [ ] All required fields filled
  - [ ] Demo video accessible
- **Dependencies:** S2-018, S2-019

---

## Sprint Retrospective Notes (To Fill After Sprint)

| Item | Notes |
|------|-------|
| **Velocity** | Planned: XX pts | Delivered: XX pts | %: XX% |
| **P0 missed** | (list any) |
| **Blockers** | (list any) |
| **Learnings** | (key takeaways) |
| **Demo feedback** | (from internal demo) |

---

## Definition of Done

- [ ] Code reviewed by at least one other agent
- [ ] Unit + integration tests passing
- [ ] End-to-end flow verified on testnet
- [ ] UI responsive (mobile + desktop)
- [ ] Error states handled
- [ ] Performance benchmarks recorded
- [ ] Demo video recorded
- [ ] README updated
- [ ] Security review complete (no P0 findings)
- [ ] PM approves for submission

---

## Cross-Agent Dependencies

```
S2-010 (Noir WASM)     ──blocked by── S1-003 (Circuit verified)
S2-011 (Withdraw)      ──blocked by── S2-010 + S1-009 (Contract deployed)
S2-007 (Dashboard)     ──blocked by── S2-001 (Realtime) + S2-002 (Edge Function)
S2-004 (Auditor CLI)   ──blocked by── S1-011 (Tree builder) + S1-009
S2-013 (E2E Test)      ──blocked by── S2-007 + S2-011 + S2-012
S2-018 (Demo video)    ──blocked by── S2-013
S2-020 (Submission)    ──blocked by── S2-018 + S2-019
```

**Critical Path (must finish on time):**
S1-003 → S2-010 → S2-011 → S2-013 → S2-018 → S2-020

**💰 Everything runs on free tier:**
- Frontend: Cloudflare Pages (unlimited bandwidth, $0)
- Backend: Supabase Edge Functions (500k invocations/mo free, $0)
- Realtime: Supabase Realtime (200 concurrent connections free, $0)
- Database: Supabase PostgreSQL (500MB free, $0)
- Circuit: Static file on Cloudflare CDN ($0)

---

*Sprint owned by Product Manager. Tickets tracked in Linear.*
