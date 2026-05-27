# 🚀 SPRINT 1 QUICK REFERENCE CARD
**Print this. Share this. Memorize this.**

---

## 🎯 THE ONE-LINER
**ONE researcher (RES-002: ZK circuit). THREE developers (DEV-001, DEV-008, DEV-002/003). SEVEN days to deliver. ZERO tolerance for testnet failure.**

---

## 📅 SPRINT AT A GLANCE

| Metric | Value |
|---|---|
| **Start** | Mon, May 27, 2026 |
| **End** | Fri, June 10, 2026 |
| **Duration** | 2 weeks (14 days) |
| **Velocity Target** | 37 points (100% delivery) |
| **Minimum Pass** | 33 points (90%) |
| **Critical Path** | RES-002 (ZK circuit) → DEV-004 |
| **P0 Blocker** | DEV-001 (testnet setup, due Day 2) |

---

## 🟢 WHAT'S ACTIVE TODAY (May 27)

### Researchers
✅ **RES-002: ZK Circuit Design** (13 points, due Jun 7)
- Design Groth16 circuit (inputs, constraints, signals)
- BLS12-381 pairing structure
- Merkle tree proofs + nullifier set
- Powers of Tau setup
- Proof size & gas cost estimates
- Implementation roadmap for DEV-004

### Developers
✅ **DEV-001: Testnet Setup** (5 points, due May 28) — **P0 BLOCKER**
- Stellar Testnet RPC (<2s latency)
- Friendbot working (test funding)
- Soroban CLI v26.0.0
- Network guard (`.env.testnet` / `.env.mainnet`)
- Local fallback (Soroland sandbox)

✅ **DEV-008: Contract Skeleton** (5 points, due May 30)
- 5 contracts compiling (payroll, streaming, yield, wallet, policy)
- GitHub Actions CI green
- Cargo workspace configured

---

## 🟡 QUEUED (Wait for RES-002 + DEV-001/008)

| Task | Owner | Points | Hard Start | Blocker |
|---|---|---|---|---|
| DEV-002 (Streaming) | Smart Eng | 4 | Jun 8 | RES-002 + DEV-001 |
| DEV-003 (Smart Wallet) | Smart Eng | 3 | Jun 8 | RES-002 + DEV-001 |
| RES-001 (Protocol 26) | Researcher | 5 | Jun 10 | RES-002 |
| RES-003 (RPC Migration) | Researcher | 2 | Jun 10 | RES-002 |
| RES-004 (SEP Compliance) | Researcher | 1 | Jun 10 | RES-002 |

---

## 🚨 P0 RISKS (Monitor Daily)

| Risk | Symptom | Action |
|---|---|---|
| **Testnet down** | Stellar RPC 502 or Friendbot broken (past Day 2) | Emergency call: Backend + DevOps. Switch to local sandbox. |
| **RES-002 stalling** | <50% by Day 5 (Wed, Jun 4) | Break into subtasks. Add support. Extend if needed. |
| **CI failing** | DEV-008 contracts won't compile | Code review + fix same day. |
| **Testnet RPC latency >5s** | Network slow or flaky | Document workaround. Adjust deadlines. |

**Escalation:** Slack @PM immediately (2-hour response window)

---

## 📊 MILESTONES TO HIT

### **M1: Testnet Infrastructure Ready** (by Jun 10) ✅ MUST PASS
- ✅ RPC live + monitored
- ✅ Friendbot working
- ✅ Soroban v26.0.0 verified
- ✅ Network guard active
- ✅ All 5 contracts compiling + CI green
- ✅ Local fallback documented

### **M2: Core Smart Contracts + Wallets** (by Jun 10) ✅ MUST PASS (80%)
- ✅ RES-002 spec 100% delivered
- ✅ Streaming core logic deployed + tested
- ✅ Smart wallet deploys <3s + passkey draft
- ✅ Proof verification skeleton integrated
- ✅ 90%+ test coverage
- ✅ Security checklist started

---

## 📞 DAILY STANDUP (10:00 UTC)

**Post to #noctis-dev:**
```
Status: [ACTIVE | QUEUED | BLOCKED]
Yesterday: [1–2 bullets]
Today: [1–2 bullets]
Blockers: [none | list] | Escalate: [no | yes]
```

---

## 📋 VELOCITY TRACKING

**Track daily on shared Google Sheet:**
- RES-002: [____% complete, on track for Jun 7?]
- DEV-001: [____% complete, on track for May 28?]
- DEV-008: [____% complete, on track for May 30?]
- DEV-002: [____% complete, ready to start Jun 8?]
- DEV-003: [____% complete, ready to start Jun 8?]

**Target:** 37 points by Jun 10 EOD

---

## 📞 WEEKLY SYNC (Friday, 10:00 UTC)

**Attendees:** PM, Researcher, Smart Contract Eng, Backend Eng, Frontend Eng (optional)  
**Duration:** 30 min  
**Agenda:**
1. M1–M2 progress (2 min)
2. RES-002 handoff (if ready) (5 min)
3. Blockers & escalations (5 min)
4. Velocity check (2 min)
5. Sprint 2 look-ahead (5 min)
6. Demo day prep (11 min)

**Sync #1:** Friday, May 31 @ 10:00 UTC  
**Sync #2:** Friday, June 7 @ 10:00 UTC (RES-002 handoff!)

---

## ✅ SUCCESS CHECKLIST (June 10 EOD)

- [ ] RES-002 delivered (Day 7)
- [ ] DEV-001 live (Day 2)
- [ ] DEV-008 compiling (Day 4)
- [ ] M1 100% complete
- [ ] M2 80%+ complete
- [ ] Zero P0 blockers
- [ ] Velocity ≥33 points (90% of 37)
- [ ] Sprint 2 ready (June 12)

**If all ✅:** Celebrate + ship Sprint 2  
**If any ❌:** Triage + extend or reduce scope

---

## 📂 KEY DOCUMENTS

| Document | Purpose | Format |
|---|---|---|
| `SPRINT_1_KICKOFF_MESSAGE.md` | Full sprint briefing | Markdown (pin in Slack) |
| `SPRINT_1_VELOCITY_TRACKING.csv` | Daily progress tracking | Google Sheet |
| `PM_DAILY_MONITORING.md` | PM daily checklist | Markdown |
| `SPRINT_1_EXECUTION_READY.md` | Execution confirmation | Markdown |
| `TASK_HANDOFF.md` | Complete task details (22 tasks) | Markdown (68 KB) |
| `README_TASK_HANDOFF.md` | Quick task reference | Markdown (8 KB) |

---

## 🎯 THE CRITICAL PATH

```
RES-002 (ZK Circuit)
   ↓ (by Jun 7)
DEV-004 (ZK Dispatcher)
   ↓ (by Jun 12)
DEV-007 (Proof Verification)
   ↓ (by Jun 12)
M2 Complete (Jun 10)
   ↓ (by Jun 26)
M10 Demo Day Ready
```

**If RES-002 slips:** Entire critical path slips. **ZERO TOLERANCE.**

---

## 🚀 HOW TO UNBLOCK YOURSELF

1. **Blocked on DEV-001?** Ping Backend Engineer on Slack (2-hour response)
2. **Blocked on RES-002?** Ping Researcher on Slack (4-hour response)
3. **Need PM decision?** Slack #noctis-pm-daily (1-hour response)
4. **P0 emergency?** @PM on Slack (30-minute response)

**Don't wait. Don't guess. Escalate early.**

---

## 🎬 TODAY'S ACTION ITEMS (May 27, 2026)

### For Everyone
1. Read this card (2 min)
2. Read `SPRINT_1_KICKOFF_MESSAGE.md` (10 min)
3. Find your task in `TASK_HANDOFF.md` (10 min)
4. Post first standup to #noctis-dev by 10:00 UTC (3 min)

### For Researchers
- **START RES-002 immediately** (ZK circuit design, due Jun 7)

### For Backend Engineer
- **START DEV-001 immediately** (testnet setup, due May 28 EOD — P0!)

### For Smart Contract Engineer
- **START DEV-008 immediately** (contract skeletons, due May 30)

### For PM
1. Pin `SPRINT_1_KICKOFF_MESSAGE.md` to Slack
2. Share Google Sheet (velocity tracking)
3. Schedule Friday 10:00 UTC weekly sync
4. Start daily 10:00 UTC monitoring

---

## 💡 PRO TIPS

- **Testnet down?** Use local Soroland sandbox (documented in DEV-001 exit criteria)
- **Contract won't compile?** Check Soroban v26.0.0 compatibility (not v25, not v27)
- **RES-002 stuck?** Break into subtasks: circuit → merkle → nullifier → setup (don't try all at once)
- **DEV-001 blocked by Friendbot?** Use pre-funded test account or local testnet (fallback ready)
- **Missing dependency?** Escalate to PM within 2 hours (don't work around, don't guess)

---

## 📞 SLACK CHANNELS

- **#noctis-dev:** Daily standups, task updates, quick questions
- **#noctis-pm-daily:** PM logs, escalations, status summaries
- **@PM:** Direct escalations (P0 issues, emergency unblocks)

---

## 🎯 ONE FINAL REMINDER

**RES-002 IS THE CRITICAL PATH.**

If Researcher finishes Jun 7 on time → DEV-004 + DEV-007 unblock → M2 on track → Sprint 2 ready.

If Researcher slips past Jun 7 → entire downstream timeline shifts → Demo day at risk.

**So if you're the Researcher:** This is your sprint to win. Every day counts.

**So if you're a Developer:** Unblock yourself immediately. Don't wait for Researcher. Use soft start (design, pseudocode) until RES-002 is done.

---

## ✅ YOU'RE READY

**All docs are written. All tasks are assigned. All blockers are mapped.**

**Post your standup. Claim your task. Start shipping.**

**Friday syncs every week. Daily async standups in Slack. PM monitoring blockers 24/7.**

---

**SPRINT 1 STARTS NOW.**

**LET'S SHIP TESTNET.** 🚀

