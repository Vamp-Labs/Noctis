# 🚀 SPRINT 2 KICKOFF — JUNE 12–25, 2026
## ZK Integration + Yield Routing + Lending + Proof Verification + Demo Prep

**Kickoff:** Friday, June 12, 2026, 10:00 UTC  
**Duration:** 2 weeks (Jun 12–25)  
**Sprint Velocity Target:** 26+ pts  
**Demo Day:** Jun 26–30 (T-14 days from Sprint 2 start)

---

## 📊 SPRINT 1 → SPRINT 2 HANDOFF

### What Sprint 1 Delivered
```
✅ Sprint 1 Velocity: 49 pts (132% of 37-pt target)
✅ M1 (Testnet Infrastructure): 100% complete
✅ M2 (Core Contracts + Wallets): 95% complete
✅ RES-002 → DEV-004 Handoff: Complete (no open questions)
✅ 5 smart contracts: All compiling, CI green
✅ Testnet: 100% uptime (0.873s avg latency)
✅ 32 planning documents created
```

### Sprint 2 Inherits
| Item | Status | Impact |
|------|--------|--------|
| **DEV-002 (Streaming)** | ✅ 100% | Ready for M2 integration |
| **DEV-003 (Smart Wallet)** | ✅ 90% | Passkey integration, Sprint 2 finalize |
| **DEV-012 (API)** | ✅ 90% | 9/10 endpoints, subgraph 80% |
| **DEV-009 (Passkey UI)** | 🟡 60% | Complete in Sprint 2 |
| **DEV-010 (Employee UI)** | 🟡 40% | Complete in Sprint 2 |
| **RES-003 (RPC Migration)** | 🟡 40% | Complete in Sprint 2 |
| **RES-002 (ZK Spec)** | ✅ 100% | Handoff to DEV-004 complete |

---

## 🎯 SPRINT 2 OVERVIEW

### Sprint 2 Tasks

| ID | Task | Points | Owner | Dependencies | Priority |
|----|------|--------|-------|-------------|----------|
| **DEV-004** | ZK Dispatcher Contract | **8 pts** | Smart Eng | RES-002 ✅ | 🔴 Critical |
| **DEV-005** | Yield Routing Logic | **5 pts** | Smart Eng | RES-001 (Jun 12) | 🔴 Critical |
| **DEV-006** | Blend Lending Integration | **5 pts** | Smart Eng | RES-003 (Jun 12) | 🔴 Critical |
| **DEV-007** | Proof Verification & Integration | **5 pts** | Smart Eng | DEV-004 (Jun 16) | 🔴 Critical |
| **DEV-009** | Passkey Registration UI (cont.) | **5 pts** | Frontend | DEV-003 ✅ | 🟡 Medium |
| **DEV-010** | Employee Portal UI (cont.) | **5 pts** | Frontend | DEV-003 ✅ | 🟡 Medium |
| **DEV-012** | API Layer (cont.) | **1 pt** | Backend | Sprint 1 | 🟢 Low |
| **DEV-013** | Demo Day Integration & Docs | **3 pts** | All | All Sprint 2 tasks | 🟡 Medium |
| **RES-003** | Stellar RPC Migration (cont.) | **1 pt** | Researcher | Started Jun 8 | 🟡 Medium |
| **RES-001** | Protocol 26 Impact Analysis | **5 pts** | Researcher | After RES-003 | 🟡 Medium |
| **RES-004** | SEP Compliance Audit | **1 pt** | Researcher | After RES-001 | 🟢 Low |
| **TOTAL** | **Sprint 2 Capacity** | **26+ pts** | All | Dependencies tracked | — |

### Milestones

| Milestone | Target Date | Tasks | Exit Criteria |
|-----------|------------|-------|---------------|
| **M3: Yield + Lending** | **Jun 18** | DEV-004 (50%), DEV-005 (100%), DEV-006 (100%) | Yield routing + Blend integration deployed |
| **M4: Proof + ZK** | **Jun 22** | DEV-004 (100%), DEV-007 (100%) | Groth16 verification working on testnet |
| **M5: UI Complete** | **Jun 22** | DEV-009 (80%+), DEV-010 (70%+) | Passkey registration + employee portal functional |
| **Demo Day Ready** | **Jun 25** | DEV-013 (100%), All M3–M5 | Full testnet MVP ready for demo |

---

## 👥 TEAM ALLOCATION

### Smart Contract Engineer (Primary: DEV-004, DEV-005, DEV-006, DEV-007)
**Total Points:** 23 pts (DEV-004: 8, DEV-005: 5, DEV-006: 5, DEV-007: 5)

| Week | Mon | Tue | Wed | Thu | Fri | Sat |
|------|-----|-----|-----|-----|-----|-----|
| **W1 (Jun 12–17)** | DEV-004 start | DEV-004 core | DEV-005 start | DEV-006 start | M3 review | — |
| **W2 (Jun 18–25)** | DEV-007 start | DEV-004+7 join | Integration | Testing | Demo prep | Sprint close |

**Critical Path:** DEV-004 (Day 1) → DEV-007 (Day 5+) + M3 checkpoint (Jun 18)

---

### Web3 Researcher (Primary: RES-003 cont., RES-001, RES-004)
**Total Points:** 7 pts (RES-003: 1, RES-001: 5, RES-004: 1)

| Week | Mon | Tue | Wed | Thu | Fri | Sat |
|------|-----|-----|-----|-----|-----|-----|
| **W1 (Jun 12–17)** | RES-003 complete | RES-001 start | RES-001 core | RES-001 draft | M3 review | — |
| **W2 (Jun 18–25)** | RES-001 final | RES-004 start | RES-004 complete | All docs final | Demo support | Sprint close |

**Queue:** RES-003 → RES-001 → RES-004 (confirmed from Sprint 1 Sync)

---

### Backend Engineer (Primary: DEV-012 cont., DEV-013 infra support)
**Total Points:** 4 pts

| Week | Mon | Tue | Wed | Thu | Fri | Sat |
|------|-----|-----|-----|-----|-----|-----|
| **W1 (Jun 12–17)** | DEV-012 finalize | Performance tuning | Monitoring setup | Doc writing | M3 review | — |
| **W2 (Jun 18–25)** | API hardening | Subgraph finalize | Demo scripting | Deployment docs | Sprint close | — |

---

### Frontend Engineer (Primary: DEV-009 cont., DEV-010 cont.)
**Total Points:** 10 pts

| Week | Mon | Tue | Wed | Thu | Fri | Sat |
|------|-----|-----|-----|-----|-----|-----|
| **W1 (Jun 12–17)** | DEV-009 completion | Registration flow | Integration test | DEV-010 start | M3 review | — |
| **W2 (Jun 18–25)** | DEV-010 core | Dashboard complete | UI polish | Demo UI prep | Sprint close | — |

---

### PM (You) — Sprint Master
| Week | Mon | Tue | Wed | Thu | Fri | Sat |
|------|-----|-----|-----|-----|-----|-----|
| **W1 (Jun 12–17)** | Sprint kickoff | Daily monitoring | Daily monitoring | Daily monitoring | Week 1 sync | — |
| **W2 (Jun 18–25)** | Daily monitoring | M3 milestone check | Daily monitoring | M4+M5 check | Sprint close + Demo prep | — |

**Key PM Dates:**
- Jun 12 (Fri): Sprint 2 kickoff + task assignment
- Jun 18 (Thu): Week 1 Sync (M3 progress check)
- Jun 22 (Mon): M4+M5 milestone check
- Jun 25 (Thu): Sprint 2 Close + Demo Day prep
- Jun 26–30: **Demo Day Window**

---

## 📅 SPRINT 2 WEEK 1 (Jun 12–17) — FOUNDATION

### Day 1 — Friday, June 12: Sprint Kickoff

**10:00 UTC — Kickoff Standup:**
- [ ] PM presents Sprint 2 scope (+26 pts target)
- [ ] Smart Eng: Start DEV-004 (ZK Dispatcher) — read RES-002 spec + implement
- [ ] Researcher: Complete RES-003 (RPC Migration) — final 60%
- [ ] Backend: Finalize DEV-012 (last API endpoint + subgraph)
- [ ] Frontend: Complete DEV-009 (Passkey UI) — final 40%

**Key Launch Actions:**
- Smart Eng: Read `RES-002_CIRCUIT_SPEC.md` (1,251 lines) + `RES002_TO_DEV004_HANDOFF.md`
- Smart Eng: Begin `crates/payroll_dispatcher/src/lib.rs` implementation
- All: Confirm testnet connection stable from Sprint 1

**Day 1 Goal:** DEV-004: 15% start | DEV-005: start design | RES-003: 50% (complete) | DEV-012: 95%

---

### Days 2–3 — Sat Jun 13, Sun Jun 14: Implementation Push

**Smart Eng (DEV-004 focus):**
- Implement ZK batch entry point (process_batch(), submit_proof())
- Integrate Groth16 verification circuit (from RES-002)
- Target: 30% complete by end of Day 3

**Researcher (RES-003 completion):**
- Finalize Stellar RPC failover strategy
- Rate-limit handling documented
- Target: 70% complete (nearly done)

**Frontend (DEV-009 completion):**
- Complete Passkey registration UI flow
- Integration test with DEV-003 (smart wallet)
- Target: 80% complete

---

### Days 4–6 — Mon Jun 16, Tue Jun 17, Wed Jun 18: M3 Build-up

**Smart Eng (DEV-005 + DEV-006 start):**
- DEV-004: 50% (ZK core logic complete)
- DEV-005: Start yield routing (Soroswap integration)
- DEV-006: Start Blend lending integration
- Target: DEV-005 30%, DEV-006 20% by Jun 18

**All Tasks Converging:**
- RES-003: 100% complete (research done, handoff ready)
- DEV-012: 100% complete (all endpoints + subgraph)
- DEV-009: 90%+ complete (registration flow verified)
- DEV-010: 30% start (employee portal dashboard)

**Week 1 Goal:**
- M3 path: DEV-004 50% + DEV-005 30% + DEV-006 20%
- Research: RES-003 100%, RES-001 20%
- UI: DEV-009 90%, DEV-010 30%
- Infra: DEV-012 100%

---

### Week 1 Sync — Thu Jun 18 (or Fri Jun 19)

**M3 Milestone Check:**
- DEV-004 (ZK): 50% target → Actual: __%
- DEV-005 (Yield): 30% target → Actual: __%
- DEV-006 (Blend): 20% target → Actual: __%
- **M3 Verdict:** 🟢 ON TRACK / 🟡 NEEDS ATTENTION / 🔴 BLOCKED

**Other Metrics:**
- DEV-007: Ready to start? (depends on DEV-004 progress)
- RES-001: Progress check (should be 40%+)
- DEV-010: Progress check (should be 40%+)
- Testnet stability: All checks passing?
- Velocity so far: __ / 26 pts

---

## 📅 SPRINT 2 WEEK 2 (Jun 18–25) — INTEGRATION + DEMO PREP

### Days 8–10 — Thu Jun 19, Fri Jun 20, Sat Jun 21: M3 → M4 Transition

**Smart Eng (DEV-007 start):**
- DEV-004: 75% (ZK dispatcher nearly complete)
- DEV-005: 80% (yield routing deployed)
- DEV-006: 70% (Blend integration tested)
- DEV-007: 30% (proof verification started)

**Frontend (DEV-010 push):**
- DEV-009: 100% complete (passkey registration ✅)
- DEV-010: 60% (employee dashboard core)

**Researcher (RES-001 completion):**
- RES-001: 70% (Protocol 26 analysis draft)
- Target: 100% by Jun 22

**M3 Verdict:** Should be 90%+ by Jun 18–19

---

### Days 11–12 — Mon Jun 22, Tue Jun 23: M4 + M5 Milestone

**M4 Milestone Check (Proof + ZK):**
- DEV-004 (ZK): 100% target → Actual: __%
- DEV-007 (Proof): 100% target → Actual: __%
- **M4 Verdict:** 🟢 / 🟡 / 🔴

**M5 Milestone Check (UI):**
- DEV-009 (Passkey): 100% target → Actual: __%
- DEV-010 (Employee): 70% target → Actual: __%
- **M5 Verdict:** 🟢 / 🟡 / 🔴

---

### Days 13–14 — Wed Jun 24, Thu Jun 25: DEMO PREP

**DEV-013 (Demo Integration):**
- [ ] All smart contracts deployed + verified
- [ ] API layer operational (all endpoints)
- [ ] Subgraph indexing live
- [ ] Passkey registration flow working
- [ ] Employee portal functional (core features)
- [ ] Demo script written + rehearsed
- [ ] Documentation complete
- [ ] Performance benchmarks captured
- [ ] Known issues documented

**Sprint 2 Close (Jun 25, 17:00 UTC):**
- Final velocity count: __ / 26 pts
- M3 verification: __%
- M4 verification: __%
- M5 verification: __%
- Demo Day readiness: ✅ / 🟡 / 🔴
- Retrospective + Demo Day planning

---

## 🚨 CRITICAL PATH (Sprint 2)

```
DAY 1               DAY 5-6              DAY 8-10            DAY 12-14
─────────────────────────────────────────────────────────────────────────────
RES-002 ✅
    └──→ DEV-004 ─→ DEV-004 50% ─→ DEV-004 100% ─→ DEV-004+007 integrate
         (ZK Disp)    (M3 check)      (M4 check)         (Demo prep)
             │
             └──→ DEV-005 ─→ DEV-005 100%
                  (Yield)      (M3 complete)

RES-003 ─→ DEV-006 ─→ DEV-006 100%
(RPC)       (Blend)     (M3 complete)

RES-001 ─→ DEV-005 finalize
(Proto26)

DEV-009 ─→ DEV-009+003 integrate ─→ DEV-009 100% ─→ Demo UI
(Passkey)  (wallet integration)    (M5 complete)

DEV-010 ─→ Dashboard core ─→ Employee portal 70% ─→ Demo UI
(Portal)                        (M5 partial)

─────────────────────────────────────────────────────────────────────────────
RISK: DEV-004 slipping → cascades to DEV-007 → delays M4 → delays Demo Day
MITIGATION: DEV-004 has 3-day buffer (start Day 1, due Day 8)
```

---

## 🛡️ RISK ASSESSMENT

| Risk | Impact | Likelihood | Mitigation | Owner |
|------|--------|-----------|------------|-------|
| **DEV-004 (ZK) slips >2 days** | 🔴 Blocks DEV-007 + M4 | 🟡 Medium | Start Day 1, 3-day buffer. If >2d slip, reduce DEV-006 scope | PM |
| **Blend testnet unstable** | 🟡 Blocks DEV-006 | 🟡 Medium | Fallback to Soroswap-only routing | Backend |
| **Passkey SDK v2.1 breaks** | 🟡 Blocks DEV-009 | 🟢 Low | Already tested Sprint 1. Fallback to mock (1 day) | Frontend |
| **Testnet RPC outage** | 🔴 Blocks all | 🟢 Low | Local sandbox ready (validated Sprint 1) | Backend |
| **Demo Day scope creep** | 🟡 Misses Jun 26 | 🟡 Medium | PM veto: demo only core features, defer nice-to-haves | PM |

---

## 📊 VELOCITY TRACKING

```csv
Day,Date,Phase,Points,Cumulative,% Sprint Target
1,Jun 12,Kickoff +2,2,7%
2,Jun 13,Implementation +3,5,19%
3,Jun 14,Implementation +3,8,31%
4,Jun 16,Implementation +4,12,46%
5,Jun 17,Implementation +4,16,62%
6,Jun 18,M3 Check +4,20,77%
7,Jun 19,M3→M4 +3,23,88%
8,Jun 20,Implementation +3,26,100%
9,Jun 22,M4+M5 Check +4,30,115%
10,Jun 23,Integration +3,33,127%
11,Jun 24,Demo Prep +2,35,135%
12,Jun 25,Sprint Close +0,35,135%
```

**Target:** 26 pts (100%) | **Stretch:** 35 pts (135%)

---

## 🎯 DEMO DAY READINESS (Jun 26–30)

### Demo Day Checklist

**Smart Contracts (Must All Be Deployed):**
- [ ] `payroll_dispatcher` — ZK batch payroll entry point
- [ ] `streaming_vault` — Payment streaming (reuse Sprint 1)
- [ ] `wallet_factory` — Passkey smart wallets (reuse Sprint 1)
- [ ] `yield_router` — Yield routing to Soroswap/Blend
- [ ] `policy_signer` — Policy enforcement (if needed for demo)

**API Layer:**
- [ ] All 10 REST endpoints operational
- [ ] Subgraph syncing and indexing live
- [ ] Query latency <500ms verified

**UI:**
- [ ] Passkey registration flow (create wallet + register)
- [ ] Employee portal dashboard (view streams, withdraw)
- [ ] Employer dashboard (batch upload, manage payroll) — if scope allows

**Demo Script (Core Flow):**
1. Employer creates batch payroll (via ZK proof)
2. Employees receive streaming payments
3. Employee withdraws accrued pay
4. Yield routing on idle capital (if time allows)
5. Smart wallet passkey authentication demo

**Known Issues (Documented):**
- [ ] List any known limitations for demo
- [ ] Workarounds available

---

## 📋 SPRINT 2 SUCCESS CRITERIA

### By Jun 12–25 Sprint Close

**Must Have (P0):**
- [ ] DEV-004 (ZK Dispatcher): 100% deployed ✅
- [ ] DEV-007 (Proof Verification): 100% deployed ✅
- [ ] M3: Yield routing + Blend lending 100% ✅
- [ ] M4: Proof + ZK integration 100% ✅
- [ ] Testnet: 100% uptime throughout Sprint 2

**Should Have (P1):**
- [ ] DEV-009 (Passkey UI): 80%+ complete
- [ ] DEV-010 (Employee Portal): 70%+ complete
- [ ] M5: UI milestone 70%+
- [ ] Demo script written + rehearsed

**Nice to Have (P2):**
- [ ] DEV-013: Full demo documentation
- [ ] Performance benchmarks
- [ ] Employer dashboard (DEV-011 start)

### By Jun 26–30 Demo Day

- [ ] All core demo flows working
- [ ] Testnet stable with <2s latency
- [ ] Demo script rehearsed
- [ ] Known issues documented
- [ ] Backup plan if demo fails (screenshots, recording)

---

## 🚀 SPRINT 2 KICKOFF STANDUP (Jun 12, 10:00 UTC)

```
🚀 **SPRINT 2 KICKOFF — JUNE 12, 2026**

📊 **Sprint 1 Recap:**
- Velocity: 49 pts (132% target) 🎉
- M1: 100%, M2: 95% ✅
- Zero P0 blockers ✅
- Testnet 100% uptime ✅

🎯 **Sprint 2 Target: 26+ pts**
- M3: Yield + Lending (Jun 18)
- M4: Proof + ZK (Jun 22)  
- M5: UI Complete (Jun 22)
- Demo Day: Jun 26–30

📋 **Today's Actions:**
- Smart Eng: Start DEV-004 (ZK Dispatcher) — read RES-002 spec
- Researcher: Complete RES-003 (final 60%)
- Backend: Finalize DEV-012 (last API endpoint)
- Frontend: Complete DEV-009 (Passkey UI final 40%)

⚠️ **Critical Path:** DEV-004 → DEV-007 (no slip allowed)
🛡️ **Risks:** Blend testnet stability (monitor), Passkey SDK (fallback mock)

📅 **Key Dates:**
- Jun 18: Week 1 Sync + M3 check
- Jun 22: M4 + M5 check
- Jun 25: Sprint Close + Demo prep
- Jun 26–30: Demo Day!

**Let's ship Testnet MVP. 🚀**
```

---

## 📚 REFERENCE DOCUMENTS

| Document | Location | Purpose |
|----------|----------|---------|
| Sprint 1 Close | `.planning/SPRINT_1_CLOSE_JUN_10.md` | Sprint 1 retrospective + decisions |
| RES-002 ZK Spec | `.planning/RES-002_CIRCUIT_SPEC.md` | DEV-004 input (1,251 lines) |
| RES-002 Handoff | `.planning/RES002_TO_DEV004_HANDOFF.md` | DEV-004 implementation guide |
| Task Handoff | `.planning/TASK_HANDOFF.md` | 22-task decomposition |
| Testnet Setup | `TESTNET_SETUP.md` | Infrastructure reference |
| Sprint 2 This Doc | THIS FILE | Sprint 2 execution plan |

---

## ✅ SPRINT 2 KICKOFF COMPLETE

**Sprint 2 is ready for execution with:**
- ✅ 26+ point target with stretch to 35 pts
- ✅ Clear M3/M4/M5 milestones with exit criteria
- ✅ Critical path mapped (DEV-004 → DEV-007)
- ✅ Daily execution plans for all 4 engineers
- ✅ Demo Day readiness framework (Jun 26–30)
- ✅ Risk assessment with mitigations
- ✅ Velocity tracking template

**Verdict:** 🟢 **GO FOR SPRINT 2 EXECUTION**

---

*Sprint 2 Kickoff Document*  
*Date: June 12, 2026, 10:00 UTC*  
*Type: Sprint Planning + Execution*  
*Status: ✅ READY TO EXECUTE*

---

**🚀 SPRINT 2 IS ACTIVE. DEMO DAY IN 14 DAYS. LET'S SHIP THE TESTNET MVP.**
