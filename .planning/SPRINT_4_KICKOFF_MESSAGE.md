# 🚀 SPRINT 4 KICKOFF — MAY 30 – JUN 12, 2026

**Today:** Friday, May 29 — Prep Day  
**Sprint 4 starts:** Saturday, May 30  

---

## 📋 STATE OF THE NATION

We enter Sprint 4 in strong shape:

```
✅ All 5 contracts deployed to live testnet (v2 — Groth16, Blend, time-aware yield)
✅ 42/42 unit tests passing across 5 crates
✅ 12/12 E2E tests passing on live testnet
✅ Frontend live on Vercel (vercel.app)
✅ CI/CD pipelines deployed (CI, deploy, circuits-build)
✅ Monitoring stack ready (Prometheus + Grafana)
✅ Bug bounty program spec finalized
✅ SEC-002 audit package refreshed (May 29, v2.0)
✅ SEC-001 internal audit — all High/Medium findings fixed
✅ CRIT-001 resolved — real Groth16 BLS12-381 verification implemented
✅ GOV-001 fee switch proposal drafted
✅ PRODUCTION_DEPLOYMENT_CHECKLIST complete
✅ SEP compliance matrix finalized
```

**Velocity inherited from Sprint 3:** 45 pts (118% of 38-pt target)

---

## 🎯 SPRINT 4 GOALS

### Week 1 (May 30 – Jun 5): AUDIT ENGAGEMENT + PRODUCTION PREP

| Day | Focus | Key Deliverable |
|-----|-------|-----------------|
| Sat May 30 | Sprint 4 Kickoff | Backlog assigned, team aligned |
| Sun May 31 | Audit Package Final Review | Package complete, SOW ready |
| Mon Jun 1 | Send Audit Package to OtterSec/Trail of Bits | Email sent, NDA in progress |
| Tue Jun 2 | E2E Testnet Validation Check | Confirm 12/12 still green |
| Wed Jun 3 | Governance Proposal Draft | Final review of GOV-001 |
| Thu Jun 4 | Production Checklist Sign-off | DEV-014 finalized |
| Fri Jun 5 | Week 1 Review | Velocity check, adjust Week 2 |

### Week 2 (Jun 6 – Jun 12): DOCUMENTATION + REMEDIATION PREP

| Day | Focus | Key Deliverable |
|-----|-------|-----------------|
| Sat Jun 6 | Developer Docs — Architecture | Architecture + data flow docs |
| Sun Jun 7 | Developer Docs — API Reference | Contract API reference |
| Mon Jun 8 | Performance Profiling | Gas benchmarks |
| Tue Jun 9 | Developer Docs — Deployment Guide | Deploy + migrate docs |
| Wed Jun 10 | Passkey-kit SDK Check | Upstream status |
| Thu Jun 11 | Sprint 4 Close Prep | Retro materials |
| Fri Jun 12 | Sprint 4 Close + Demo | Retrospective + demo |

---

## 👥 TEAM ASSIGNMENTS

### PM (You) — 8 pts
| Task | Points | Status |
|------|--------|--------|
| SEC-002: Send audit package to external firm | 5 | 🔵 PACKAGE READY (refreshed v2.0) |
| GOV-001: Fee switch proposal forum post | 3 | 🟡 DRAFTED — needs final review |
| Sprint Master duties | 0 | Ongoing |

### Smart Contract Engineer — 3 pts
| Task | Points | Status |
|------|--------|--------|
| SEC-002a: Audit findings remediation (conditional) | 3 | 🟡 STANDBY — depends on SEC-002 |
| LOW-001: Replace bare .unwrap() with ok_or() | 0 | 🟡 PENDING — low priority |

### DevOps — 10 pts
| Task | Points | Status |
|------|--------|--------|
| DEV-014: Production checklist sign-off | 3 | 🟢 CHECKLIST EXISTING |
| DEV-014a: Mainnet RPC endpoints config | 2 | 🟡 NEEDS ACTION |
| DEV-016: E2E testnet validation | 5 | 🟢 ALREADY GREEN (12/12) |

### Security Engineer — 5 pts
| Task | Points | Status |
|------|--------|--------|
| SEC-002: Audit liaison, triage findings | 5 | 🟡 STANDBY |

### Frontend Engineer — 6 pts
| Task | Points | Status |
|------|--------|--------|
| DEV-017: Passkey-kit SDK compatibility | 3 | 🟡 PENDING — upstream SDK issue |
| DOC-001: Frontend documentation | 3 | 🟡 NEEDS ACTION |

### Web3 Researcher — 3 pts
| Task | Points | Status |
|------|--------|--------|
| DOC-001: Research sections contribution | 3 | 🟡 NEEDS ACTION |

---

## 🔴 RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| External audit firm unavailable (OtterSec/Trail of Bits booked solid) | Medium | High | Identify 3rd choice (Code4rena, Hacken) |
| Audit findings require major contract changes → timeline slips | Low | High | Buffer remediation window in schedule |
| Frontend Vercel URL is temporary (vercel.app) | High | Low | Custom domain not needed until mainnet |
| Passkey-kit SDK v15 still broken | Medium | Medium | Dev fallback (simulated keys) works fine |
| Testnet RPC degraded at launch | Low | High | Health check script + local Soroland fallback |

---

## 📊 SUCCESS CRITERIA (By Jun 12 EOD)

- [ ] **SEC-002**: Audit package delivered to external firm, NDA/SoW signed ✅
- [ ] **DEV-014**: Production deployment checklist signed off ✅
- [ ] **DEV-016**: Full E2E flow validated on live testnet (12/12 green) ✅
- [ ] **GOV-001**: Fee switch proposal live on governance forum ✅
- [ ] **DOC-001**: Developer documentation published (API reference + deployment guide + architecture) ✅
- [ ] **P0 Blockers**: 0 ✅
- [ ] **Velocity**: 28+ pts ✅

---

## 🔗 QUICK LINKS

| Asset | Location |
|-------|----------|
| Sprint 4 Plan | `.planning/SPRINT_4_POLISH_AUDIT_PRODUCTION.md` |
| Audit Package | `packages/audit-sec-002/` (v2.0, refreshed May 29) |
| Production Checklist | `.planning/PRODUCTION_DEPLOYMENT_CHECKLIST.md` |
| Governance Proposal | `.planning/GOV_001_PROTOCOL_FEE_SWITCH.md` |
| Bug Bounty Spec | `security/bug_bounty_program.md` |
| Internal Audit (SEC-001) | `packages/audit-sec-002/docs/SEC-001_INTERNAL_AUDIT_REPORT.md` |
| E2E Tests | `tests/e2e-testnet.ts` |
| Frontend (live) | https://frontend-mbpksm4c5-candras-projects.vercel.app |
| PRD | `.planning/PRD.md` |

---

*Kickoff prepared: May 29, 2026*  
*Let's close this out. Mainnet is next.* 🚀
