// Soroban Event Indexer — Supabase Edge Function
// Polls Stellar testnet for contract events and stores them in PostgreSQL.
// Runs every 30 seconds via cron schedule.
//
// Environment variables:
//   SUPABASE_URL (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected)
//   PAYROLL_CONTRACT_ID — address of ConfidentialPayrollContract

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const PAYROLL_CONTRACT_ID = Deno.env.get('PAYROLL_CONTRACT_ID') || ''
const RPC_URL = 'https://soroban-testnet.stellar.org'

interface SorobanEvent {
  type: string
  ledger: number
  topic: string[]
  data: any
}

serve(async (_req) => {
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

  // 2. Poll Soroban RPC
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
          contractIds: [PAYROLL_CONTRACT_ID],
          topics: [['*']],
        }],
        pagination: { limit: 100 },
      },
    }),
  })

  const { result } = await response.json()
  if (!result?.events?.length) {
    return new Response('No new events')
  }

  // 3. Process events
  for (const event of result.events) {
    const topic0 = event.topic[0]

    if (topic0 === 'BatchCreated') {
      const batchId = parseInt(event.topic[1])

      await supabase.from('batches').upsert({
        batch_id: batchId,
        employer: event.data.employer,
        merkle_root: event.data.merkle_root,
        total_amount: Number(event.data.total_amount),
        leaf_count: event.data.leaf_count || 0,
        status: 'active',
      })

      await supabase.from('batch_events').insert({
        batch_id: batchId,
        event_type: 'BatchCreated',
        ledger: event.ledger,
        timestamp: new Date().toISOString(),
      })
    }

    if (topic0 === 'Withdrawn') {
      const nullifierHash = event.topic[1]
      const batchId = event.data.batch_id || 0

      await supabase.rpc('increment_claimed', { p_batch_id: batchId })

      await supabase.from('batch_events').insert({
        batch_id: batchId,
        event_type: 'Withdrawn',
        nullifier_hash: nullifierHash,
        recipient: event.data.recipient,
        ledger: event.ledger,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // 4. Update last processed ledger
  const maxLedger = Math.max(...result.events.map((e: SorobanEvent) => e.ledger))
  await supabase
    .from('_indexer_meta')
    .upsert({ id: 1, last_ledger: maxLedger })

  return new Response(`Processed ${result.events.length} events`)
})
