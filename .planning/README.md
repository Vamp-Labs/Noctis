# 📚 Noctis Sprint 1 Planning Suite
**Complete Product Management Documentation for Sprint 1 Execution**

---

## 🎯 Overview

This directory contains **9 comprehensive planning documents** (152 KB) for executing **Sprint 1** of the Noctis Hackathon MVP (May 27 — June 10, 2026).

**Key Constraint:** Only ONE research task active at a time (RES-002 is critical path).

---

## 📂 Documents & Purpose

### **🚀 Primary Execution Documents** (Start here)

#### **1. SPRINT_1_KICKOFF_MESSAGE.md** (10 KB) ⭐ PIN IN SLACK
- **Purpose:** Full sprint briefing for all team members
- **Contains:** Task allocation, daily standup schedule, P0 risk protocol, M1–M2 milestones, velocity targets
- **Audience:** All 5 engineers
- **Action:** Read within 10 min of sprint start; post first standup by 10:00 UTC
- **When to Reference:** Every day (part of daily standup protocol)

#### **2. QUICK_REFERENCE_CARD.md** (7.7 KB) 📋 PRINT & SHARE
- **Purpose:** One-page quick reference card for the team
- **Contains:** Sprint at a glance, active tasks, P0 risks, milestones, daily actions
- **Audience:** All engineers (print-friendly)
- **Action:** Distribute physically or via Slack; keep at desk during sprint
- **When to Reference:** Multiple times daily as quick lookup

#### **3. SPRINT_1_VELOCITY_TRACKING.csv** (3.4 KB) 📊 GOOGLE SHEETS
- **Purpose:** Daily velocity tracking spreadsheet
- **Contains:** Task status, % complete (Day 1 → Day 10), blockers, dependencies
- **Audience:** PM (primary), all engineers (read-only view)
- **Action:** Import to Google Sheets; share link with team; update daily
- **When to Reference:** Every day at 10:00 UTC (PM updates after standups)

#### **4. PM_DAILY_MONITORING.md** (5.9 KB) ✅ PM CHECKLIST
- **Purpose:** PM daily task checklist and monitoring protocol
- **Contains:** Daily standup review, P0 blocker checks, metrics snapshot, escalation triggers
- **Audience:** PM only
- **Action:** Use as daily checklist (5 min per day, 10:00 UTC)
- **When to Reference:** Every morning before standup review

---

### **📋 Secondary Reference Documents**

#### **5. SPRINT_1_EXECUTION_READY.md** (9.7 KB) 🎬 REFERENCE
- **Purpose:** Comprehensive execution confirmation document
- **Contains:** Full sprint plan, team allocation, critical path, immediate actions, success definition
- **Audience:** PM, team leads, stakeholders
- **Action:** Review before sprint kickoff; reference if questions arise
- **When to Reference:** Sprint planning, stakeholder updates, post-sprint retrospective

#### **6. SPRINT_1_SUMMARY.md** (5.2 KB) 📄 THIS SPRINT
- **Purpose:** High-level summary of Sprint 1 (condensed version of execution plan)
- **Contains:** Sprint at a glance, execution plan, critical path, milestones
- **Audience:** Stakeholders, investors, DAO governance
- **Action:** Use for external communication (roadmap updates, investor reports)
- **When to Reference:** External presentations, weekly investor updates

---

### **🔧 Developer & Task Documents**

#### **7. TASK_HANDOFF.md** (66 KB) 🎯 PRIMARY SOURCE OF TRUTH
- **Purpose:** Complete decomposition of all 22 tasks (RES-001–009, DEV-001–013)
- **Contains:** Task descriptions, acceptance criteria, implementation guides, sprint mapping, dependencies
- **Audience:** All engineers (primary work reference)
- **Action:** Each engineer reads their task section (15 min); reference during implementation
- **When to Reference:** Daily during task implementation; before standup; for acceptance criteria verification

#### **8. README_TASK_HANDOFF.md** (8.7 KB) 🚀 QUICK START
- **Purpose:** Quick start guide and task reference summary
- **Contains:** Critical path summary, demo day script, task overview, sprint mapping
- **Audience:** New team members, stakeholders, onboarding
- **Action:** Read for onboarding; reference for task quick-lookup
- **When to Reference:** Onboarding new members; quick task reference

---

### **📖 Source Documents**

#### **9. PRD.md** (23 KB) 📝 REQUIREMENTS
- **Purpose:** Original Product Requirements Document for Noctis v1.0
- **Contains:** Problem statement, features, technical architecture, tokenomics, market analysis
- **Audience:** Reference document (context for all tasks)
- **Action:** Review for feature context; reference for design decisions
- **When to Reference:** Design decisions, technical questions, competitive positioning

---

## 📊 Document Relationship Map

```
┌─────────────────────────────────────────────────────────────────┐
│              SPRINT 1 EXECUTION (May 27 — Jun 10)              │
└─────────────────────────────────────────────────────────────────┘

TEAM KICKOFF:
  ├─ Read: SPRINT_1_KICKOFF_MESSAGE.md (all team)
  ├─ Read: QUICK_REFERENCE_CARD.md (print & share)
  ├─ Read: TASK_HANDOFF.md (each engineer, your task)
  └─ Action: Post first standup to Slack #noctis-dev

DAILY EXECUTION:
  ├─ PM: Use PM_DAILY_MONITORING.md (10 min, 10:00 UTC)
  ├─ Engineers: Reference TASK_HANDOFF.md (implementation)
  ├─ All: Track progress in SPRINT_1_VELOCITY_TRACKING.csv (Google Sheet)
  └─ All: Use QUICK_REFERENCE_CARD.md for quick lookup

WEEKLY SYNC (Friday, 10:00 UTC):
  ├─ Reference: SPRINT_1_EXECUTION_READY.md (milestones, risks)
  ├─ Update: SPRINT_1_VELOCITY_TRACKING.csv (weekly velocity)
  └─ Discuss: P0 blockers from PM_DAILY_MONITORING.md

EXTERNAL COMMUNICATION:
  ├─ Investors: Use SPRINT_1_SUMMARY.md
  ├─ DAO: Use SPRINT_1_SUMMARY.md + PRD.md
  └─ Stakeholders: Use SPRINT_1_EXECUTION_READY.md

RETROSPECTIVE (Jun 10):
  ├─ Review: SPRINT_1_VELOCITY_TRACKING.csv (final count)
  ├─ Assess: SPRINT_1_EXECUTION_READY.md (success checklist)
  ├─ Plan: TASK_HANDOFF.md (Sprint 2 kickoff)
  └─ Document: Lessons learned
```

---

## 🎯 Key Documents by Role

### **PM**
1. **Daily (10:00 UTC):** PM_DAILY_MONITORING.md
2. **Weekly (Fri):** SPRINT_1_EXECUTION_READY.md + velocity sheet
3. **Reference:** SPRINT_1_KICKOFF_MESSAGE.md (respond to blockers)
4. **External:** SPRINT_1_SUMMARY.md (investor updates)

### **Researchers**
1. **Sprint Start:** SPRINT_1_KICKOFF_MESSAGE.md + TASK_HANDOFF.md (RES section)
2. **Daily:** QUICK_REFERENCE_CARD.md (quick lookup) + TASK_HANDOFF.md (implementation)
3. **Blockers:** SPRINT_1_EXECUTION_READY.md (P0 protocol)
4. **Context:** PRD.md (feature requirements)

### **Smart Contract Engineer**
1. **Sprint Start:** SPRINT_1_KICKOFF_MESSAGE.md + TASK_HANDOFF.md (DEV section)
2. **Daily:** QUICK_REFERENCE_CARD.md + TASK_HANDOFF.md (DEV-008, DEV-002, DEV-003 details)
3. **Blockers:** SPRINT_1_EXECUTION_READY.md (P0 protocol)
4. **Context:** PRD.md (contract design)

### **Backend Engineer**
1. **Sprint Start:** SPRINT_1_KICKOFF_MESSAGE.md + TASK_HANDOFF.md (DEV-001)
2. **Daily:** QUICK_REFERENCE_CARD.md + TASK_HANDOFF.md (DEV-001 details)
3. **Blockers:** SPRINT_1_EXECUTION_READY.md (P0 protocol)
4. **Context:** PRD.md (testnet requirements)

### **Frontend Engineer** (optional for Sprint 1)
1. **Standby:** SPRINT_1_EXECUTION_READY.md (Sprint 2 preview)
2. **Ready for Sprint 2:** TASK_HANDOFF.md (DEV-009, DEV-010, DEV-011 sections)

---

## 📅 Sprint Timeline

| Phase | Documents | Action |
|---|---|---|
| **Sprint Kickoff (May 27)** | KICKOFF, QUICK_REF, TASK_HANDOFF | All: Read + standup + start work |
| **Daily Execution (May 27–Jun 10)** | QUICK_REF, TASK_HANDOFF, VELOCITY | Engineers: Work; PM: monitor |
| **Weekly Sync (Fri 10:00 UTC)** | EXECUTION_READY, VELOCITY | Review progress, blockers |
| **Sprint End (Jun 10)** | VELOCITY, EXECUTION_READY, SUMMARY | Count velocity, success checklist |
| **Sprint Retrospective (Jun 10)** | EXECUTION_READY, VELOCITY, SUMMARY | Lessons learned, Sprint 2 prep |
| **External (Weekly)** | SPRINT_1_SUMMARY.md | Investor updates, roadmap |

---

## 🚨 Critical Path Documents

**If you only read ONE thing, read:**
- **PM:** PM_DAILY_MONITORING.md (daily protocol)
- **Researchers:** TASK_HANDOFF.md + QUICK_REFERENCE_CARD.md
- **Engineers:** TASK_HANDOFF.md + SPRINT_1_KICKOFF_MESSAGE.md
- **Stakeholders:** SPRINT_1_SUMMARY.md + PRD.md

**If you need emergency info:**
- **P0 Blocker?** → SPRINT_1_EXECUTION_READY.md (P0 Risk Protocol section)
- **Task stuck?** → TASK_HANDOFF.md (task details) + QUICK_REFERENCE_CARD.md (escalation)
- **Metrics?** → SPRINT_1_VELOCITY_TRACKING.csv (Google Sheet)

---

## ✅ Usage Checklist

### **Before Sprint (May 27, 10:00 UTC)**
- [ ] PM: Pin SPRINT_1_KICKOFF_MESSAGE.md to Slack #noctis-dev
- [ ] PM: Create Google Sheet from SPRINT_1_VELOCITY_TRACKING.csv
- [ ] PM: Send calendar invite for Friday syncs
- [ ] All engineers: Read SPRINT_1_KICKOFF_MESSAGE.md (10 min)
- [ ] All engineers: Read your task in TASK_HANDOFF.md (15 min)
- [ ] All engineers: Post first standup by 10:00 UTC

### **During Sprint (Daily)**
- [ ] All engineers: Post daily standup (3 min, 10:00 UTC)
- [ ] PM: Review standups + respond to blockers (2-hour SLA)
- [ ] PM: Update velocity tracking sheet (2 min)
- [ ] All engineers: Reference QUICK_REFERENCE_CARD.md as needed
- [ ] All engineers: Reference TASK_HANDOFF.md for implementation details

### **Weekly (Friday, 10:00 UTC)**
- [ ] PM: Prepare weekly sync agenda
- [ ] All: Review SPRINT_1_EXECUTION_READY.md (milestones, risks)
- [ ] All: Discuss blockers + velocity progress
- [ ] PM: Log weekly summary to #noctis-pm-daily

### **Sprint End (Jun 10)**
- [ ] PM: Final velocity count from SPRINT_1_VELOCITY_TRACKING.csv
- [ ] PM: Success checklist from SPRINT_1_EXECUTION_READY.md
- [ ] All: Retrospective (what went well, what broke, action items)
- [ ] PM: Prepare SPRINT_1_SUMMARY.md for stakeholders

---

## 📞 Document Support

**Questions about:**
- **Sprint planning:** Read SPRINT_1_EXECUTION_READY.md
- **Your specific task:** Read TASK_HANDOFF.md (your task section)
- **Daily standups:** Read PM_DAILY_MONITORING.md + QUICK_REFERENCE_CARD.md
- **Blockers/escalation:** Read SPRINT_1_EXECUTION_READY.md (P0 protocol section)
- **Velocity tracking:** Read SPRINT_1_VELOCITY_TRACKING.csv (Google Sheet)
- **External communication:** Read SPRINT_1_SUMMARY.md + PRD.md

**Questions about execution?** → Slack #noctis-dev (daily) or #noctis-pm-daily (escalations)

---

## 🎯 Success Criteria

**Sprint 1 succeeds if:**
- [ ] All 5 engineers complete sprint start (read KICKOFF + TASK_HANDOFF)
- [ ] RES-002 delivered by Jun 7 (ZK circuit spec)
- [ ] DEV-001 live by May 28 (testnet RPC)
- [ ] M1 milestones 100% complete by Jun 10
- [ ] M2 milestones 80%+ complete by Jun 10
- [ ] Velocity ≥33 points (90% of 37 target)
- [ ] Zero P0 blockers at sprint end

---

## 📄 File Manifest

```
.planning/
├── README.md (this file)
├── PRD.md (23 KB) — Product Requirements Document
├── SPRINT_1_KICKOFF_MESSAGE.md (10 KB) ⭐ PIN IN SLACK
├── QUICK_REFERENCE_CARD.md (7.7 KB) 📋 PRINT & SHARE
├── SPRINT_1_VELOCITY_TRACKING.csv (3.4 KB) 📊 GOOGLE SHEETS
├── PM_DAILY_MONITORING.md (5.9 KB) ✅ PM CHECKLIST
├── SPRINT_1_EXECUTION_READY.md (9.7 KB) 🎬 REFERENCE
├── SPRINT_1_SUMMARY.md (5.2 KB) 📄 EXTERNAL
├── TASK_HANDOFF.md (66 KB) 🎯 PRIMARY TRUTH
└── README_TASK_HANDOFF.md (8.7 KB) 🚀 QUICK START

Total: 9 documents, 152 KB
```

---

## 🚀 GET STARTED

1. **PM:** Pin SPRINT_1_KICKOFF_MESSAGE.md to Slack
2. **All engineers:** Read SPRINT_1_KICKOFF_MESSAGE.md (10 min)
3. **All engineers:** Find your task in TASK_HANDOFF.md (15 min)
4. **All engineers:** Post first standup to #noctis-dev by 10:00 UTC
5. **All:** Start work immediately

**Sprint 1 kicks off: May 27, 2026, 10:00 UTC**

---

**Questions?** Slack #noctis-dev or DM @PM  
**Blocked?** Use P0 protocol in SPRINT_1_EXECUTION_READY.md

**LET'S SHIP TESTNET! 🚀**
