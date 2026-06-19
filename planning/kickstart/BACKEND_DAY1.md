# Kickstart: Backend Engineer — Day 1
## ZK-SDP Development: First 24 Hours
### Start: Now | Deliverables by End of Day

---

## Your Day 1 Mission

**Set up Supabase infrastructure + build the tree builder + payload encoder.**

You're the foundation layer. By end of Day 1, the team has:
1. A running Supabase project with database schema
2. A Merkle tree builder that produces roots matching the Noir circuit
3. A working payload encoder/decoder

---

## Step 1: Create Supabase Project (20 min)

```bash
# 1. Go to https://supabase.com → Sign up (free tier)
# 2. Create new project: "zk-sdp"
# 3. Choose region closest to you
# 4. Save your database password
# 5. Wait for provisioning (~2 min)

# Install Supabase CLI
npm install -g supabase

# Initialize in monorepo
cd /path/to/zk-sdp
supabase init
supabase start  # Local development
```

**Copy these from Supabase Dashboard → Project Settings → API:**
```
Project URL:    https://[ref].supabase.co
Anon Key:       eyJ... (this is safe for public use)
Service Role:   eyJ... (KEEP PRIVATE — use only in Edge Functions)
```

## Step 2: Write Database Migration (30 min)

**File:** `supabase/migrations/00001_init.sql`

```sql
-- Enable pg_cron for scheduling
create extension if not exists pg_cron with schema extensions;

-- Batches table
create table batches (
  batch_id        bigint primary key,
  employer        text not null,
  merkle_root     text not null,
  token_address   text not null,
  total_amount    bigint not null,
  leaf_count      integer not null default 0,
  claimed_count   integer not null default 0,
  status          text not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Batch events table (one row per on-chain event)
create table batch_events (
  id              bigserial primary key,
  batch_id        bigint not null references batches(batch_id),
  event_type      text not null,
  nullifier_hash  text,
  recipient       text,
  ledger          bigint not null,
  timestamp       timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Indexes
create index idx_batch_events_batch_id on batch_events(batch_id);
create index idx_batch_events_nullifier on batch_events(nullifier_hash);

-- Enable Realtime
alter publication supabase_realtime add table batches;
alter publication supabase_realtime add table batch_events;

-- Indexer metadata
create table _indexer_meta (
  id            integer primary key default 1,
  last_ledger   bigint not null default 0
);
insert into _indexer_meta (id, last_ledger) values (1, 0);
```

```bash
# Apply migration
supabase migration up
```

## Step 3: Build Payload Encoder/Decoder (30 min)

**File:** `packages/shared/src/payload.ts`

```typescript
export interface WithdrawalPayload {
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
  try {
    const json = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json);
    // Validate required fields
    const required = ['batch_id', 'contract_address', 'salary_amount', 'nullifier_secret'];
    for (const field of required) {
      if (!payload[field]) throw new Error(`Missing field: ${field}`);
    }
    return payload;
  } catch (e) {
    throw new Error('Invalid payload format');
  }
}
```

## Step 4: Build Merkle Tree Builder (1 hour)

**File:** `packages/shared/src/tree-builder.ts`

```typescript
export interface PayrollRow {
  employee_index: number;
  wallet_address: string;
  salary_amount_usdc: number;
}

export interface LeafData {
  employee_index: number;
  wallet_address: string;
  salary_amount: bigint;
  nullifier_secret: Uint8Array;
  commitment: string;
  merkle_siblings: string[];
  merkle_path_indices: number[];
}

export interface TreeBuildResult {
  batch_id: string;
  merkle_root: string;
  total_amount: number;
  leaf_count: number;
  leaves: LeafData[];
}

export class PayrollTreeBuilder {
  private depth: number;

  constructor(depth: number = 16) {
    this.depth = depth;
  }

  async buildTree(rows: PayrollRow[]): Promise<TreeBuildResult> {
    // 1. Generate secure secrets
    // 2. Compute Poseidon2 commitment per leaf
    // 3. Build incremental Merkle tree
    // 4. Extract siblings + path indices per leaf
    // 5. Return TreeBuildResult
    
    // NOTE: Poseidon2 hash must EXACTLY match Noir circuit.
    // Use @noir-lang/noir_wasm for the hash function or
    // implement Poseidon2 per CAP-0075 spec.
    // Coordinate with Smart Contract Engineer on test vectors!
    
    throw new Error('Implement me — see PRD §8.4 for spec');
  }
}
```

**Critical requirement:** The tree builder must produce the **exact same Merkle root** as the Noir circuit for the same inputs. You'll need to:
1. Get a test vector from Smart Contract Engineer (they run `nargo execute` with known inputs)
2. Verify your output matches
3. Fix any hash discrepancies

## Step 5: Write Tests (30 min)

**File:** `packages/shared/src/__tests__/payload.test.ts`

```typescript
import { encodePayload, decodePayload, WithdrawalPayload } from '../payload';

const mockPayload: WithdrawalPayload = {
  batch_id: '1',
  contract_address: 'CCYF...',
  token_address: 'CBIEL...',
  employee_index: 0,
  salary_amount: '5000.00',
  salary_amount_field: '0x1234...',
  nullifier_secret: 'aabb...',
  merkle_root: '0xdead...',
  merkle_siblings: Array(16).fill('0x00'),
  merkle_path_indices: Array(16).fill(0),
};

test('payload round-trip', () => {
  const encoded = encodePayload(mockPayload);
  const decoded = decodePayload(encoded);
  expect(decoded.batch_id).toBe('1');
  expect(decoded.salary_amount).toBe('5000.00');
});

test('payload is URL-safe', () => {
  const encoded = encodePayload(mockPayload);
  expect(encoded).not.toContain('+');
  expect(encoded).not.toContain('/');
  expect(encoded.length).toBeLessThan(2000);
});

test('invalid payload throws', () => {
  expect(() => decodePayload('not-base64')).toThrow();
});
```

```bash
pnpm add -D vitest
pnpm vitest run
```

## Step 6: Share Your Output

By end of Day 1, post in Telegram #dev:

```
✅ Day 1 done — Backend
- Supabase project: https://[ref].supabase.co
- DB migrated: batches + batch_events tables, Realtime enabled
- Payload encode/decode: round-trip verified
- Tree builder: scaffold ready, waiting for circuit test vector
- Supabase URL + anon key shared with Frontend
```

---

## What NOT to Do on Day 1

- ❌ Don't write Edge Functions yet (need contract address from SC)
- ❌ Don't configure cron schedules yet (need Edge Functions first)
- ❌ Don't build the auditor CLI tool (Day 6+)
- ❌ Don't optimize for production

**Just Supabase infrastructure + shared utilities.**

---

## If You Get Stuck

| Problem | Try |
|---------|-----|
| Supabase CLI won't start | `supabase stop && supabase start`; check Docker is running |
| Migration fails | Check SQL syntax; verify table doesn't already exist |
| Payload too long for URL | Shorten field names; use single-letter keys in JSON + map on decode |
| Tree builder hash ≠ Noir hash | **Stop and coordinate with Smart Contract Engineer** — get their test vector |

**Escalate:** Tag @pm in Telegram if stuck > 30 min.

---

*Your full hand-off doc: `planning/handoffs/BACKEND_ENGINEER.md`*
