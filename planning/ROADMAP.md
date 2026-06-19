# ZK-SDP Product Roadmap
## Strategic Plan (Hackathon → MVP → Production)
### Product Manager: ArbaLabs | Version 1.0 | June 2026

---

> **Vision:** Make Stellar the default global payroll rail by making salary settlement provably private.

---

## 1. Strategic Themes

| Theme | Description | Time Horizon |
|-------|-------------|--------------|
| **Hackathon Ship** | End-to-end testnet demo: employer creates batch → employee claims via ZK proof | **Weeks 1–2** |
| **MVP Hardening** | Production-ready contracts, audit prep, SDP fork integration, USDC mainnet | **Weeks 3–8** |
| **Enterprise Readiness** | KYB/AML compliance layer, multi-chain settlement, mobile proof generation | **Weeks 9–16** |
| **Scale & Ecosystem** | Open-source developer SDK, partner integrations, enterprise sales | **Months 5–12** |

---

## 2. Roadmap Timeline

### Phase 0: Research & Setup (Days 1–3)

| ID | Task | Owner | Dependencies | Deliverable | Status |
|----|------|-------|-------------|-------------|--------|
| R-01 | Deploy UltraHonkVerifierContract to testnet | Smart Contract | — | Verifier contract address | 🔲 |
| R-02 | Write & compile `payroll_withdrawal.nr` circuit | Smart Contract | — | `payroll_withdrawal.json` artifact | 🔲 |
| R-03 | Verify circuit locally (`nargo prove` + `bb verify`) | Smart Contract | R-02 | Passing test | 🔲 |
| R-04 | Deploy verifier with circuit VK on testnet | Smart Contract | R-02, R-03 | Testnet contract ID | 🔲 |
| R-05 | Set up monorepo (Turborepo) | DevOps | — | Working `pnpm dev` | 🔲 |
| R-06 | Confirm Stellar Protocol 26 testnet availability | DevOps | — | Confirmed RPC endpoint | 🔲 |
| R-07 | Poseidon2 Merkle tree builder TS library spike | Backend | R-02 | Spike complete | 🔲 |

### Phase 1: Core Contracts (Days 3–5)

| ID | Task | Owner | Dependencies | Deliverable | Status |
|----|------|-------|-------------|-------------|--------|
| C-01 | Write `ConfidentialPayrollContract` (Rust) | Smart Contract | R-04 | Contract source | 🔲 |
| C-02 | Unit tests: create_batch, withdraw, nullifier checks | Smart Contract | C-01 | All tests passing | 🔲 |
| C-03 | Integration test: full deposit→prove→withdraw flow | Smart Contract | C-02, R-05 | Local testnet passing | 🔲 |
| C-04 | Deploy ConfidentialPayrollContract to testnet | Smart Contract | C-03 | Contract ID published | 🔲 |
| C-05 | Verify cross-contract call to UltraHonk verifier | Smart Contract | C-04 | On-chain verification working | 🔲 |
| C-06 | Smart contract security review (internal) | Smart Contract + Security | C-03 | Security review doc | 🔲 |

### Phase 2: Off-Chain Services (Days 4–6)

| ID | Task | Owner | Dependencies | Deliverable | Status |
|----|------|-------|-------------|-------------|--------|
| S-01 | Poseidon2 Merkle tree builder TS service | Backend | R-07 | `buildTree(rows) → TreeBuildResult` | 🔲 |
| S-02 | Withdrawal payload encoder/decoder | Frontend/Backend | — | URL payload round-trip test | 🔲 |
| S-03 | Supabase project setup + DB schema | Backend | — | `batches` + `batch_events` tables | 🔲 |
| S-04 | Edge Function: Soroban event indexer (scheduled) | Backend | S-03, C-04 | Real-time event stream via cron | 🔲 |
| S-05 | Edge Function: batch-status API | Backend | S-03 | `GET /batch-status?batch_id=1` endpoint | 🔲 |
| S-06 | Supabase Realtime channel config | Backend | S-04 | Live claim updates to dashboard | 🔲 |
| S-07 | Auditor CLI tool (root recomputation) | Backend | S-01 | Verify CSV vs on-chain root | 🔲 |

### Phase 3: Frontend (Days 6–9)

| ID | Task | Owner | Dependencies | Deliverable | Status |
|----|------|-------|-------------|-------------|--------|
| F-01 | Project scaffold (Next.js 14 + Tailwind + Shadcn) | Frontend | R-05 | Running dev server | 🔲 |
| F-02 | Landing page: hero, protocol diagram, how-it-works | Frontend | — | Deployed dev URL | 🔲 |
| F-03 | Employer CSV upload + PayrollPreviewTable | Frontend | F-01 | File parse & preview | 🔲 |
| F-04 | CommitmentBuilder UI + MerkleTree visualizer | Frontend | F-03, S-01 | Merkle root display | 🔲 |
| F-05 | Freighter wallet connect (employer & employee) | Frontend | F-01 | Wallet button + state | 🔲 |
| F-06 | Deposit confirm modal + Freighter tx signing | Frontend | F-04, F-05 | Testnet deposit live | 🔲 |
| F-07 | Employer batch dashboard (Supabase Realtime) | Frontend | F-06, S-06 | Live claim progress | 🔲 |
| F-08 | Employee withdrawal portal: proof gen UI | Frontend | F-05, R-05 | Progress ring, step indicators | 🔲 |
| F-09 | Noir WASM proof generation integration | Frontend | F-08, R-02 | Browser proof in < 120s | 🔲 |
| F-10 | Withdraw button + Freighter tx + success screen | Frontend | F-09 | End-to-end claim flow | 🔲 |
| F-11 | Auditor tool page | Frontend | F-01 | Root verification UI | 🔲 |
| F-12 | SecretExporter (employer downloads secrets CSV) | Frontend | F-04 | Employee payload export | 🔲 |

### Phase 4: Integration & Polish (Days 10–12)

| ID | Task | Owner | Dependencies | Deliverable | Status |
|----|------|-------|-------------|-------------|--------|
| I-01 | Full E2E test (3-employee batch on testnet) | All | F-10, C-05, S-05 | Working demo walkthrough | 🔲 |
| I-02 | Error handling polish (all error states) | Frontend | I-01 | User-friendly error screens | 🔲 |
| I-03 | Loading states + skeleton screens | Frontend | I-01 | Smooth UX | 🔲 |
| I-04 | Mobile responsive design pass | Frontend | I-01 | Works on mobile browser | 🔲 |
| I-05 | Performance: proof gen benchmark | Backend + Frontend | I-01 | < 120s target confirmed | 🔲 |
| I-06 | Demo video (2–3 min walkthrough) | PM | I-01 | Uploaded for submission | 🔲 |
| I-07 | README + GitHub documentation | PM | I-01 | Published | 🔲 |
| I-08 | DoraHacks submission | PM | I-06, I-07 | Submitted | 🔲 |

### Post-Hackathon Milestones (v1.0 — Production)

| ID | Milestone | Timeline | Owner | Description |
|----|-----------|----------|-------|-------------|
| M-01 | Full security audit | Month 1–2 | Security + Smart Contract | Audit of Noir circuit + Soroban contracts |
| M-02 | Tree depth optimization study | Month 1 | Smart Contract | Benchmark depth 16 vs 20; optimize constraints |
| M-03 | SDP integration | Month 3 | Backend | Fork SDP backend, add ZK payroll mode |
| M-04 | USDC mainnet deployment | Month 4 | All | Deploy on Stellar mainnet with real USDC |
| M-05 | KYB compliance layer (ASP) | Month 5 | Smart Contract + Backend | Association Set Provider for regulatory compliance |
| M-06 | Cross-chain settlement (Wormhole) | Month 6 | Smart Contract + Backend | Multi-chain salary settlement |
| M-07 | Mobile proof generation | Month 7 | Frontend | iOS/Android Noir WASM via React Native |
| M-08 | Enterprise pilot (50+ employees) | Month 8 | PM + All | First paying enterprise customer |

---

## 3. Dependencies Graph

```
Week 1                  Week 2
┌──────────┐           ┌──────────┐
│ R-01-R-07│───────┬──▶│ F-01-F-12│───┐
│ (Setup)  │       │   │ (Frontend)│   │
└──────────┘       │   └──────────┘   │
                   │   ┌──────────┐   │
                   ├──▶│ C-01-C-06│───┤
                   │   │ (Contracts)│  │
                   │   └──────────┘   │
                   │   ┌──────────┐   │
                   └──▶│ S-01-S-07│───┘
                       │ (Supabase)│
                       └──────────┘
                          Cloudflare
                          Pages + Supabase
                          = $0 hosting
```

**Critical Path:** R-02 → R-03 → C-01 → C-03 → C-04 → S-04 → S-06 → F-07 → I-01

---

## 4. Resource Allocation

| Agent | Phase 0 (D1-3) | Phase 1 (D3-5) | Phase 2 (D4-6) | Phase 3 (D6-9) | Phase 4 (D10-12) |
|-------|----------------|----------------|----------------|----------------|------------------|
| **Smart Contract** | Full-time: circuit, verifier deploy | Full-time: payroll contract, tests | Available for fixes | Available for fixes | Full-time: E2E, fixes |
| **Backend** | 50%: tree builder spike | Full-time: Supabase DB, Edge Functions | Full-time: indexer cron, Realtime config | Available for fixes | Full-time: perf, fixes |
| **Frontend** | Scaffold, landing | Available | Full-time: all UI | Full-time: all features | Full-time: polish, fixes |
| **PM** | Full-time: coordination, spec clarification | Full-time: sprint mgmt, audit scheduling | Full-time: stakeholder sync, demo prep | Full-time: demo prep | Full-time: submission |

---

## 5. Key Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| UltraHonk Soroban verify exceeds instruction limit | Medium | High | Test with minimal circuit first; have Groth16 fallback ready; use Protocol 26 MSM |
| Noir WASM bundle too large (20–40 MB) | Medium | Medium | Lazy-load WASM; show loading progress; serve as static file on Cloudflare CDN |
| Freighter + Noir WASM memory conflict | Low | High | Test concurrently early (R-07); isolate in Web Worker |
| Proof generation > 120s on low-end hardware | Medium | Medium | Reduce tree depth to 16 for MVP; show optimistic progress |
| Soroban testnet instability | Low | Medium | Have local testnet (soroban-preview) as fallback; pin known working RPC endpoint |
| Cross-contract call fees too high | Medium | High | Simulate/fees-estimate before finalizing; consider merging verifier into payroll contract |
| Supabase free tier limits exceeded | Low | Medium | Event indexer runs every 30s = ~86k invocations/mo (free: 500k). Buffer sufficient |
| Cloudflare Pages build timeout | Low | Medium | Next.js on Pages needs `@cloudflare/next-on-pages`; test build early in Sprint 1 |

---

## 6. OKRs & Success Criteria

### Hackathon OKRs (Weeks 1–2)

| Objective | Key Result | Owner |
|-----------|-----------|-------|
| **Ship a live demo** | E2E testnet flow: 3-employee batch created + all claimed | All |
| **ZK works in browser** | Noir WASM proof generation completes < 120s on Chrome | Frontend + Backend |
| **On-chain verification** | UltraHonkVerifierContract accepts proofs on testnet | Smart Contract |
| **Clean architecture** | Monorepo with contracts/, circuits/, frontend/, services/ | DevOps |
| **Submission ready** | Demo video + README + GitHub repo submitted to DoraHacks | PM |

### Product OKRs (Post-Hackathon)

| Objective | Key Result | Timeline |
|-----------|-----------|----------|
| **Production readiness** | Security audit passed | Month 2 |
| **SDP integration** | SDP fork with ZK payroll mode in staging | Month 3 |
| **Mainnet launch** | $10,000+ USDC disbursed privately | Month 4 |
| **Enterprise adoption** | 2 enterprise pilots onboarded | Month 6 |

---

## 7. Decision Log

| # | Decision | Rationale | Date | Status |
|---|----------|-----------|------|--------|
| D01 | Use Stellar Testnet (not mainnet) | Hackathon requirement; Protocol 26 live on testnet | June 2026 | ✅ Final |
| D02 | Noir + UltraHonk (not Circom + Groth16) | More expressive, aligns with hackathon theme, no trusted ceremony | June 2026 | ✅ Final |
| D03 | UltraHonkVerifierContract as separate contract | Follows indextree reference architecture; cleaner upgrade path | June 2026 | ✅ Final |
| D04 | Freighter wallet for both employer + employee | Standard Stellar browser wallet | June 2026 | ✅ Final |
| D05 | Salary amounts NEVER in events/storage | Core privacy requirement | June 2026 | ✅ Final |
| D06 | Merkle tree depth 16 for MVP (65K capacity) | Faster proof generation; sufficient for demo | June 2026 | ⏳ Proposed |
| D07 | Single batch per employer for MVP | Simpler contract storage; multi-batch post-MVP | June 2026 | ⏳ Proposed |
| D08 | **Deploy: Cloudflare Pages** (free) | Unlimited bandwidth, 500 builds/month, CDN | Vercel (paid scaling), IPFS | June 2026 | ✅ Final |
| D09 | **Realtime: Supabase Realtime** (free) | Built-in PostgreSQL replication → WebSocket; 200 concurrent connections free | Socket.io server (needs hosting) | June 2026 | ✅ Final |
| D10 | **Backend: Supabase Edge Functions** (free) | Deno-based serverless; 500k invocations/month free | Hono.js on VPS (needs server) | June 2026 | ✅ Final |
| D11 | **Database: Supabase PostgreSQL** (free) | 500MB free; stores public on-chain metadata only | No DB (harder to query state) | June 2026 | ✅ Final |
| D12 | **Circuit Serving: Static file** in `public/` | Zero compute cost, CDN cached | API endpoint (needs server) | June 2026 | ✅ Final |

---

## 8. Stakeholder Communication Cadence

| Audience | Frequency | Channel | Content |
|----------|-----------|---------|---------|
| Engineering team | Daily (standup) | Telegram / Linear | Sprint progress, blockers |
| Hackathon judges | At submission | GitHub + Demo video | README, walkthrough |
| Community (Discord / Twitter) | Weekly | Discord thread + Twitter | Progress updates, milestones |
| Internal stakeholders | Bi-weekly | Notion doc | Metrics, roadmap status |

---

*Roadmap maintained by Product Manager. Updated live in Linear.*
*Last updated: June 19, 2026*
