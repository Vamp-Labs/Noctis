# Development Flow & Execution Plan
## ZK-SDP — Confidential Payroll on Stellar
### Product Manager: ArbaLabs | June 2026

---

> This is the master execution plan. Read this first, then dive into your role-specific hand-off.

---

## 1. Core Principle: Maximize Parallelism

Three workstreams run **in parallel** from Day 1. They converge at defined integration points.

```
Day 1      Day 3      Day 5      Day 7      Day 9      Day 12
│          │          │          │          │          │
├─ SC ─────┼──────────┼──────────┼──────────┼──────────┤  Smart Contract
│          │  Circuit │  Contract│  Deploy  │  Fixes   │
│          │  Verifier│  Tests   │  Testnet │  E2E     │
│          │          │          │          │          │
├─ BE ─────┼──────────┼──────────┼──────────┼──────────┤  Backend
│          │  Supabase│  Edge    │  Realtime│  Fixes   │
│          │  DB      │  Fns     │  Config  │  E2E     │
│          │          │          │          │          │
├─ FE ─────┼──────────┼──────────┼──────────┼──────────┤  Frontend
│  Scaffold│  CSV     │  Deposit │  Withdraw│  Polish  │
│  Landing │  Tree UI │  Dashbrd │  WASM    │  Submit  │
│          │          │          │          │          │
          ▲          ▲          ▲          ▲
          │          │          │          │
     Kickoff     Contract    Realtime    E2E Demo
     Meeting    Addresses     Ready      Test
                Hand-off    Hand-off
```

**Integration Points:**
| Day | Event | What Happens |
|-----|-------|-------------|
| 3 | **Contract Address Hand-off** | SC gives deployed contract IDs to BE + FE |
| 5 | **Supabase Ready Hand-off** | BE gives Supabase URL + anon key to FE |
| 7 | **Realtime Ready Hand-off** | BE confirms Edge Functions + Realtime working |
| 10 | **E2E Demo Test** | All agents together: 3-employee batch full flow |

---

## 2. Day-by-Day Execution

### Day 1: Kickoff & Foundations

**All agents start simultaneously.**

| Agent | First Task | Why First | File |
|-------|-----------|-----------|------|
| **Smart Contract** | Write `payroll_withdrawal.nr` circuit + compile | Circuit is the critical path — everything depends on it | `handoffs/SMARTCONTRACT_ENGINEER.md` §3.1 |
| **Backend** | Create Supabase project + run DB migration | Non-blocking: no contract address needed yet | `handoffs/BACKEND_ENGINEER.md` §3.1-3.2 |
| **Frontend** | Scaffold Next.js + Tailwind + Shadcn + Landing page | No external deps; build UI shells | `handoffs/FRONTEND_ENGINEER.md` §4 (Landing) |
| **PM** | Fund Stellar testnet accounts + deploy test USDC | Unblock everyone on Day 3 | `specs/testnet_addresses.md` |

**Day 1 deliverables by end-of-day:**
- SC: `payroll_withdrawal.json` compiled circuit artifact exists
- BE: `supabase start` runs locally, migration file written
- FE: `localhost:3000` shows dark theme landing page
- PM: Employer + 3 employee Stellar testnet accounts funded

### Day 2: Deep Build

| Agent | Task | Parallel? |
|-------|------|-----------|
| **SC** | Deploy UltraHonkVerifierContract + verify circuit locally | Independent |
| **BE** | Implement payload encoder/decoder + tree builder package | Independent |
| **FE** | Build CSV upload + PayrollPreviewTable components | Independent |

**Mid-day check-in (Telegram):** Each agent posts:
1. Circuit constraint count (`nargo info`)
2. Supabase local URL
3. Screenshot of CSV upload working

### Day 3: Contract Address Hand-off

**Critical hand-off point.** Smart Contract Engineer must deliver:

```typescript
{
  ultraHonkVerifierAddress: "CCYF...",
  confidentialPayrollAddress: "CABC...",
  usdcSacAddress: "CBIEL...",
  compiledCircuitJson: Uint8Array  // or path to file
}
```

**This unblocks:**
- Backend: Event indexer Edge Function (needs contract address)
- Frontend: Deposit + Withdraw transactions (needs contract address)

**Day 3 plan:**
| Agent | Task | Depends On |
|-------|------|-----------|
| **SC** | Deploy ConfidentialPayrollContract to public testnet ✅ **DELIVER CONTRACT ADDRESSES** | Day 1-2 circuit work |
| **BE** | Wire event indexer Edge Function with contract address | SC hand-off |
| **FE** | Build CommitmentBuilder UI + MerkleTreeVisualizer | Tree builder package from BE |
| **FE** | Start Freighter wallet connect component | None (independent) |

### Day 4-5: Core Build Sprint

| Agent | Tasks |
|-------|-------|
| **SC** | Unit tests + integration test + security review (internal) |
| **BE** | Batch-status Edge Function + fix event indexer edge cases |
| **FE** | Deposit confirm modal + SecretExporter + Dashboard shell |

### Day 6: Supabase Ready Hand-off

Backend Engineer delivers to Frontend Engineer:

```typescript
{
  supabaseUrl: "https://xxxxx.supabase.co",
  supabaseAnonKey: "eyJ...",
  edgeFunctionBaseUrl: "https://xxxxx.supabase.co/functions/v1/",
  realtimeChannelName: "batch-updates"
}
```

**This unblocks Frontend's real-time dashboard.**

| Agent | Day 6 Task |
|-------|-----------|
| **BE** | Confirm Realtime channels working + cron scheduling active |
| **FE** | Wire dashboard to Supabase Realtime instead of mock data |

### Day 7-9: Withdrawal Portal Sprint (Critical Path)

**This is the highest-risk segment.** Noir WASM in browser is untested.

| Agent | Task | Risk |
|-------|------|------|
| **FE** | Build withdrawal portal UI + ProofGenerator component | Medium |
| **FE** | Integrate Noir WASM (20-40 MB download, Web Worker) | **HIGH** |
| **FE** | Wire withdraw button + Freighter signing + success screen | Medium |
| **SC** | Available for circuit/WASM troubleshooting | — |
| **BE** | Monitor Edge Functions, fix any indexer issues | Low |

**Day 7-9 escalation rules:**
- If WASM load time > 10s: Move circuit JSON + WASM binary to Cloudflare CDN with `immutable` cache
- If proof generation > 120s: Reduce tree depth from 16 to 10 for demo
- If Freighter conflicts with WASM memory: Isolate in Web Worker (already planned)

### Day 10-12: Integration, Polish & Submission

| Day | Activity |
|-----|----------|
| **10 AM Day 10** | All agents gather for E2E test session |
| **10:30 AM** | Run through: CSV upload → tree build → deposit → 3x withdraw → dashboard check → auditor verify |
| **12:00 PM** | Fix any P0 issues discovered |
| **Day 11** | Demo video recording (PM), error polish (FE), README (PM) |
| **Day 12** | Final submission to DoraHacks |

---

## 3. What Each Agent Starts With (First 24h)

### Smart Contract Engineer — Start Here
```
1. Read:  handoffs/SMARTCONTRACT_ENGINEER.md (full)
2. Read:  PRD.md §8.3 (circuit code) + §8.2.1 (contract code)
3. Do:    Write circuits/payroll_withdrawal/src/main.nr
4. Do:    nargo compile → verify constraint count < 500k
5. Do:    Deploy UltraHonkVerifierContract to testnet
6. Share: Circuit artifact path + verifier address in #dev Telegram
```

### Backend Engineer — Start Here
```
1. Read:  handoffs/BACKEND_ENGINEER.md (full)
2. Read:  planning/sprints/Sprint-1.md §Phase 2 tickets
3. Do:    Create Supabase account + project (free tier)
4. Do:    supabase init → write migration (batches + batch_events tables)
5. Do:    Implement shared/payload.ts (encode/decode withdrawal payload)
6. Do:    Implement shared/tree-builder.ts (Poseidon2 Merkle tree)
7. Share: Supabase project URL + DB schema in #dev Telegram
```

### Frontend Engineer — Start Here
```
1. Read:  handoffs/FRONTEND_ENGINEER.md (full)
2. Read:  PRD.md §7 (frontend spec) — especially §7.3.4 (withdrawal portal)
3. Do:    npx create-next-app → configure Tailwind + Shadcn
4. Do:    Configure @cloudflare/next-on-pages (test build)
5. Do:    Build landing page (HeroSection + HowItWorks + TechBadges)
6. Share: Verc— sorry, Cloudflare Pages preview URL in #dev Telegram
```

---

## 4. Hand-off Sequence (What Gets Passed & When)

```
Day 1-2                       Day 3                        Day 5-6
┌──────────┐                 ┌──────────┐                 ┌──────────┐
│ SC       │ ──contract────▶ │ BE       │ ──supabase─────▶│ FE       │
│ Circuit  │   addresses     │ Event    │   URL + keys    │ Dashboard│
│ Verifier │                 │ Indexer  │                 │ Realtime │
└──────────┘                 └──────────┘                 └──────────┘
     │                             │                            │
     │ circuit artifact            │ Edge Function API          │
     ▼                             ▼                            ▼
┌──────────┐                 ┌──────────┐                 ┌──────────┐
│ FE       │                 │ FE       │                 │ All      │
│ WASM     │                 │ Dashboard│                 │ E2E Test │
│ Proof Gen│                 │ API calls│                 │ Day 10   │
└──────────┘                 └──────────┘                 └──────────┘
```

**Hand-off artifacts:**

| From | To | When | What | Format |
|------|----|------|------|--------|
| SC | BE + FE | Day 3 | Contract addresses + VK | Update `testnet_addresses.md` |
| SC | FE | Day 3 | Circuit JSON artifact | `.json` file → `frontend/public/circuits/` |
| BE | FE | Day 6 | Supabase URL + anon key + Edge Function URLs | Update `testnet_addresses.md` |
| BE | FE | Day 6 | Realtime channel name + filter pattern | Telegram message |
| FE | PM | Day 10 | Working E2E demo | Screen recording |

---

## 5. Risk-Based Priorities

If things slip, here's what we protect vs what we cut:

### Must Ship (P0 — Never Cut)
1. **Noir circuit compiles + verifies** — No ZK = no product
2. **ConfidentialPayrollContract deployed** — No contract = no payroll
3. **Employee withdrawal portal works** — Core user flow
4. **Single E2E test passes** — One employee claims successfully

### Should Ship (P1 — Cut Only If Absolutely Necessary)
5. Employer dashboard with Realtime updates
6. Auditor tool
7. Multi-employee batch (3 people)
8. Demo video

### Nice to Have (P2 — Cut Happily)
9. Mobile responsive
10. Loading skeleton screens
11. Error state polish beyond basic messaging
12. Auditor nullifier audit table

---

## 6. Daily Comm Flow

### Every Morning (9:30 AM Telegram)

```
[Done yesterday]
- SC: Circuit compiled, verifier deployed
- BE: Supabase project created, migration written
- FE: Landing page done, CSV upload started

[Blockers]
- None

[Today]
- SC: Write payroll contract
- BE: Deploy event-indexer edge function
- FE: Complete CSV upload + start tree builder UI
```

### Every Evening (Optional Async)

Each agent drops a quick message in Telegram with any new hand-off artifacts they've created (contract addresses, Supabase URL, etc.)

---

## 7. Decision-Making Rules

When you encounter an ambiguity not covered in the PRD or hand-off docs:

| Situation | Action |
|-----------|--------|
| **Technical decision < 30min** | Decide, implement, document in code comment |
| **Technical decision > 30min** | Ask in Telegram #dev — tag the PM |
| **UX question** | Make your best call, screenshot in Telegram, PM confirms |
| **Security concern** | STOP. Tag #security in Telegram. Do not proceed. |
| **PRD contradiction** | Whatever the hand-off doc says takes priority. Tell PM. |

---

## 8. Environment Access (Day 1 Setup)

| Resource | How to Get It | Shared In |
|----------|--------------|-----------|
| Stellar testnet Friendbot | `https://friendbot.stellar.org?addr=...` | Telegram Day 1 |
| Supabase project | Create at `supabase.com` (free) | Telegram Day 1 |
| Cloudflare Pages | Connect GitHub repo at `pages.cloudflare.com` | Telegram Day 2 |
| GitHub repo | Created by PM — push access for all | Telegram Day 1 |
| UltraHonkVerifierContract | Deployed by SC | `testnet_addresses.md` Day 3 |

---

*This flow document is the master execution plan. If you're unsure what to do next, re-read this and your hand-off doc.*

*Product Manager — ArbaLabs | June 2026*
