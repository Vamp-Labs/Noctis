# Governance & Milestone Tracking
## ZK-SDP — Confidential Payroll on Stellar
### Product Manager: ArbaLabs | June 2026

---

> This document serves as the governance hub: milestone sign-offs, decision registry, risk log, and stakeholder communication plan.

---

## 1. Decision Registry

All architectural and product decisions are recorded here for traceability.

| ID | Decision | Rationale | Alternatives Considered | Date | Status |
|----|----------|-----------|------------------------|------|--------|
| D-001 | **Proving System: UltraHonk** | Transparent setup (no ceremony), Noir-native toolchain, hackathon alignment | Groth16 (smaller proofs, cheaper verify, but needs ceremony) | June 2026 | ✅ Final |
| D-002 | **Merkle Tree Depth: 16** | 65,536 employees sufficient for MVP; faster proof generation | 20 (1M+ capacity, slower) | June 2026 | ⏳ Proposed |
| D-003 | **Poseidon2 t=3** | CAP-0075 compatible parameters | t=2 (binary tree, faster) | June 2026 | ✅ Final |
| D-004 | **Separate Verifier Contract** | Follows indextree reference, cleaner upgrade path | Inline verification in payroll contract | June 2026 | ✅ Final |
| D-005 | **Nullifier: Poseidon2(secret)** | Simpler implementation | Poseidon2(secret, index) — post-audit | June 2026 | ✅ Final |
| D-006 | **Token: Testnet USDC** | Realistic demo, SAC compatibility | XLM (simpler but less realistic) | June 2026 | ⏳ Pending |
| D-007 | **Single Batch per Employer** | Simpler contract state, MVP scope | Multi-batch (unlimited) | June 2026 | ⏳ Proposed |
| D-008 | **Secret Delivery: URL deep-link** | Lowest friction for employee | Downloadable JSON per employee | June 2026 | ✅ Final |
| D-009 | **Dashboard Realtime: Supabase Realtime** | Free (200 concurrent), built-in PostgreSQL replication, no server needed | Socket.io (needs server), Polling (worse UX) | June 2026 | ✅ Final |
| D-010 | **Auditor Tool: Web + CLI** | Both: web for casual, CLI for power users | Web only | June 2026 | ✅ Final |
| D-011 | **Deploy Frontend: Cloudflare Pages** | Free, unlimited bandwidth, CDN global, 500 builds/month | Vercel (paid scaling), IPFS (no API), VPS (needs management) | June 2026 | ✅ Final |
| D-012 | **Tree Builder: Client-side WASM** | Privacy — salaries never leave browser | Server-side (simpler but exposes data) | June 2026 | ✅ Final |
| D-013 | **Backend: Supabase Edge Functions** | Free (500k invocations/mo), Deno-based, managed | Hono.js on VPS (needs server and cost) | June 2026 | ✅ Final |
| D-014 | **Database: Supabase PostgreSQL** | Free (500MB), stores only public on-chain metadata | No DB (harder to query state efficiently) | June 2026 | ✅ Final |
| D-015 | **Circuit Serving: Static file** | Zero compute cost, Cloudflare CDN cache | API endpoint (needs serverless compute) | June 2026 | ✅ Final |

---

## 2. Risk Register

| ID | Risk | Probability | Impact | Score (P×I) | Mitigation | Owner | Status |
|----|------|------------|--------|-------------|------------|-------|--------|
| R-001 | UltraHonk verify exceeds Soroban instruction limit | Medium | High | Critical | Benchmark with minimal circuit first; have Groth16 fallback; use P26 MSM | Smart Contract | 🔴 Active |
| R-002 | Noir WASM bundle too large (20-40 MB) | Medium | Medium | High | Lazy-load WASM; show progress; serve from CDN; use IndexedDB cache | Frontend | 🟡 Monitored |
| R-003 | Freighter + Noir WASM memory conflict | Low | High | Medium | Test both loaded simultaneously in Sprint 1; isolate in Web Worker | Frontend | 🟡 Monitored |
| R-004 | Proof generation > 120s on low-end hardware | Medium | Medium | Medium | Reduce tree depth; show optimistic progress; consider server-side fallback for extreme cases | Backend + Frontend | 🟡 Monitored |
| R-005 | Soroban testnet instability/RPC downtime | Low | High | Medium | Pin stable RPC; have local soroban-preview as fallback | DevOps | 🟡 Monitored |
| R-006 | Cross-contract call fees too high | Medium | High | Critical | Simulate before finalizing; consider merging verifier into payroll | Smart Contract | 🔴 Active |
| R-007 | Circuit constraint count > 500k (slower proving) | Medium | Medium | Medium | Optimize circuit; reduce depth; consider simplifying Merkle path | Smart Contract | 🟡 Monitored |
| R-008 | Team bandwidth contention (blocked dependencies) | Medium | High | Critical | Clear dependency mapping; PM unblocking daily | PM | 🟡 Monitored |
| R-009 | Hackathon deadline slip | Low | High | Medium | Buffer days in Sprint 2; cut P2 scope if needed | PM | 🟡 Monitored |
| R-010 | Cloudflare Next.js build incompatibility | Medium | High | Medium | Test `@cloudflare/next-on-pages` early in Sprint 1; have static build fallback | Frontend | 🟡 Monitored |
| R-011 | Supabase free tier rate limits hit during demo | Low | Medium | Low | Monitor usage dashboard; upgrade only if needed ($25/mo Pro if absolutely required) | Backend | 🟢 Low |
| R-012 | Deno/Edge Function runtime incompatibility with Stellar SDK | Medium | Medium | Medium | Use raw `fetch()` for Soroban RPC instead of SDK; test Deno compat in Sprint 1 | Backend | 🟡 Monitored |

**Risk scoring:**
- Critical = immediate action required
- High = active mitigation plan in place
- Medium = monitored weekly
- Low = accepted

---

## 3. Milestone Tracker

| Milestone | Target Date | Status | Owner | Verification Criteria |
|-----------|-------------|--------|-------|----------------------|
| M-01 | Monorepo operational | Day 2 | 🔲 | `pnpm build` passes all packages |
| M-02 | Circuit compiled & verified locally | Day 3 | 🔲 | `nargo prove && bb verify` passes |
| M-03 | UltraHonkVerifier on testnet | Day 3 | 🔲 | Contract ID, verify() returns true |
| M-04 | ConfidentialPayrollContract written | Day 4 | 🔲 | All functions implemented |
| M-05 | Contracts unit tested | Day 4 | 🔲 | All test cases pass |
| M-06 | Contracts deployed on testnet | Day 5 | 🔲 | Cross-contract call works |
| M-07 | Tree builder + payload encoder complete | Day 5 | 🔲 | Root matches circuit output |
| M-08 | Event indexer + WS server working | Day 6 | 🔲 | Real-time events flowing |
| M-09 | Employer flow complete (CSV → deposit) | Day 7 | 🔲 | Full flow on testnet |
| M-10 | Employee withdrawal portal complete | Day 9 | 🔲 | Proof gen → withdraw → success |
| M-11 | Auditor tool functional | Day 8 | 🔲 | Root match verification |
| M-12 | Full E2E testnet demo passes | Day 10 | 🔲 | 3 employees claim successfully |
| M-13 | Demo video recorded | Day 11 | 🔲 | 2-3 min walkthrough |
| M-14 | README + GitHub documentation complete | Day 11 | 🔲 | Published |
| M-15 | DoraHacks submitted | Day 12 | 🔲 | Confirmation email |

---

## 4. Communication Cadence

| Audience | Frequency | Channel | Format | Owner |
|----------|-----------|---------|--------|-------|
| **Engineering team** | Daily (9:30 AM) | Telegram | Async standup: done/blocker/next | PM |
| **Engineering team** | Mon/Wed/Fri | Telegram/Loom | Quick video updates for visual progress | PM |
| **Internal demo** | Wed, Week 2 | Google Meet | Live demo of working features | All |
| **Hackathon community** | Weekly | Discord/Forum | Progress thread | PM |
| **Investors/stakeholders** | Bi-weekly | Notion doc | Metrics, milestone progress, risks | PM |
| **Final submission** | Day 12 | DoraHacks | GitHub + Demo video + README | PM |

### Standup Format (Daily)

```
Agent: [Name]
Done yesterday:
  - ...
Blockers:
  - ...
Today:
  - ...
```

---

## 5. Scope Management

### MVP Scope (Must Have)
- [x] Employer: CSV upload → tree build → deposit
- [x] Employee: connect wallet → ZK proof → withdraw
- [x] Dashboard: real-time claim progress
- [x] Auditor: root verification
- [x] Landing page with product pitch

### MVP Scope (Nice to Have — P2)
- [ ] Auditor: full nullifier audit table with claimed/unclaimed
- [ ] Mobile responsive design pass
- [ ] Loading states + skeleton screens everywhere
- [ ] Error tracking integration

### Out of Scope for MVP
- Multi-batch management (one batch per employer)
- Employee registry / KYC
- Email delivery of withdrawal links
- Cross-chain settlement
- Mobile app
- Governance token / DAO

### Scope Change Process

1. Anyone can request a scope change via Linear ticket tagged `scope-change`
2. PM evaluates: impact on timeline, dependencies, hackathon deadline
3. Decision: **Accept** (add to backlog), **Defer** (post-hackathon), **Reject** (with reason)
4. Communicated in daily standup

---

## 6. Escalation Path

| Issue Type | First Contact | Escalation | Final Authority |
|-----------|---------------|------------|-----------------|
| Technical blocker | Agent's peer (pair programming) | Smart Contract Lead | PM + Team |
| Dependency conflict | Both affected agents | PM (negotiation) | PM |
| Security finding | Security Engineer | Smart Contract + PM | Team consensus |
| Scope creep | PM | Team discussion | PM (final) |
| Resource constraint | PM | — | PM (re-prioritize) |
| External blocker (testnet, wallet) | DevOps | PM | PM |

**Emergency contact:** PM is available on Telegram 24/7 during Sprint 2 (crunch period).

---

## 7. Quality Gates

| Gate | Point | Criteria | Approver |
|------|-------|----------|----------|
| **Code Review** | Every PR | At least 1 approval from peer | Peer engineer |
| **Security Review** | Before E2E test | No P0/P1 findings | Security Engineer |
| **Integration Test** | Before demo | Full flow passes on testnet | PM |
| **Launch Ready** | Before submission | Launch checklist 100% ✅ | PM |
| **Submission** | Final | Demo video + README + GitHub | PM |

---

## 8. Post-Hackathon Transition

| Activity | Timeline | Owner |
|----------|----------|-------|
| Security audit scoping | Week 3 | PM + Security |
| Circuit optimization study | Week 3-4 | Smart Contract |
| SDP integration planning | Week 4 | Backend + PM |
| Mainnet deployment plan | Month 2 | All |
| Enterprise pilot outreach | Month 2 | PM |

---

## 9. Key Contacts

| Role | Name/Handle | Contact |
|------|-------------|---------|
| Product Manager | ArbaLabs PM | Telegram: @zkpm |
| Smart Contract Engineer | TBD | Telegram: @sc_dev |
| Backend Engineer | TBD | Telegram: @be_dev |
| Frontend Engineer | TBD | Telegram: @fe_dev |
| Security Engineer | TBD | Telegram: @sec_dev |
| DevOps | TBD | Telegram: @ops_dev |
| Web3 Researcher | TBD | Telegram: @research_dev |

---

*Governance document maintained by Product Manager. Updated weekly.*  
*Last updated: June 19, 2026*
