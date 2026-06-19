-- ZK-SDP Database Schema
-- Stores only public on-chain metadata. No salary amounts or secrets.

-- Enable pg_cron for scheduling Edge Functions
create extension if not exists pg_cron with schema extensions;

-- Batches: one row per payroll batch
create table batches (
  batch_id        bigint primary key,
  employer        text not null,
  merkle_root     text not null,
  token_address   text not null,
  total_amount    bigint not null,
  leaf_count      integer not null default 0,
  claimed_count   integer not null default 0,
  status          text not null default 'active' check (status in ('active', 'closed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Batch events: one row per on-chain event
create table batch_events (
  id              bigserial primary key,
  batch_id        bigint not null references batches(batch_id),
  event_type      text not null check (event_type in ('BatchCreated', 'Withdrawn')),
  nullifier_hash  text,
  recipient       text,
  ledger          bigint not null,
  timestamp       timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Indexes for fast lookups
create index idx_batch_events_batch_id on batch_events(batch_id);
create index idx_batch_events_nullifier on batch_events(nullifier_hash);
create index idx_batches_status on batches(status);

-- Enable Realtime for live dashboard updates
alter publication supabase_realtime add table batches;
alter publication supabase_realtime add table batch_events;

-- Indexer metadata: tracks last processed ledger
create table _indexer_meta (
  id            integer primary key default 1,
  last_ledger   bigint not null default 0
);
insert into _indexer_meta (id, last_ledger) values (1, 0);

-- Helper function: increment claimed count
create or replace function increment_claimed(p_batch_id bigint)
returns void
language plpgsql
as $$
begin
  update batches
  set claimed_count = claimed_count + 1, updated_at = now()
  where batch_id = p_batch_id;
end;
$$;
