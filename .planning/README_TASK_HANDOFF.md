# 📋 NOCTIS TASK HANDOFF — Quick Start Guide

## 🎯 What You Have

A **complete, structured task breakdown** for the Noctis hackathon MVP decomposed into 22 actionable tasks across two agent types:

- **9 Research Tasks (RES-001 → RES-009)**: Protocol design, ZK circuits, competitive analysis
- **13 Developer Tasks (DEV-001 → DEV-013)**: Smart contracts, frontends, integrations

**Location:** `/home/cn/Projects/Competition/Web3/Noctis/TASK_HANDOFF.md` (1,367 lines)

---

## 🚀 How to Use This Document

### **For the Researcher (🔍)**

1. **Read the full task handoff** and understand the critical path
2. **Start with foundational tasks:**
   - RES-001: Protocol 26 Impact (understand the network)
   - RES-002: ZK Circuit Design (critical for DEV-004, DEV-007)
   - RES-003: Stellar RPC Migration (critical for DEV-008)
3. **Produce deliverables** per task (markdown docs, circuit files, etc.)
4. **Coordinate with Developer** on:
   - RES-002 output → DEV-004, DEV-007 input
   - RES-006 output → DEV-006 input
   - RES-009 output → DEV-002, DEV-009 input
5. **Flag blockers immediately** (missing testnet service, breaking changes)

**Critical Research Tasks:**
- RES-002 (Groth16 circuit): Blocks DEV-004, DEV-007
- RES-009 (Passkey architecture): Blocks DEV-002, DEV-009

---

### **For the Developer (🛠️)**

1. **Read the full task handoff** and map to 4 sprints
2. **Execute in order of sprint:**
   - **Sprint 1:** Testnet setup, smart wallets (DEV-001, DEV-002, DEV-003, DEV-008)
   - **Sprint 2:** ZK contracts, streaming, proof generation (DEV-004, DEV-005, DEV-007, DEV-009)
   - **Sprint 3:** Yield router, x402, employee/employer portals (DEV-006, DEV-010, DEV-011, DEV-012)
   - **Sprint 4:** End-to-end testing, demo polish (DEV-013)
3. **Deploy contracts to testnet** and capture CDEPLOYTESTNET... addresses
4. **Generate TypeScript bindings** from compiled WASMs
5. **Run tests** at each milestone (M1–M10)
6. **Flag performance issues** early (proof generation >5s, etc.)

**Critical Developer Tasks:**
- DEV-001 (Testnet setup): Prerequisite for ALL
- DEV-004 (ZK dispatcher): Longest task (XL), on critical path
- DEV-009 (Passkey integration): UX-critical for employee/employer login
- DEV-013 (End-to-end testing): Final gate, depends on ALL prior

---

### **For the Product Manager (You)**

1. **Track sprint velocity** weekly
2. **Unblock dependencies** daily
3. **Run standups** around:
   - Are we on track for each milestone (M1–M10)?
   - Any blockers from Researcher or Developer?
   - Performance concerns (proof gen, claim speed)?
4. **Prep demo day:**
   - Script the 5-minute employer → employee flow
   - Competitive positioning (Protocol 25 X-Ray ZK advantage)
   - YouTube video recording
5. **Escalate P0 issues** immediately (protocol breaking, testnet down)

---

## 📊 Task Structure

Each task follows this schema:

```yaml
Task ID:          [LANE-###]     # RES-001, DEV-001, etc.
Title:            <action title>
Lane:             Developer | Research
Epic:             <parent feature>
Web3 Context:     <relevant chain, protocol, standard>
Description:      <clear, actionable description>
Acceptance Criteria:  # Checkbox list of done conditions
  - [ ] Criterion 1
  - [ ] Criterion 2
Dependencies:     <blocking tasks or NONE>
Priority:         Critical | High | Medium | Low
Estimated Effort: XS | S | M | L | XL
Handoff Notes:    <context for next agent, risks>
```

---

## 🎯 4-Week Sprint Timeline

| Sprint | Duration | Research | Developer | Milestones |
|--------|----------|----------|-----------|-----------|
| 1 | Weeks 1-2 | RES-001, 002, 003, 004 | DEV-001, 002, 003, 008 | M1–M2 |
| 2 | Weeks 3-4 | RES-009, 006, 007 | DEV-004, 005, 007, 009 | M3–M5 |
| 3 | Weeks 5-6 | RES-008, 005 | DEV-006, 010, 011, 012 | M6–M9 |
| 4 | Weeks 7-8 | — | DEV-013 + polish | M10 |

---

## 🔐 Key Web3 Components

✅ **5 Smart Contracts** (Rust + soroban-sdk v26.0.0)
- payroll_dispatcher.rs (ZK batch processing)
- streaming_vault.rs (per-second salary accrual)
- yield_router.rs (Blend/Soroswap integration)
- wallet_factory.rs (secp256r1 passkey wallets)
- policy_signer.rs (spending limits, multi-sig)

✅ **ZK Privacy** (Groth16 + Protocol 25 X-Ray)
- Groth16 zk-SNARKs over BLS12-381
- Native Protocol 25 X-Ray host functions
- Local Powers of Tau ceremony (testnet)
- Nullifier set prevents replay/double-payment

✅ **Smart Wallets** (Passkey Kit + secp256r1)
- Passkey registration (<3 seconds)
- No seed phrases to users
- Launchtube relay abstracts gas fees
- SEP-45 WebAuthn interface

✅ **Payment Protocols**
- x402: HTTP 402 → payment → 200 (API metering)
- MPP: Agentic payment channels (Phase 3)
- Streaming: Per-second accrual

✅ **Yield Routing**
- Blend Protocol lending pools
- Soroswap DEX swaps
- Yield split: 80% employer, 15% employee bonus, 5% protocol

✅ **Standards Compliance**
- SEP-41 (Token Interface)
- SEP-45 (WebAuthn Smart Wallets)
- SEP-8 (Regulated Assets) — future

---

## 🎪 Demo Day Script (5 Minutes)

```
[0:00-1:00] Intro: "Privacy-first payroll on Stellar"
[1:00-1:30] Employer login with FaceID passkey
[1:30-2:30] Upload payroll CSV (10 recipients), approve
[2:30-3:00] ZK proof generation & on-chain verification
[3:00-4:00] Employee login with TouchID, claim salary
[4:00-4:30] Show yield: APY %, Blend pool, earned $
[4:30-5:00] Wrap-up: All testnet ✓, Protocol 26 ✓, no mainnet ✓
```

**Talking Points:**
- Protocol 25 X-Ray: First hackathon using native Stellar ZK for payroll
- Protocol 26: Latest efficiency gains (CAP-81)
- Privacy: Individual amounts hidden, nullifiers prevent replay
- Streaming: Per-second accrual, real-time claims
- UX: No seed phrases, no gas management

---

## ⚡ Critical Path

```
START
  ├─ DEV-001 + RES-001 → Testnet setup
  ├─ RES-002 → ZK circuit (blocks DEV-004, DEV-007)
  ├─ DEV-002 + RES-009 → Smart wallets (blocks DEV-009)
  │
  ├─ DEV-004 (XL) → ZK Dispatcher ⭐ LONGEST
  ├─ DEV-005 (L) → Streaming Vault
  ├─ DEV-006 (L) → Yield Router
  ├─ DEV-007 (L) → ZK Proof Generation (depends on RES-002)
  │
  ├─ DEV-011 (L) → Employee Portal (depends on DEV-009)
  ├─ DEV-012 (L) → Employer Dashboard (depends on DEV-009)
  ├─ DEV-010 (M) → x402 Server
  │
  └─ DEV-013 (XL) → End-to-End Testing ⭐ FINAL GATE
        (depends on ALL prior tasks)
END
```

---

## ✅ Success Criteria (M1–M10)

- [ ] M1: Testnet Setup (RPC live, Friendbot funds OK)
- [ ] M2: Smart Wallets (secp256r1 signatures verified on-chain)
- [ ] M3: Core Payroll Contract (10-recipient batch processed)
- [ ] M4: ZK Proof Integration (verifyProof() returns true)
- [ ] M5: Payment Streaming (per-second stream claimable)
- [ ] M6: x402 Micropayments (HTTP 402 → pay → 200)
- [ ] M7: Yield Routing (idle capital in Blend, APY visible)
- [ ] M8: Employee Portal (passkey login, claim, history)
- [ ] M9: Employer Dashboard (CSV upload, batch approve)
- [ ] M10: Demo Day Ready (end-to-end flow, UI polished, testnet-only)

---

## 🛡️ Security & Compliance

✅ **TESTNET ONLY — NO MAINNET**
- Hardcoded network guard: `STELLAR_NETWORK !== "TESTNET"` → REJECT
- All keypairs with `--network testnet` flag
- All deployments to testnet (CDEPLOYTESTNET... addresses)

✅ **Authentication**
- No seed phrases (secp256r1 passkeys only)
- Passkeys in secure enclave (Apple/Android)
- Launchtube relay abstracts gas
- Address::require_auth() guards all privileged ops

✅ **Privacy & ZK**
- Individual amounts hidden
- Recipient addresses hidden (nullifiers)
- Explorer shows: batch_total, proof_validity, nullifiers only

✅ **Re-entrancy & Overflow**
- Soroban inherently re-entrancy safe
- Rust i128 with overflow checks

---

## ⚠️ Top Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| ZK proof >5s | UX friction | Server-side fallback ready |
| Blend unavailable | Yield broken | Fallback to Soroswap-only |
| Launchtube down | Txns fail | Retry logic + backoff |
| Mercury privacy leak | ZK defeated | Test carefully, fallback to app-side encryption |
| secp256r1 format mismatch | Auth fails | Test with Passkey Kit vectors |
| Protocol 26 breaking | Incompatibility | Monitor discussion, rollback plan |

---

## 📞 Quick Reference

**Research Tasks:** RES-001 through RES-009  
**Developer Tasks:** DEV-001 through DEV-013  
**Sprints:** 4 weeks total (2-week cadence)  
**Milestones:** M1–M10  
**Output:** 1,367-line structured task handoff  

**Next Step:**  
1. Researcher starts with RES-001, RES-002, RES-003, RES-004
2. Developer starts with DEV-001, DEV-008 (in parallel)
3. Product Manager coordinates and unblocks daily

---

**Generated:** May 27, 2026  
**Status:** ✅ Ready for Execution  
**Confidence:** High (all dependencies mapped, effort estimated, risks identified)
