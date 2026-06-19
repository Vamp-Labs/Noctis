# Hand-off: Backend Engineer
## ZK-SDP — Confidential Payroll on Stellar
### From: Product Manager

---

## 1. Your Mission

Build the stateless off-chain glue that connects the browser frontend to Stellar — **with zero server cost**. You own the Supabase infrastructure: the database schema, the Edge Functions that index Soroban events, and the Realtime channels that push live updates to the employer dashboard.

Your guiding principle: **no salary data ever touches our infrastructure.** Only public on-chain data (Merkle roots, nullifier hashes, timestamps) lives in the database. Everything sensitive happens client-side in the browser.

**💰 Cost:** $0. Supabase free tier + Cloudflare Pages free tier handle everything.

---

## 2. Architecture Overview

```
Cloudflare Pages (free)                  Supabase (free tier)
┌─────────────────────┐                 ┌──────────────────────────────┐
│ Next.js App          │                 │ PostgreSQL (500MB)           │
│                      │  REST + Realtime│  ├─ batches table            │
│ ┌─────────────────┐  │ ◀──────────────│  ├─ batch_events table       │
│ │ Circuit JSON     │  │               │  └─ no salary data stored!   │
│ │ (static file)    │  │               │                              │
│ └─────────────────┘  │               │ Edge Functions (Deno)         │
│                      │               │  ├─ event-indexer: polls      │
│ Employer Portal      │               │  │  Soroban every 30s         │
│ Employee Portal      │               │  └─ batch-status: returns     │
│ Auditor Tool         │               │     batch state                │
└─────────────────────┘               │ Realtime (free)                │
                                      │  └─ broadcasts new events      │
          │                           │     to dashboard               │
          │ Soroban RPC               └──────────────┬─────────────────┘
          ▼                                          │
┌──────────────────────────┐                          │
│ Stellar Testnet           │◀────────────────────────┘
│ ConfidentialPayroll       │   Edge Function polls
│ Contract                  │   SorobanRpc.getEvents()
└──────────────────────────┘
```

### What Changed From the Old Architecture

| Old (Vercel) | New (Free Stack) | Why |
|-------------|-------------------|-----|
| Hono.js API server | Supabase Edge Functions (Deno) | No server to maintain, free tier |
| Socket.io WebSocket server | Supabase Realtime (PG replication) | Built-in, 200 concurrent free |
| Standalone event indexer process | Scheduled Edge Function (cron) | No process to keep alive |
| Vercel hosting | Cloudflare Pages | Unlimited bandwidth free |
| Dynamically-served circuit | Static file in `public/` | CDN cache, zero compute |
| No database | Supabase PostgreSQL 500MB | Tracks public on-chain state |

---

## 3. Deliverables

### 3.1 Supabase Project Setup

**Sign up:** `supabase.com` → New project → Free tier
**Region:** Choose closest to you (or US East for Stellar testnet proximity)

```bash
# Install Supabase CLI
npm install -g supabase

# Init in monorepo
supabase init
supabase start  # Local development
```

**Config (`supabase/config.toml`):**
```toml
[api]
enabled = true
port = 54321

[db.enable]
extensions = ["pg_cron"]  # For scheduled Edge Functions

[edge_functions]
enabled = true
verify_jwt = false  # MVP: no auth required

[analytics]
enabled = false  # Privacy-first

[realtime]
enabled = true
# Free tier: 200 concurrent connections, 2M messages/month
```

### 3.2 Database Schema

**Migration file:** `supabase/migrations/00001_init.sql`

```sql
-- Batches: one row per payroll batch (mirrors on-chain state)
create table batches (
  batch_id        bigint primary key,
  employer        text not null,        -- Stellar G address
  merkle_root     text not null,        -- hex-encoded
  token_address   text not null,        -- USDC SAC address
  total_amount    bigint not null,      -- in micro-USDC
  leaf_count      integer not null,
  claimed_count   integer not null default 0,
  status          text not null default 'active',  -- 'active' | 'closed'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Batch events: one row per on-chain event (BatchCreated or Withdrawn)
-- ⚠️ NO salary amount stored here — privacy preserved
create table batch_events (
  id              bigserial primary key,
  batch_id        bigint not null references batches(batch_id),
  event_type      text not null,        -- 'BatchCreated' | 'Withdrawn'
  nullifier_hash  text,                 -- null for BatchCreated events
  recipient       text,                 -- null for BatchCreated events
  ledger          bigint not null,
  timestamp       timestamptz not null,
  created_at      timestamptz not null default now()
);

-- Indexes for fast lookups
create index idx_batch_events_batch_id on batch_events(batch_id);
create index idx_batch_events_nullifier on batch_events(nullifier_hash);
create index idx_batches_status on batches(status);
```

**Why this schema:**
- Only stores **public on-chain data** — no salary amounts, no secrets
- `claimed_count` is denormalized for fast dashboard queries (updated by Edge Function)
- `batch_events` row per `Withdrawn` event enables nullifier audit
- Referential integrity enforced at DB level

### 3.3 Edge Function: Event Indexer

**File:** `supabase/functions/event-indexer/index.ts`

```typescript
// Deno Edge Function — scheduled every 30 seconds via cron
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface SorobanEvent {
  type: string
  ledger: number
  topic: string[]
  data: { employer?: string; merkle_root?: string; total_amount?: number }
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // 1. Get last processed ledger
  const { data: meta } = await supabase
    .from('_indexer_meta')
    .select('last_ledger')
    .single()
  const lastLedger = meta?.last_ledger ?? 0
  
  // 2. Poll Soroban RPC for new events
  const CONTRACT_ID = Deno.env.get('PAYROLL_CONTRACT_ID')!
  const RPC_URL = 'https://soroban-testnet.stellar.org'
  
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getEvents',
      params: {
        startLedger: lastLedger + 1,
        filters: [{
          type: 'contract',
          contractIds: [CONTRACT_ID],
          topics: [['*']]  // Match all topics
        }],
        pagination: { limit: 100 }
      }
    })
  })
  
  const { result } = await response.json()
  if (!result?.events?.length) {
    return new Response('No new events')
  }
  
  // 3. Process and store events
  for (const event of result.events) {
    const topic = event.topic[0]  // 'BatchCreated' or 'Withdrawn'
    
    if (topic === 'BatchCreated') {
      const batchId = parseInt(event.topic[1])
      
      // Insert batch record
      await supabase.from('batches').upsert({
        batch_id: batchId,
        employer: event.data.employer,
        merkle_root: event.data.merkle_root,
        total_amount: Number(event.data.total_amount),
      })
      
      // Insert event
      await supabase.from('batch_events').insert({
        batch_id: batchId,
        event_type: 'BatchCreated',
        ledger: event.ledger,
        timestamp: new Date().toISOString(),
      })
    }
    
    if (topic === 'Withdrawn') {
      const nullifier = event.topic[1]
      const batchId = /* extract from event or lookup */ null
      
      // Update claimed count
      await supabase.rpc('increment_claimed', { p_batch_id: batchId })
      
      // Insert event
      await supabase.from('batch_events').insert({
        batch_id: batchId,
        event_type: 'Withdrawn',
        nullifier_hash: nullifier,
        ledger: event.ledger,
        timestamp: new Date().toISOString(),
      })
    }
  }
  
  // 4. Update last processed ledger
  const maxLedger = Math.max(...result.events.map(e => e.ledger))
  await supabase
    .from('_indexer_meta')
    .upsert({ id: 1, last_ledger: maxLedger })
  
  return new Response(`Processed ${result.events.length} events`)
})
```

**Cron schedule** (configure in Supabase Dashboard → Database → Cron):
```sql
-- Every 30 seconds
select cron.schedule(
  'event-indexer',
  '30 seconds',
  $$ select net.http_post(
    url:='https://[project].supabase.co/functions/v1/event-indexer',
    headers:='{"Authorization":"Bearer [anon_key]"}'::jsonb
  ) $$
);
```

**Environment variables:**
```
SUPABASE_URL=                        # Auto-injected
SUPABASE_SERVICE_ROLE_KEY=           # Auto-injected  
PAYROLL_CONTRACT_ID=                 # From Smart Contract Engineer
STELLAR_RPC_URL=soroban-testnet.stellar.org
```

### 3.4 Edge Function: Batch Status

**File:** `supabase/functions/batch-status/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async (req) => {
  const url = new URL(req.url)
  const batchId = url.searchParams.get('batch_id')
  
  if (!batchId) {
    return new Response(JSON.stringify({ error: 'batch_id required' }), { status: 400 })
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!  // Read-only key for public access
  )
  
  // Fetch batch + event count in one query
  const { data: batch } = await supabase
    .from('batches')
    .select('*')
    .eq('batch_id', parseInt(batchId))
    .single()
  
  if (!batch) {
    return new Response(JSON.stringify({ error: 'batch not found' }), { status: 404 })
  }
  
  return new Response(JSON.stringify({
    batch_id: batch.batch_id,
    employer: batch.employer,
    merkle_root: batch.merkle_root,
    total_amount: batch.total_amount,
    leaf_count: batch.leaf_count,
    claimed_count: batch.claimed_count,
    status: batch.status,
    created_at: batch.created_at,
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Frontend calls it as:**
```typescript
const res = await fetch('https://[project].supabase.co/functions/v1/batch-status?batch_id=1')
```

### 3.5 Supabase Realtime (Replaces WebSocket Server)

**No server to build.** Supabase Realtime uses PostgreSQL logical replication to broadcast row changes to subscribed clients.

**Setup:**

```sql
-- Enable replication on the table (Supabase Dashboard or SQL)
alter publication supabase_realtime add table batch_events;
alter publication supabase_realtime add table batches;
```

**Client-side subscription (Frontend Engineer's code):**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://[project].supabase.co',
  'public_anon_key'
)

// Subscribe to new claim events for a specific batch
const channel = supabase
  .channel('batch-updates')
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
        // Update claim progress bar
        updateClaimProgress(payload.new)
      }
    }
  )
  .subscribe()
```

**Realtime event flow:**
1. Edge Function inserts `batch_events` row
2. PG logical replication detects INSERT
3. Supabase Realtime broadcasts to all subscribed clients
4. Dashboard updates claim progress in real-time

**Free tier limits:** 200 concurrent connections, 2M messages/month — more than enough for hackathon demo.

### 3.6 Withdrawal Payload Encoder/Decoder (S1-012)

**Same as before** — this is a pure TypeScript utility, no server needed.

**File:** `packages/shared/src/payload.ts`

```typescript
interface WithdrawalPayload {
  batch_id: string;
  contract_address: string;
  token_address: string;
  employee_index: number;
  salary_amount: string;
  salary_amount_field: string;
  nullifier_secret: string;
  merkle_root: string;
  merkle_siblings: string[];
  merkle_path_indices: number[];
}

export function encodePayload(payload: WithdrawalPayload): string {
  const json = JSON.stringify(payload);
  return btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodePayload(b64: string): WithdrawalPayload {
  const json = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
}
```

### 3.7 Auditor CLI Tool (S2-003)

**Same as before** — standalone CLI tool, no server needed. Reads CSV and on-chain data directly.

### 3.8 Circuit JSON Serving

**Simplest approach:** Place the compiled circuit JSON in `frontend/public/circuits/payroll_withdrawal.json`

Cloudflare Pages serves it as a static asset with CDN caching:
```
https://zksdp.pages.dev/circuits/payroll_withdrawal.json
Cache-Control: public, max-age=3600, immutable
```

No API endpoint needed. Zero compute cost.

---

## 4. Data Privacy Rules

**🚫 NEVER store in Supabase:**
- Salary amounts (total_amount per batch is OK — it's on-chain)
- Nullifier secrets
- Employee wallet-to-salary mapping
- Withdrawal payload contents

**✅ OK to store in Supabase:**
- Merkle roots (public on-chain data)
- Batch metadata (batch_id, employer addr, total_amount)
- Claim events (nullifier hash, recipient, timestamp) — all public on-chain
- Circuit artifacts (public)

**Why total_amount is OK:** The `BatchCreated` event already publishes `total_amount` on-chain for solvency verification. Storing it in the DB doesn't change the privacy model.

---

## 5. Free Tier Budget

| Service | Component | Free Limit | Our Expected Usage |
|---------|-----------|------------|-------------------|
| **Cloudflare Pages** | Bandwidth | Unlimited | < 1 GB (demo) |
| **Cloudflare Pages** | Builds | 500/month | ~20 builds |
| **Cloudflare Pages** | Requests | 500 req/s | < 10 req/s |
| **Supabase** | PostgreSQL | 500 MB | < 50 MB |
| **Supabase** | Edge Functions | 500k invocations/month | ~86k (every 30s) |
| **Supabase** | Realtime | 200 connections, 2M msgs/mo | < 10 connections |
| **Supabase** | Storage | 1 GB | < 50 MB |

**All well within free limits for a hackathon MVP.**

---

## 6. Supabase Local Development

```bash
# Start local Supabase
supabase start

# Deploy Edge Functions
supabase functions deploy event-indexer --no-verify-jwt
supabase functions deploy batch-status --no-verify-jwt

# Apply migrations
supabase migration up

# Link remote project
supabase link --project-ref [your-project-ref]

# Set secrets
supabase secrets set PAYROLL_CONTRACT_ID=CCYF...
supabase secrets set STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

---

## 7. Dependencies & Timeline

```
Day 1-2                           Day 3-5                          Day 6-7
┌────────────────────┐           ┌────────────────────┐           ┌──────────────┐
│ Monorepo + Supabase│           │ Event Indexer EF   │           │ Audit CLI    │
│ project setup      │           │ Batch Status EF    │           │ Final testing│
│ DB schema design   │           │ Realtime channels  │           │              │
│ Payload encoder    │           │ Cron scheduling    │           │              │
└────────────────────┘           └────────────────────┘           └──────────────┘
```

**Cross-agent dependencies:**
- Contract address (Smart Contract Engineer) — needed for event indexer
- Realtime channel spec — coordinate with Frontend Engineer
- DB types — share with Frontend Engineer for Supabase client

---

## 8. Key References

| Resource | Link | Why |
|----------|------|-----|
| PRD §8.4 | `PRD.md#84-agent-layer-off-chain-typescript-service` | Event indexer spec |
| PRD §8.7 | `PRD.md#87-websocket-layer` | Realtime event patterns (now using Supabase) |
| PRD §9.2 | `PRD.md#92-off-chain-data-structures-employer-side` | Type definitions |
| PRD §9.3 | `PRD.md#93-soroban-events-schema` | Event schemas |
| FR-06 | `PRD.md#fr-06-audit-tools` | Auditor requirements |

**Supabase docs:**
- Edge Functions: `supabase.com/docs/guides/functions`
- Realtime: `supabase.com/docs/guides/realtime`
- Cron: `supabase.com/docs/guides/database/cron`

---

## 9. Open Questions for PM

| Question | Context | Decision Needed By | PM's Answer |
|----------|---------|-------------------|-------------|
| Realtime vs polling dashboard? | Realtime is free (Supabase), polling is simpler | Day 1 | **Realtime** — free and better UX |
| Edge Functions runtime? | Deno (default) vs Node.js (custom) | Day 1 | **Deno** — Supabase default, no extra config |
| DB index cleanup? | Nullifier audit grows unbounded | Day 3 | **TTL cleanup** — delete events > 30 days old |

---

## 10. Definition of Done Checklist

- [ ] Supabase project created and linked
- [ ] Database migrated (batches + batch_events tables)
- [ ] Event indexer Edge Function deployed and running on cron
- [ ] Batch status Edge Function returning correct data
- [ ] Realtime channel broadcasting new events
- [ ] Payload encoder/decoder round-trip verified
- [ ] Circuit JSON served as static file
- [ ] Auditor CLI tool working with testnet data
- [ ] No salary data in any database table
- [ ] Free tier budget verified (limits not exceeded)
- [ ] Supabase local development setup documented

---

## 11. Communication

- **Daily standup:** 9:30 AM Telegram
- **Supabase project URL:** Share with Frontend Engineer immediately (they need it for Realtime client)
- **DB schema changes:** Announce in Telegram before migrating production

---

*This hand-off document is your source of truth. If anything in the PRD contradicts this, raise it in standup.*

*Product Manager — ArbaLabs | June 2026*
