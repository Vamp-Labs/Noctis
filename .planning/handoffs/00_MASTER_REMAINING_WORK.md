# REMAINING WORK REGISTER — Master Agent Handoff

**Generated:** May 28, 2026  
**Source:** PM Gap Analysis (`.planning/PM_GAP_ANALYSIS_MAY28.md`)  
**Status:** 🚀 READY FOR SPRINT 3 EXECUTION  

---

## Work by Agent

| Agent | Total Tasks | P0 | P1 | P2 | Est. Effort |
|-------|------------|----|----|----|-------------|
| **Smart Contract Engineer** | 6 | 2 | 2 | 2 | 4-5 weeks |
| **Frontend Engineer** | 12 | 4 | 4 | 4 | 3-4 weeks |
| **Backend Engineer** | 3 | 0 | 2 | 1 | 4-5 weeks |
| **Web3 Researcher** | 5 | 1 | 2 | 2 | 2-3 weeks |
| **Security Engineer** | 3 | 1 | 1 | 1 | 2-3 weeks |
| **DevOps Engineer** | 3 | 0 | 2 | 1 | 1-2 weeks |
| **TOTAL** | **32** | **8** | **13** | **11** | **~16-22 weeks** |

---

## Priority Legend

- **P0** — Must fix before mainnet launch. Security or functional correctness.
- **P1** — Should do for production credibility. Completes PRD feature parity.
- **P2** — Nice to have. Phase 2 or deferred.

---

## Quick Reference: Stub vs Missing

| Type | Count | Description |
|------|-------|-------------|
| **🔴 Stubs** | 8 | Partially implemented, needs real logic |
| **❌ Missing** | 14 | Not started at all |
| **🔧 Quick Fixes** | 4 | < 2 hours each |
| **Total** | **26** | |

---

## Agent Handoff Documents

| Handoff | File | 
|---------|------|
| Smart Contract Engineer | `01_SMART_CONTRACT_ENGINEER.md` |
| Frontend Engineer | `02_FRONTEND_ENGINEER.md` |
| Backend Engineer | `03_BACKEND_ENGINEER.md` |
| Web3 Researcher | `04_WEB3_RESEARCHER.md` |
| Security Engineer | `05_SECURITY_ENGINEER.md` |
| DevOps Engineer | `06_DEVOPS_ENGINEER.md` |

---

## Dependencies Between Agents

```
DevOps                    Frontend
  ├─ Circuit build ─────────┤
  └─ CI/CD pipeline          ├─ zk.ts → circuit artifacts
                             ├─ Policy creation UI
Web3 Researcher              ├─ Network guard
  ├─ BLS12-381 API ──────┐   ├─ Passkey kit wiring
  ├─ Blend/Soroswap ─────┤   ├─ Yield write methods
  ├─ x402/MPP research ──┤   └─ APY display
  └─ SEP compliance       │
                          │   Smart Contract Engineer
Security Engineer           ├─ CRITICAL-001: Groth16 ───┐
  ├─ SEC-002 external audit ├─ Yield deposit_to_source  │
  └─ SEC-003 bug bounty     ├─ Yield calculate_accrued  │
                             ├─ Employee bonus pool     │
Backend Engineer             └─ Blend cross-contract ───┤
  ├─ x402 integration ──────┘                          │
  ├─ Launchtube relay                                  │
  └─ Mercury indexer                                    │
                                                        │
                                                    All → Mainnet Launch
```

---

## File Locations Reference

| Artifact | Path |
|----------|------|
| Contracts | `crates/*/src/lib.rs` |
| Frontend | `frontend/src/` |
| E2E Tests | `tests/e2e-testnet.ts` |
| Circuits | `circuits/payroll_circuit.circom` |
| Planning | `.planning/handoffs/*.md` |

---

## Sprint Priority Recommendations

### Sprint 3 (Jun 26 – Jul 9) — Focus: Production Readiness
- **P0**: Network guard, `_elapsed` fix, `hashPair()` removal
- **P1**: Employer page wiring to zk.ts, Poseidon→SHA-256 fix, yield write methods
- **P2**: Policy creation UI, APY display, `collect_employee_bonus()` docs

### Sprint 4 (Jul 10 – Jul 24) — Focus: Real Integration
- **P0**: CRITICAL-001 Groth16 implementation
- **P1**: Blend/Soroswap cross-contract, x402/MPP
- **P2**: Launchtube, Mercury indexer, notifications

### Post-Sprint 4 (Jul 25+) — Focus: Mainnet Launch
- External audit completion
- Bug bounty program
- Production deployment
