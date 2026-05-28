# 🚀 SPRINT 4 — POLISH, AUDIT, PRODUCTION PREP (MAY 30 – JUN 12)

**Kickoff:** Saturday, May 30, 2026  
**Duration:** 2 weeks (May 30 – Jun 12)  
**Phase:** Pre-Production Finalization  
**Inherited Velocity (Sprint 3):** 45 pts (118% of 38-pt target)

---

## 📋 INHERITED STATE

```diff
+ 30/32 agent handoff tasks completed
+ 42/42 unit tests passing
+ Frontend building successfully (API routes enabled)
+ Real Groth16 verification implemented
+ Blend cross-contract yield integration done
+ CI/CD pipelines deployed
+ Monitoring stack documented
+ Bug bounty program spec created
+ SEP compliance matrix finalized
```

**Remaining Gaps:**
```
SEC-002: External audit engagement        → P0 (blocks mainnet)
GOV-001: Protocol fee governance proposal → P1
DOC-001: Developer documentation          → P1
DEV-014: Production deployment checklist  → P1
DEV-015: Performance optimization         → P2
Passkey-kit SDK v15 compatibility         → P2 (upstream)
Stablecoin auto-swap (Soroswap Aggregator)→ Phase 2
```

---

## 🎯 SPRINT 4 OBJECTIVES

### Must Have (P0)
| Task | Description | Owner | Points | Dependencies |
|------|------------|-------|--------|-------------|
| **SEC-002** | External audit engagement: send audit package to OtterSec/Trail of Bits | PM + Security Eng | 5 | N/A — package already assembled |
| **SEC-002a** | Audit findings remediation (if any) | Smart Contract Eng | 3 | SEC-002 findings returned |
| **DEV-014** | Production deployment checklist sign-off | DevOps | 3 | N/A |

### Should Have (P1)
| Task | Description | Owner | Points |
|------|------------|-------|--------|
| **GOV-001** | Protocol fee switch governance proposal (forum post + Snapshot) | PM | 3 |
| **DOC-001** | Developer documentation — contract API, deployment guide, architecture | All | 5 |
| **DEV-014a** | Mainnet RPC endpoints configured, testnet→mainnet migration plan | DevOps | 2 |
| **DEV-016** | E2E testnet validation: full demo flow on live testnet | DevOps + Frontend | 5 |

### Nice to Have (P2)
| Task | Description | Owner | Points |
|------|------------|-------|--------|
| **DEV-015** | Performance optimization: contract gas profiling, frontend bundle size | Smart Eng + Frontend | 5 |
| **DEV-017** | Passkey-kit SDK v15 compatibility patch or upstream fix | Frontend Eng | 3 |
| **DOC-002** | Demo Day playbook refresh with updated contracts | PM | 2 |

**Sprint 4 Velocity Target:** 28+ pts

---

## 📅 SPRINT 4 ROADMAP

```
WEEK 1 (May 30 – Jun 5): AUDIT + PRODUCTION PREP
┌─────────────────────────────────────────────────────────────┐
│ Sat May 30   Sun May 31    Mon Jun 1     Tue Jun 2          │
│ Sprint 4     Audit         Send audit    E2E testnet         │
│ Kickoff      Package       package to    validation          │
│              Final Review  OtterSec      run                 │
│                                                            │
│ Wed Jun 3    Thu Jun 4     Fri Jun 5                        │
│ Governance   Production    Week 1                            │
│ Proposal     Checklist     Review                            │
│ Draft        Sign-off                                       │
└─────────────────────────────────────────────────────────────┘

WEEK 2 (Jun 6 – Jun 12): REMEDIATION + DOCS
┌─────────────────────────────────────────────────────────────┐
│ Sat Jun 6    Sun Jun 7    Mon Jun 8    Tue Jun 9             │
│ Bug bounty   Dev docs     Performance   Dev docs              │
│ program      kickoff      profiling     continue               │
│ live                                                         │
│                                                              │
│ Wed Jun 10   Thu Jun 11   Fri Jun 12                         │
│ passkey-kit  Sprint 4     Sprint 4                            │
│ fix          Close        Retrospective                       │
└─────────────────────────────────────────────────────────────┩
```

---

## 👥 TEAM ALLOCATION

| Agent | Tasks | Points | Focus |
|-------|-------|--------|-------|
| **PM (You)** | GOV-001, SEC-002 lead, Sprint Master | 8 | Governance, audit engagement, coordination |
| **Smart Contract Eng** | SEC-002a remediation (conditional) | 3 | Standby for audit findings |
| **Frontend Eng** | DEV-017 passkey-kit fix, DOC-001 | 6 | SDK compat, documentation |
| **DevOps** | DEV-014 checklist, DEV-014a migration, DEV-016 testnet validation | 10 | Production readiness |
| **Security Eng** | SEC-002 audit liaison | 5 | Audit engagement, triage findings |
| **Web3 Researcher** | DOC-001 research sections, SEC-002 support | 3 | Documentation support |

---

## 🎯 MILESTONES

| Milestone | Target | Exit Criteria |
|-----------|--------|---------------|
| **M11: Audit Engaged** | Jun 2 | Audit package sent to OtterSec/Trail of Bits, SOW signed |
| **M12: E2E Validated** | Jun 2 | Full demo flow runs on live testnet, all 12 phases pass |
| **M13: Production Ready** | Jun 5 | Deployment checklist signed off, mainnet config documented |
| **M14: Governance Live** | Jun 5 | Fee proposal posted to forum, Snapshot vote created |
| **M15: Documentation Published** | Jun 12 | Developer docs committed, API reference updated |

---

## 📋 SPRINT 4 SUCCESS CRITERIA

### By Jun 12 EOD
- [ ] **SEC-002**: External audit package delivered, firm engaged ✅
- [ ] **DEV-014**: Production deployment checklist signed off ✅
- [ ] **DEV-016**: Full E2E flow validated on live testnet ✅
- [ ] **GOV-001**: Fee switch proposal live on governance forum ✅
- [ ] **DOC-001**: Developer documentation published ✅
- [ ] **P0 Blockers**: 0 ✅
- [ ] **Velocity**: 28+ pts ✅

---

## 🔗 KEY LINKS

| Asset | Location |
|-------|----------|
| PRD | `PRD.md` |
| PRD Sync | `.planning/PRD_SYNC_MAY29.md` |
| Audit Package | `packages/audit-sec-002/` |
| Production Checklist | `.planning/PRODUCTION_DEPLOYMENT_CHECKLIST.md` |
| Governance Proposal | `.planning/GOV_001_PROTOCOL_FEE_SWITCH.md` |
| Bug Bounty Spec | `security/bug_bounty_program.md` |
| Sprint 3 Close | `.planning/SPRINT_3_DAILY_MONITORING_LOG.md` |
| Handoff Docs | `.planning/handoffs/` |
| Reference Docs | `refs/` |

---

*Sprint 4 Planning Document*  
*Date: May 29, 2026*  
*Status: ✅ READY TO EXECUTE*
