# SECURITY ENGINEER — Remaining Work Handoff

**3 Tasks | Est. 2-3 weeks | Priority: P0–P2**

---

## TASK 1: 🔴 SEC-002 — External Audit Engagement
**Priority:** 🔴 P0 | **Effort:** 2-3 weeks (procurement + remediation) | **Status:** ❌ NOT STARTED

### Current State
No external audit has been performed. LOW-001 (unwrap replacement) and the CRITICAL-001 (configure fix) were internal patches. No third-party review has been conducted.

### Requirements
1. **Audit firm selection** — Engage one of:
   - **Trail of Bits** (preferred for Stellar/Soroban experience)
   - **OtterSec** (strong ZK/Web3 background)
   - **OpenZeppelin** (Solana + Stellar experience)
   - **Neodyme** (Solana ecosystem, might not cover Soroban)

2. **Audit scope preparation** — Package for the auditors:
   - All 5 contract source files
   - `Cargo.toml` and dependency locks
   - Test suite (unit + E2E)
   - `.env.testnet` and deployment scripts
   - PM gap analysis for known issues
   - Architecture/design documents

3. **Timeline management** (from the Product Manager audit schedule):
   ```
   T-0:   Feature freeze (contracts locked)
   T+1w:  Audit package delivered to firm
   T+3w:  Initial findings received
   T+4w:  Remediation sprint
   T+5w:  Final report + sign-off
   ```

4. **Remediation coordination**
   - Track findings in Linear/Trello
   - Assign P0/P1 findings to Smart Contract Engineer
   - Verify fix diff and re-test
   - Escalate disputed findings to Product Manager

### Deliverable
- Audit onboarding package (`security/audit_package_v1.zip` or tarball)
- Findings tracker spreadsheet
- Remediation status updates (weekly)
- Final audit report acceptance memo

### Acceptance Criteria
- [ ] Audit firm engaged with signed SOW
- [ ] Complete audit package delivered on time
- [ ] All P0 findings remediated before mainnet
- [ ] Final report received and filed

---

## TASK 2: 🟡 SEC-003 — Bug Bounty Program Setup
**Priority:** 🟡 P1 | **Effort:** 1 week | **Status:** ❌ NOT STARTED

### Current State
No bug bounty program exists. No immunefi/HatsFinance/Code4rena presence.

### Requirements
1. **Platform selection** (recommend one):
   - Immunefi (industry standard, Stellar ecosystem projects listed)
   - Hats Finance (growing, lower fees)
   - Code4rena (contest-based, longer cadence)
   - Sherlock (contest-based, strong reviewer pool)

2. **Program parameters**:
   - Asset range: $5K–$50K (based on TVL at launch)
   - Severity classification: Critical/High/Medium/Low
   - Scope: All 5 contracts + frontend (zk.ts specifically)
   - Exclusions: Already-known issues (document from gap analysis)
   - Payout timing: On verification + deployment fix

3. **Public disclosure**:
   - Add SECURITY.md to repo root (template provided)
   - Add security.txt to main website
   - Create Twitter/Forum announcement draft

4. **Vulnerability handling SOP**:
   - Triage process (receive → verify → classify → fix → reward)
   - Disclosure timeline (90-day embargo)
   - Emergency fix procedures

### Deliverable
- Bug bounty program spec document (`security/bug_bounty_program.md`)
- Published `SECURITY.md` in repo root
- Platform submission draft

### Acceptance Criteria
- [ ] Bug bounty program live on at least one platform
- [ ] SECURITY.md committed to repo
- [ ] Triage process documented and shared with team
- [ ] Budget allocated by Product Manager/Treasury

---

## TASK 3: 🟢 SEC-004 — Post-Stub-Replacement Re-Audit
**Priority:** 🟢 P2 | **Effort:** 1-2 days | **Status:** ⏳ WAITING

### Current State
The SEC-001 (initial audit) identified:
- CRITICAL-001: Stub ZK verification — recommended for mainnet blocking
- INFO-001: Simulated yield — acceptable for MVP

Both issues still exist as stubs. Once the Smart Contract Engineer implements real Groth16 verification (T1) and real yield logic (T2/T3), these need to be re-audited.

### Requirements
1. **Diff review** of all changes made to:
   - `crates/payroll_dispatcher/src/lib.rs` (CRITICAL-001 fix)
   - `crates/yield_router/src/lib.rs` (INFO-001 fix)
   - Any other files modified during stub replacement

2. **Regression testing**
   - Re-run all 42 unit tests
   - Re-run all 12 E2E tests
   - Verify no new unwrap patterns introduced

3. **Stage gate sign-off**:
   - Before: Stub → Simulated → Acceptable for MVP
   - After: Real → Audited → Secure for mainnet
   - Register formal sign-off in Linear

### Deliverable
- Post-remediation audit brief (`security/post_remediation_review.md`)
- Sign-off checklist in Linear
- Updated security report

### Acceptance Criteria
- [ ] All stub-replacement diffs reviewed
- [ ] No new vulnerabilities introduced by stub replacement
- [ ] Sign-off documented for mainnet deployment

---

## Priority & Sequence

```
WEEK 1-2                     WEEK 3-4                    WEEK 5+
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ T1: External audit   │   │ T1 cont: Remediation │   │ T3: Post-remediation │
│     firm engagement  │   │     sprint           │   │     re-audit         │
│     package prep     │   │ T2: Bug bounty setup │   │ Final sign-off       │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
```

## Files You'll Create/Modify

| File | Tasks |
|------|-------|
| `SECURITY.md` | T2 (bug bounty disclosure policy) |
| `security/audit_package_v1/` | T1 (directory with audit deliverables) |
| `security/bug_bounty_program.md` | T2 (program spec) |
| `security/post_remediation_review.md` | T3 (re-audit findings) |
