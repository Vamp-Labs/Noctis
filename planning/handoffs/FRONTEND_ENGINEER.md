# Hand-off: Frontend Engineer
## ZK-SDP — Confidential Payroll on Stellar
### From: Product Manager

---

## 1. Your Mission

Build the user-facing face of ZK-SDP: three portals (employer, employee, auditor) plus a landing page, all while integrating browser-based zero-knowledge proof generation. You are the last mile between cryptographic infrastructure and actual human users.

Your guiding principle: **make zero-knowledge invisible.** Users should not need to understand ZK, Merkle trees, or Poseidon2 hashes. They upload a CSV (employer), click a link (employee), or upload a file (auditor).

**💰 Deployment cost: $0.** Cloudflare Pages free tier hosts everything.

---

## 2. Application Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                Cloudflare Pages (free tier)                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Next.js 14 App Router                       │  │
│  │                                                         │  │
│  │  /                          → Landing page              │  │
│  │  /employer/connect          → Wallet connect            │  │
│  │  /employer/batch/new        → CSV upload + tree + dep. │  │
│  │  /employer/batch/[id]       → Real-time dashboard       │  │
│  │  /withdraw/[payload_b64]    → Employee withdrawal portal│  │
│  │  /auditor                   → Auditor verification tool  │  │
│  │                                                         │  │
│  │  Static assets:                                          │  │
│  │    /circuits/payroll_withdrawal.json  ← Circuit artifact │  │
│  │    /wasm/noir-backend.wasm           ← Noir WASM binary  │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Layout:     Shadcn/UI + Tailwind (dark theme)               │
│  Wallet:     @stellar/freighter-api                          │
│  ZK:         @noir-lang/noir_js + Barretenberg WASM         │
│  Stellar:    @stellar/stellar-sdk (SorobanClient)            │
│  Realtime:   @supabase/supabase-js (Realtime client)         │
│  API:        Supabase Edge Functions (public)                │
└──────────────────────────────────────────────────────────────┘
```

### What Changed From the Old (Vercel) Architecture

| Old | New | Why |
|-----|-----|-----|
| Vercel deployment | **Cloudflare Pages** | Free, unlimited bandwidth |
| socket.io-client | **@supabase/supabase-js** Realtime | Free, no server needed |
| `/api/batch/[id]/status` (SSR) | **Supabase Edge Function** or direct DB read | Serverless, no server cost |
| `/api/circuit` (SSR) | **Static file** in `public/` | CDN cached, zero compute |
| `/api/batch/[id]/events` (SSE) | **Supabase Realtime subscription** | PG replication, no custom server |

---

## 3. Design System (PRD §7.4)

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#6B21A8` (purple-900) | CTAs, active states |
| Secondary | `#0EA5E9` (sky-500) | Stellar brand, links |
| Background | `#0F0A1A` | Deep dark — page bg |
| Surface | `#1A1030` | Cards, panels, modals |
| Success | `#10B981` | Proof verified, payment done |
| Error | `#EF4444` | Failures, errors |
| Font | Inter (UI) + JetBrains Mono (hashes/code) | |
| Border radius | 12px cards, 8px inputs | |
| Shadows | Large purple glow on primary CTAs | |

---

## 4. Deliverables — By Page

### Page: Landing Page `/` (S1-015)

| Component | Description |
|-----------|-------------|
| `<HeroSection />` | "Payroll. Private by proof." — large headline, subtitle, two CTAs ("I'm an Employer" → `/employer/connect`, "Claim My Salary" → enter payload) |
| `<ProtocolStackDiagram />` | SVG illustration: Employer → Noir → Soroban → Employee. Dark mode animated. |
| `<HowItWorksSteps />` | 4 steps with icons: ① Upload CSV ② Commit & Deposit ③ Share Claim Links ④ Employee Claims Privately |
| `<TechBadges />` | Rowed logos: Stellar, Noir, UltraHonk, Poseidon2, BN254, Soroban |
| `<Footer />` | GitHub link, hackathon badge, "Built for Stellar Hacks: Real-World ZK" |

**Acceptance:** Responsive (mobile + desktop), OpenGraph metadata set, CTAs functional.

---

### Page: Employer Flow (S1-016, S2-004, S2-005, S2-006, S2-007, S2-008)

#### `/employer/connect` — Wallet Connection (S2-005)

| Component | State | Behavior |
|-----------|-------|----------|
| `<WalletConnector />` | `disconnected / connecting / connected / wrongNetwork` | Detects Freighter, requests publicKey, shows address, network badge |
| `<NetworkBadge />` | `testnet / mainnet / unknown` | Green for testnet, red for others |

**Freighter API usage:**
```typescript
const { publicKey } = await window.stellar.request({ method: 'getPublicKey' });
const { network } = await window.stellar.request({ method: 'getNetwork' });
assert(network === 'TESTNET');
```

#### `/employer/batch/new` — Payroll Batch Creation (S1-016, S2-004, S2-006, S2-008)

**Step 1 — Upload CSV:**
- `<CSVUploader />` — drag-and-drop zone, file picker fallback
- Validates columns: `employee_index, wallet_address, salary_amount_usdc`
- `<PayrollPreviewTable />` — shows parsed rows with salary mask toggle (eye icon)
- Shows: row count, total salary sum

**Step 2 — Build Tree:**
- `<CommitmentBuilder />` — calls tree builder WASM (in-browser, not server)
- Shows progress spinner, then displays Merkle root (truncated hash)
- `<MerkleTreeVisualizer />` — simple tree icon showing root + leaf count
- **No data sent to server** — all computation is local

**Step 3 — Deposit:**
- `<DepositConfirmModal />` — summary: total amount, root hash, batch ID
- "Deposit & Create Batch" button → Freighter signs `create_batch` transaction
- Success: redirect to `/employer/batch/[id]`

**Step 4 — Export Secrets:**
- `<SecretExporter />` — "Download Employee Claim Links" button
- Generates JSON/CSV with per-employee withdrawal payloads
- ⚠️ Warning banner: "These secrets cannot be recovered. Download now."

**CSV format expected:**
```
employee_index,wallet_address,salary_amount_usdc
0,GDQJUT...,5000.00
1,GBQX...,3500.00
```

#### `/employer/batch/[id]` — Real-Time Dashboard (S2-007)

| Component | Data Source | Behavior |
|-----------|-------------|----------|
| `<BatchHeader />` | Supabase Edge Function `batch-status` or direct DB fetch | Batch ID, status badge, total locked, employer address |
| `<ClaimProgressBar />` | Supabase Realtime subscription on `batch_events` | Animated progress bar: "47 of 200 employees claimed" |
| `<RecentClaimsTable />` | Supabase Realtime `INSERT` events on `batch_events` | List of recent claims — nullifier hash (truncated), timestamp. NO amount, NO employee ID |
| `<BatchActions />` | — | Buttons: "Export Audit Report", "Copy Root Hash", "View on Stellar Expert" |
| `<ConnectionStatus />` | Supabase Realtime connection | Green dot: connected, Red: disconnected |

**Supabase Realtime subscription code for dashboard:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://[project].supabase.co',
  'public_anon_key'
)

// Subscribe to batch events for live updates
const channel = supabase
  .channel(`batch-${batchId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'batch_events',
      filter: `batch_id=eq.${batchId}`,
    },
    (payload) => {
      if (payload.new.event_type === 'Withdrawn') {
        updateClaimProgress(payload.new)
        addClaimToTable(payload.new)
      }
    }
  )
  .subscribe((status) => {
    // 'SUBSCRIBED' = connected
    // 'CHANNEL_ERROR' = disconnected
    updateConnectionStatus(status)
  })

// Cleanup on unmount
return () => {
  supabase.removeChannel(channel)
}
```

**Privacy-critical:** The dashboard must NOT display individual salary amounts or employee identities. Only the employer (who has the CSV) can map claims to employees.

---

### Page: Employee Withdrawal Portal `/withdraw/[payload_b64]` (S2-009, S2-010, S2-011)

This is the **most UX-critical page**. A non-technical employee should claim their salary in under 3 clicks.

#### Flow & Components

**Step 0: Payload Decoding**
- Read `payload_b64` from URL path
- Decode and validate `WithdrawalPayload`
- If invalid: show `<ErrorScreen>` with "Invalid or expired link"

**Step 1: Show Payment Info** `<PaymentBanner />`
- "You have **5,000.00 USDC** ready to claim from **Your Company**"
- Clean, large typography — reassuring

**Step 2: Connect Wallet** `<WalletConnector />`
- "Connect Freighter to receive payment"
- After connect: shows address, "Continue" button

**Step 3: Generate Proof** `<ProofGenerator />` + `<ProofStepIndicator />`

```
┌─────────────────────────────────┐
│  Generating your private proof  │
│                                 │
│  ┌─────────────────────────┐    │
│  │        ◉  ◌  ◌  ◌       │    │  ← Animated progress ring
│  └─────────────────────────┘    │
│                                 │
│  ● Loading circuit...           │  ← Step 1 (active)
│  ○ Constructing witness...      │  ← Step 2 (pending)
│  ○ Proving...                   │  ← Step 3 (pending)
│  ○ Done!                        │  ← Step 4 (pending)
│                                 │
│  "Your proof is being generated │
│   in your browser. No data is   │
│   sent to any server."          │
└─────────────────────────────────┘
```

- Step transitions with micro-animations
- **Privacy badge:** "This runs entirely in your browser. Your salary is never sent to a server."
- If > 30s elapsed: "Almost there! ZK proofs take a moment..."
- Circuit loaded from static asset: `/circuits/payroll_withdrawal.json`

**Step 4: Submit & Withdraw** `<WithdrawButton />` + `<SuccessScreen />`
- Button: "Claim {amount} USDC" — disabled until proof ready
- On click: constructs `withdraw()` transaction, opens Freighter for signing
- `<SuccessScreen />`: "Payment received!" with:
  - Transaction hash (copyable)
  - "View on Stellar Expert" link
  - Amount confirmed
  - "Close" button (clears secrets from memory)

**Error states:**
| Error | User Message | Recovery |
|-------|-------------|----------|
| `NullifierSpent` | "This salary has already been claimed. If you haven't received payment, contact your employer." | Contact employer |
| `ProofInvalid` | "The proof could not be verified. Please try again." | Retry button |
| `RootMismatch` | "This batch is no longer valid. Contact your employer." | Contact employer |
| Network error | "Could not connect to the Stellar network. Check your connection and try again." | Retry button |
| Wallet not found | "Please install Freighter wallet to claim your salary." | Install link |

**Security:**
- NEVER store `nullifier_secret` in localStorage or sessionStorage
- Clear secrets from memory after claim
- Warn users to verify URL

---

### Page: Auditor Tool `/auditor` (S2-012)

| Component | Description |
|-----------|-------------|
| `<BatchIdInput />` | Text input for batch ID + "Verify" button |
| `<CSVReloader />` | Upload CSV (auditor has authorization) |
| `<RootVerifierWidget />` | Computes root from CSV, fetches on-chain root via Soroban RPC, shows ✅ MATCH or ❌ MISMATCH |
| `<NullifierAuditTable />` | Fetches `batch_events` from Supabase (or direct RPC) for nullifier audit |
| `<SolvencyReport />` | Total Locked vs Total Claimed vs Remaining |

**Data sourcing:** Auditor fetches on-chain data directly from Soroban RPC (no middleware) and batch metadata from Supabase Edge Function.

---

## 5. Wallet Integration (Freighter)

```typescript
import { 
  isConnected, getPublicKey, getNetwork, 
  signTransaction, signAuthEntry 
} from '@stellar/freighter-api';

const connected = await isConnected();
if (!connected) { /* show install prompt */ }

const publicKey = await getPublicKey();

const networkDetails = await getNetwork();
if (networkDetails.network !== 'TESTNET') { /* show network switch prompt */ }

const signedTx = await signTransaction(unsignedTxXdr, { network: 'TESTNET' });
```

---

## 6. Noir WASM Integration (S2-010) — Most Critical

```typescript
async function generateProof(payload: WithdrawalPayload, recipientAddress: string) {
  setStatus('loading_circuit');
  
  // Fetch circuit from static file (CDN cached)
  const circuit = await fetch('/circuits/payroll_withdrawal.json').then(r => r.json());
  
  const { Noir } = await import('@noir-lang/noir_js');
  const { UltraHonkBackend } = await import('@noir-lang/backend_barretenberg');
  const backend = new UltraHonkBackend(circuit.bytecode);
  const noir = new Noir(circuit);
  
  setStatus('constructing_witness');
  const { witness } = await noir.execute({
    salary_amount: payload.salary_amount,
    nullifier_secret: payload.nullifier_secret,
    employee_index: payload.employee_index,
    merkle_siblings: payload.merkle_siblings,
    merkle_path_indices: payload.merkle_path_indices,
    merkle_root: payload.merkle_root,
    expected_amount: payload.salary_amount,
    recipient_address: addressToField(recipientAddress),
  });
  
  setStatus('proving');
  const { proof, publicInputs } = await backend.generateProof(witness);
  
  setStatus('done');
  return { proof, publicInputs };
}
```

**Key: Web Worker + aggressive caching:**
- Run WASM in Web Worker (keep UI responsive)
- Cache circuit JSON + WASM binary in IndexedDB after first load
- Barretenberg WASM is 20-40 MB — lazy-load with progress indicator
- Clean up memory after proof generation

---

## 7. Data Sources

| What | Where | How to Fetch |
|------|-------|-------------|
| Circuit JSON | `frontend/public/circuits/payroll_withdrawal.json` | `fetch('/circuits/payroll_withdrawal.json')` |
| Batch state | Supabase Edge Function | `fetch('https://[project].supabase.co/functions/v1/batch-status?batch_id=1')` |
| Live claim events | Supabase Realtime | `supabase.channel('batch-1').on('postgres_changes', ...)` |
| On-chain root | Soroban RPC directly | `new SorobanRpc.Server(TESTNET_RPC).getLedgerEntries(...)` |
| On-chain nullifier | Soroban RPC directly | Contract `is_spent()` view function |
| Withdraw tx submit | Freighter → Soroban RPC | `signTransaction()` → `Server.sendTransaction()` |

---

## 8. Cloudflare Pages Deployment

```bash
# Build
npm run build

# Deploy (via Wrangler)
npx wrangler pages deploy ./out

# Or via git: connect GitHub repo to Cloudflare Pages dashboard
# Build command: npm run build
# Build output: ./out
```

**Project config (`wrangler.toml`):**
```toml
name = "zk-sdp"
pages_build_output_dir = "./out"

[env.production]
routes = [
  { pattern = "zksdp.pages.dev/*" }
]
```

**Build setup for Next.js on Cloudflare Pages:**
```bash
# Use @cloudflare/next-on-pages
npm install -D @cloudflare/next-on-pages

# Build command
npx @cloudflare/next-on-pages
```

---

## 9. Routes & Component Tree

```
app/
├── layout.tsx
├── page.tsx                      — Landing page
├── employer/
│   ├── connect/page.tsx          — WalletConnector
│   └── batch/
│       ├── new/page.tsx          — Full batch creation flow
│       └── [id]/page.tsx         — Real-time dashboard
├── withdraw/[payload_b64]/page.tsx — Withdrawal portal
├── auditor/page.tsx              — Auditor tool
└── components/
    ├── ui/                       — Shadcn primitives
    ├── wallet/WalletConnector.tsx
    ├── employer/                 — 10 components
    ├── withdraw/                 — 6 components
    └── auditor/                  — 5 components
```

---

## 10. Dependencies & Timeline

```
S1-014 Scaffold (Day 1) ──────────────────────────────────────────────
S1-015 Landing (Day 1-2) ─────────────────────────────────────────────
S1-016 CSV Upload (Day 2-3) ──────────────────────────────────────────
S2-005 Wallet Connect (Day 3-4) ──▶ S2-006 Deposit (Day 5-6) ────────
S2-004 Commitment UI (Day 4-5) ───▶ S2-008 Export (Day 6) ───────────
                                    S2-007 Dashboard (Day 6-8) ──────
S2-009 Withdrawal UI (Day 3-5) ───▶ S2-010 WASM (Day 5-7) ───────────
                                    S2-011 Submit (Day 7-9) ─────────
S2-012 Auditor (Day 6-8) ─────────────────────────────────────────────
S2-014 Polish (Day 8-10) ─────────────────────────────────────────────
S2-015 Loading states (Day 8-9) ──────────────────────────────────────
S2-016 Responsive (Day 9-10) ─────────────────────────────────────────
```

**Blocking dependencies:**
- Contract address (Smart Contract) — needed for deposit + withdraw transactions
- Circuit artifact (Smart Contract) — needed for proof generation
- Supabase project URL + anon key (Backend) — needed for Realtime + Edge Functions

---

## 11. Key References

| Resource | Link | Why |
|----------|------|-----|
| PRD §7 | `PRD.md#7-frontend-specification` | Full frontend spec |
| PRD §7.3.4 | `PRD.md#734-employee-withdrawal-portal` | Withdrawal portal (critical) |
| PRD §7.4 | `PRD.md#74-design-system` | Design tokens |
| PRD §12.3 | `PRD.md#123-frontend-security` | Frontend security |
| Cloudflare Pages | `pages.cloudflare.com` | Deployment |
| Next.js on Pages | `github.com/cloudflare/next-on-pages` | Build adapter |
| Supabase JS Client | `supabase.com/docs/reference/javascript` | Realtime + queries |

---

## 12. Open Questions for PM

| Question | Context | PM's Answer |
|----------|---------|-------------|
| Deploy target? | Vercel (paid) vs Cloudflare Pages (free) | **Cloudflare Pages** — $0, unlimited bandwidth |
| Real-time updates? | socket.io (needs server) vs Supabase Realtime (free) | **Supabase Realtime** — free tier, 200 concurrent |
| Circuit serving? | API endpoint vs static file | **Static file** in `public/` — CDN cached |
| Analytics? | Plausible vs none | **None** — privacy-first hackathon demo |
| Error tracking? | Sentry vs none | **None** — too noisy for MVP |

---

## 13. Definition of Done Checklist

- [ ] All pages render with correct design system
- [ ] CSV upload + validation works
- [ ] Tree builder UI shows Merkle root (in-browser WASM)
- [ ] Freighter wallet connection works on testnet
- [ ] Deposit transaction signed and lands on testnet
- [ ] Dashboard shows real-time claim progress via Supabase Realtime
- [ ] Employee portal: proof generates in < 120s
- [ ] Employee portal: proof submits and payout succeeds
- [ ] Auditor tool verifies root match
- [ ] All error states handled with user-friendly messages
- [ ] Responsive (320px–1920px)
- [ ] Loading states/skeletons on all data-fetching views
- [ ] Secrets cleared from memory after claim
- [ ] Deployed on Cloudflare Pages
- [ ] No salary data in any component state that could leak

---

## 14. Communication

- **Daily standup:** 9:30 AM Telegram
- **Supabase URL/key:** Get from Backend Engineer
- **Design reviews:** Share screenshots in Telegram
- **WASM integration:** Coordinate with Smart Contract Engineer on circuit output

---

*This hand-off document is your source of truth. If anything in the PRD contradicts this, raise it in standup.*

*Product Manager — ArbaLabs | June 2026*
