# 🚀 SPRINT 1 KICKOFF — Noctis Testnet MVP
**Start Date:** Monday, May 27, 2026  
**End Date:** Friday, June 10, 2026  
**Sprint Goal:** Testnet infrastructure + ZK dispatcher + smart wallets integration  
**Capacity:** 37 story points (20 Research + 17 Developer)  
**Target Velocity:** 100% (all 37 points delivered by June 10)

---

## 📋 CRITICAL PATH ALERT
**RES-002 (ZK Circuit Design) is the single blocking task for this sprint.**
- **Owner:** Web3 Researcher (primary)
- **Start:** TODAY (Monday, May 27)
- **Deadline:** Friday, June 7 (Day 7) — no slip tolerance
- **Blocks:** DEV-004 (ZK Dispatcher), DEV-007 (Proof Verification), M1–M2 milestones
- **Effort:** L (5–7 days of focused work)
- **Exit Criteria:**
  - ✅ Groth16 circuit spec (inputs, constraints, public/private signals)
  - ✅ BLS12-381 pairing-friendly field selection documented
  - ✅ Merkle tree proof structure (depth, hash function, leaf serialization)
  - ✅ Nullifier set design (prevents replay attacks)
  - ✅ Powers of Tau integration (trusted setup or pre-computed parameters)
  - ✅ Proof size estimate (<1 KB) and verification gas cost (<500K units)
  - ✅ Implementation roadmap for DEV-004 (pseudocode or Circom template)

---

## 🎯 SPRINT 1 TASK ALLOCATION

### **RESEARCH PHASE (20 story points)**
**ONLY RES-002 STARTS TODAY.** Others queue behind it.

#### **ACTIVE (Day 1–7)**
- **RES-002: ZK Circuit Design** [L effort, 13 points, CRITICAL PATH]
  - Owner: Web3 Researcher
  - Status: 🟡 NOT STARTED → 🟢 ACTIVE (Day 1)
  - Daily standup: Brief progress on Slack #noctis-dev (10 min, async)
  - Deliverable: `RES-002_CIRCUIT_SPEC.md` (by Day 7, Friday June 7)
  - Success metric: Spec is 100% complete, no blockers for DEV-004 handoff
  - **If stuck:** Escalate within 24 hours (PM + Smart Contract Engineer emergency sync)

#### **QUEUED (Start: Day 8, after RES-002 complete)**
- **RES-001: Protocol 26 Impact Assessment** [M effort, 5 points]
  - Owner: Web3 Researcher
  - Status: 🟠 QUEUED (starts Monday, June 10, Week 3)
  - Depends on: RES-002 completion (signal available for network analysis)

- **RES-003: Stellar RPC Migration** [M effort, 2 points]
  - Owner: Web3 Researcher
  - Status: 🟠 QUEUED (starts Monday, June 10, Week 3)
  - Depends on: RES-002 completion (testnet RPC stability assessment)

- **RES-004: SEP Compliance Audit** [S effort, 1 point]
  - Owner: Web3 Researcher
  - Status: 🟠 QUEUED (starts Monday, June 10, Week 3)
  - Depends on: RES-002 completion (regulatory framework locked)

---

### **DEVELOPER PHASE (17 story points)**
**DEV-001 & DEV-002/008/003 START DAY 1 (parallel, non-blocking).**

#### **ACTIVE (Day 1–7)**
- **DEV-001: Testnet Environment Setup** [M effort, 5 points, BLOCKER]
  - Owner: Backend Engineer
  - Status: 🟢 ACTIVE (Day 1)
  - Deliverables:
    - ✅ Stellar Testnet RPC configured (no latency >2s)
    - ✅ Friendbot faucet working (test account funding in <10s)
    - ✅ Soroban CLI v26.0.0 installed + PATH verified
    - ✅ `.env.testnet` and `.env.mainnet` split (network guard active)
    - ✅ Local Soroland sandbox (fallback if testnet RPC down)
  - Exit Deadline: **Day 2 (Tuesday, May 28) EOD** — P0 blocker
  - Success metric: `soroban contract invoke --testnet` works without errors
  - **If stuck (Day 2 EOD):** PM + DevOps emergency call (resolve within 2 hours or pivot to local sandbox)

- **DEV-008: Smart Contract Skeleton** [M effort, 5 points]
  - Owner: Smart Contract Engineer
  - Status: 🟢 ACTIVE (Day 1, parallel to DEV-001)
  - Depends on: DEV-001 (testnet setup) — soft dependency, can work locally
  - Deliverables:
    - ✅ `payroll_dispatcher.rs` (empty module structure, compile check)
    - ✅ `streaming_vault.rs` (empty module, Soroban SDK imports)
    - ✅ `wallet_factory.rs` skeleton
    - ✅ `yield_router.rs` skeleton
    - ✅ `policy_signer.rs` skeleton
    - ✅ Workspace Cargo.toml configured for all 5 contracts
    - ✅ CI pipeline (GitHub Actions) building all contracts
  - Exit Deadline: **Day 4 (Thursday, May 30)** — M1 milestone requires structure
  - Success metric: All 5 contracts compile without warnings; CI green

- **DEV-002: Streaming Payment Contract (Core Logic)** [M effort, 4 points]
  - Owner: Smart Contract Engineer
  - Status: 🟡 QUEUED (depends on DEV-001 + RES-002 by Day 8)
  - Soft start: Day 1 (design & pseudocode), hard start: Day 8 (after RES-002)
  - Deliverables:
    - Stream initialization (deposit, recipient, duration)
    - Real-time accrual calculation (per-second math)
    - Withdrawal mechanism
    - Cancellation logic
  - Exit Deadline: **Day 10 (Sunday, June 8)** — M2 integration testing
  - Success metric: 90% test coverage on streaming logic; gas <200K per tx

- **DEV-003: Smart Wallet Factory (CAP-0051)** [M effort, 3 points]
  - Owner: Smart Contract Engineer
  - Status: 🟡 QUEUED (depends on DEV-001 + RES-002 by Day 8)
  - Soft start: Day 1 (design), hard start: Day 8
  - Deliverables:
    - `sign_with_secp256r1()` custom signer contract
    - Wallet creation factory (deploys per account)
    - Signature verification against passkey pubkey
    - Integration with Passkey Kit SDK
  - Exit Deadline: **Day 10 (Sunday, June 8)** — M2 passkey registration
  - Success metric: Wallet deploys in <3s; signature verification <100ms

---

## 📅 DAILY STANDUP SCHEDULE (Async, Slack #noctis-dev)

**Format:** Post by 10:00 UTC, 3 sentences max
```
Status: [ACTIVE | QUEUED | BLOCKED]
What I did yesterday: [1–2 bullet points]
Blockers: [none | <list>] | Escalation: [no | yes → @pm]
```

**Timezone accommodation:** All members post async by 10:00 UTC; PM reviews and unblocks same day.

**Daily sync point:**
- **Monday–Thursday (May 27–30 & June 2–5):** 9:30 UTC (30 min, async review + rapid responses)
- **Friday (June 7):** 10:00 UTC (end of RES-002, debrief + handoff prep)

---

## 🎯 MILESTONE M1–M2 EXIT CRITERIA (by Friday, June 10)

### **M1: Testnet Infrastructure Ready** ✅ MUST PASS
- ✅ Testnet RPC live + monitored (Grafana dashboard)
- ✅ Friendbot working (test accounts funded)
- ✅ Soroban CLI v26.0.0 verified
- ✅ Network guard active (prevents mainnet deployment)
- ✅ Local fallback (Soroland sandbox) tested
- ✅ All 5 smart contracts compiling + CI green

### **M2: Core Smart Contracts + Wallet Integration** ✅ MUST PASS
- ✅ RES-002 (ZK circuit) 100% spec delivered
- ✅ DEV-002 (streaming) core logic testnet-deployed + tested
- ✅ DEV-003 (smart wallet) deploys <3s + passkey integration drafted
- ✅ Proof verification skeleton in DEV-007 (not complete, but integrated)
- ✅ 90%+ test coverage on payroll + streaming contracts
- ✅ Security pre-audit checklist started (no P0 issues known)

**If either M1 or M2 fails by June 10:** Sprint extended to June 12 (2 days buffer), or scope reduced to M1 only.

---

## 🚨 P0 RISK PROTOCOL

**If any of these happen, PM initiates emergency response (same day):**

| Risk | Symptom | Response | Owner |
|---|---|---|---|
| **DEV-001 stuck** | Testnet RPC down or Friendbot broken past Day 2 EOD | Emergency call with Backend + DevOps; pivot to local sandbox; reassess scope | PM + Backend Eng |
| **RES-002 slipping** | No spec draft by Day 5 (Wednesday, June 4) | Break into subtasks (circuit → merkle → nullifier → setup), add researcher support | PM + Researcher |
| **Testnet outage >2h** | Stellar Testnet RPC 502 errors persistent | Activate local Soroland sandbox; document workaround; ping Stellar team | DevOps + PM |
| **Passkey Kit SDK unavailable** | Integration blocked past Day 8 | Mock passkey signer for M2; real SDK deferred to Sprint 2 | Frontend Eng + PM |
| **Soroswap/Blend testnet down** | DEV-006/007 blocked (no swap/lending rates) | Use hardcoded rate for testnet; update DEV-009 acceptance criteria | Smart Contract Eng + PM |

---

## 📊 VELOCITY TRACKING

**Target:** 37 points delivered by EOD Friday, June 10

| Task | Owner | Points | Day 1 | Day 4 | Day 7 | Day 10 | Status |
|---|---|---|---|---|---|---|---|
| RES-002 | Researcher | 13 | 20% | 50% | 100% | ✅ | 🟢 ACTIVE |
| DEV-001 | Backend | 5 | 30% | 100% | 100% | ✅ | 🟢 ACTIVE |
| DEV-008 | SmartCtx Eng | 5 | 20% | 100% | 100% | ✅ | 🟢 ACTIVE |
| DEV-002 | SmartCtx Eng | 4 | 0% | 10% | 30% | 80% | 🟡 QUEUED |
| DEV-003 | SmartCtx Eng | 3 | 0% | 5% | 25% | 70% | 🟡 QUEUED |
| RES-001 | Researcher | 5 | 0% | 0% | 0% | 50% | 🟠 QUEUED |
| RES-003 | Researcher | 2 | 0% | 0% | 0% | 50% | 🟠 QUEUED |
| RES-004 | Researcher | 1 | 0% | 0% | 0% | 50% | 🟠 QUEUED |
| **TOTAL** | | **38** | | | | | |

**Legend:** 🟢 ACTIVE (started) | 🟡 QUEUED (waiting) | 🟠 BLOCKED (unblocked on demand)

---

## 📞 WEEKLY SYNC (Friday, 10:00 UTC)

**Attendees:** PM, Web3 Researcher, Smart Contract Engineer, Backend Engineer, Frontend Engineer (optional)  
**Duration:** 30 min  
**Agenda:**
1. M1–M2 milestone progress (2 min)
2. RES-002 handoff to DEV-004 (5 min) — if ready
3. Blocker triage (5 min)
4. Velocity vs. target (2 min)
5. Sprint 2 prep (look-ahead) (5 min)
6. Demo prep for demo day (11 min)

---

## 🎬 SUCCESS DEFINITION

**Sprint 1 is successful if:**
- ✅ RES-002 (ZK circuit) spec delivered by Day 7 with 0 blockers for DEV-004
- ✅ DEV-001 (testnet) live and stable by Day 2 EOD
- ✅ M1 milestones 100% complete by Day 10
- ✅ M2 milestones 80%+ complete by Day 10
- ✅ Zero P0 blockers at end of sprint
- ✅ Team velocity ≥90% (≥33 points delivered)

**If all pass:** Sprint 2 kicks off Monday, June 12 with DEV-004, DEV-005, DEV-006 in parallel.

---

## 🎯 NEXT STEP (Day 1 — RIGHT NOW)

**All team members:**
1. Read this kickoff (10 min)
2. Read `/home/cn/Projects/Competition/Web3/Noctis/.planning/TASK_HANDOFF.md` → find your tasks (20 min)
3. Post first standup to Slack #noctis-dev by 10:00 UTC (3 min)
4. Start work immediately

**PM (me):**
- Monitoring Slack daily for blockers
- P0 risk escalation protocol active
- Friday sync: 10:00 UTC (calendar invite sent)
- Weekly metrics update (email Friday EOD)

**Questions?** Slack #noctis-dev or DM @PM.

---

**LET'S SHIP.** 🚀
