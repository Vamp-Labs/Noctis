# PM DAILY MONITORING CHECKLIST — Sprint 1
## (May 27 — June 10, 2026)

---

## 🟢 ACTIVE TASKS (Monitor Daily)

### Daily Standup Review (10:00 UTC)
- [ ] RES-002 standup posted (Slack #noctis-dev)
- [ ] DEV-001 standup posted
- [ ] DEV-008 standup posted
- [ ] Blockers identified? → Respond within 2 hours
- [ ] Escalation needed? → Yes/No

### P0 Blocker Check
- [ ] **DEV-001 (Testnet Setup):**
  - [ ] Testnet RPC latency <2s (check at 08:00, 12:00, 16:00 UTC)
  - [ ] Friendbot funding working (test with dummy account)
  - [ ] Soroban CLI v26.0.0 `soroban --version` output verified
  - [ ] `.env.testnet` / `.env.mainnet` split in place (network guard)
  - [ ] Local Soroland sandbox fallback documented + tested
  - [ ] Status: 🟢 ON TRACK | 🟡 MINOR ISSUE | 🔴 BLOCKED
  - [ ] If 🔴: Escalate immediately (Backend + DevOps emergency call)

- [ ] **RES-002 (ZK Circuit):**
  - [ ] Progress visible in standup (% complete: __%)
  - [ ] No "stuck for >4 hours" situations reported
  - [ ] On track for Day 7 (Friday, June 7) deadline
  - [ ] Status: 🟢 ON TRACK | 🟡 MINOR ISSUE | 🔴 BLOCKED
  - [ ] If 🔴: Emergency call with Researcher + Smart Contract Eng

- [ ] **DEV-008 (Contract Skeleton):**
  - [ ] All 5 contracts compiling without errors
  - [ ] GitHub Actions CI pipeline passing
  - [ ] Status: 🟢 ON TRACK | 🟡 BUILD WARNING | 🔴 COMPILE ERROR
  - [ ] If 🔴: Code review + fix same day

### Risk Assessment
- [ ] Any dependency issues between ACTIVE tasks?
- [ ] Any external service outages (Stellar, GitHub, npm registry)?
- [ ] Any team member blockers (tooling, access, onboarding)?

---

## 📊 METRICS SNAPSHOT (Track Every 3 Days)

| Metric | Target | Day 1 | Day 4 | Day 7 | Day 10 | Notes |
|---|---|---|---|---|---|---|
| RES-002 Completion | 100% by Jun 7 | __% | __% | 100% | ✅ | ZK circuit spec |
| DEV-001 Completion | 100% by May 28 | __% | 100% | ✅ | ✅ | Testnet ready |
| DEV-008 Completion | 100% by May 30 | __% | 100% | ✅ | ✅ | Contracts compiling |
| DEV-002 Progress | 80% by Jun 8 | 0% | 10% | 30% | 80% | Soft → hard start |
| DEV-003 Progress | 70% by Jun 8 | 0% | 5% | 25% | 70% | Soft → hard start |
| Standup Compliance | 100% (5 per sprint) | __% | __% | __% | __% | Team async posts |
| Velocity (vs. 37 pt target) | 37+ | | | | **37+** | Final count Jun 10 |

---

## 🎯 WEEKLY SYNC PREP (Friday, 10:00 UTC)

### Friday May 31 (Week 1 Sync)
- [ ] RES-002 progress update (on track for Day 7?)
- [ ] DEV-001 + DEV-008 completion status
- [ ] Velocity so far: ____ / 13 points
- [ ] Any blockers to discuss?
- [ ] Sprint 2 readiness (DEV-004, DEV-005, DEV-006)

### Friday June 7 (Week 2 Sync — CRITICAL)
- [ ] RES-002 DELIVERED? (Yes/No)
  - [ ] If YES: Celebrate + handoff to DEV-004 (Smart Contract Eng)
  - [ ] If NO: Emergency triage + extend to June 12 (2-day buffer)
- [ ] M1 milestones 100% complete?
- [ ] M2 milestones 80%+ complete?
- [ ] Final velocity check: ____ / 37 points
- [ ] Sprint 1 retrospective (what went well, what broke, action items for Sprint 2)

---

## 📞 ESCALATION TRIGGERS (Immediate PM Action)

| Situation | Escalation | Action |
|---|---|---|
| **DEV-001 blocked past Day 2 EOD** | Backend + DevOps | Emergency 1:1 call (resolve in 2h or pivot to local) |
| **RES-002 no draft by Day 5 (Wed, Jun 4)** | Researcher + Smart Eng | Break into subtasks; add researcher support; extend if needed |
| **Testnet RPC down >2 hours** | DevOps + Stellar team | Switch to local sandbox; document workaround; status page update |
| **GitHub Actions CI failing for DEV-008** | Smart Contract Eng | Code review; fix same day or delay DEV-002/003 soft start |
| **Team member unavailable >48h** | PM + Team lead | Redistribute tasks; communicate delay impact |
| **RES-002 handoff incomplete by Day 8** | Researcher + Smart Eng | Delay DEV-004 start; adjust Sprint 2 schedule |

---

## 📋 DAILY PM TASKS (5 min each, 10:00 UTC)

**Monday–Friday (May 27–31 & June 2–10):**
1. ✅ Read Slack #noctis-dev standups (3 min)
2. ✅ Respond to blockers (2 min, async)
3. ✅ Update velocity spreadsheet (2 min)
4. ✅ Spot-check P0 metrics (3 min)
5. ✅ Log daily summary (1 min) → Slack thread

**Friday (May 31, June 7):**
1. ✅ All of the above
2. ✅ Prepare weekly sync agenda (5 min)
3. ✅ Review metrics snapshot (5 min)
4. ✅ Risk assessment (5 min)

---

## 📝 DAILY LOG TEMPLATE (Post to Slack #noctis-pm-daily)

```
📅 **[DATE] — SPRINT 1 DAILY LOG**

🟢 **Active:**
- RES-002: [% complete] — [1-line status]
- DEV-001: [% complete] — [1-line status]
- DEV-008: [% complete] — [1-line status]

🟡 **Queued (waiting on above):**
- DEV-002: ready to start [YES/NO]
- DEV-003: ready to start [YES/NO]

🚨 **Blockers:**
- [List any, or "None"]

📊 **Velocity:**
- ACTIVE complete: __ / 13 points
- QUEUED progress: __ / 25 points
- Target: 37 points by Jun 10

✅ **Action Items (for tomorrow):**
1. [...]
2. [...]
```

---

## 🎬 SPRINT 1 SUCCESS CHECKLIST (June 10 EOD)

- [ ] ✅ RES-002 delivered (Day 7 deadline MET)
- [ ] ✅ DEV-001 live (Day 2 deadline MET)
- [ ] ✅ DEV-008 compiling (Day 4 deadline MET)
- [ ] ✅ M1 milestones 100% complete
- [ ] ✅ M2 milestones 80%+ complete
- [ ] ✅ Zero P0 blockers
- [ ] ✅ Velocity ≥33 points (90% of 37)
- [ ] ✅ Sprint 2 kickoff ready (Monday, June 12)

**If all ✅:** Team celebration + Sprint 2 kickoff immediately  
**If any ❌:** Triage + extend Sprint 1 to June 12 or reduce Sprint 2 scope

---

## 📞 EMERGENCY CONTACTS
- **Web3 Researcher:** [Slack DM]
- **Smart Contract Engineer:** [Slack DM]
- **Backend Engineer / DevOps:** [Slack DM]
- **PM (me):** Available 08:00–20:00 UTC (async review 10:00–10:30 UTC)

**During crisis (P0 blocker):**
- Immediate Slack escalation + 30-min emergency call
- Decision: Fix immediately | Pivot to backup plan | Extend deadline

---

**This is a living document. Update daily. Review every Friday sync.**
