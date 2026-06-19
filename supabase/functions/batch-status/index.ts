// Batch Status API — Supabase Edge Function
// Returns current batch state from PostgreSQL.
//
// Usage: GET /functions/v1/batch-status?batch_id=1
//
// Environment variables:
//   SUPABASE_URL (auto-injected)
//   SUPABASE_ANON_KEY (auto-injected for public read)

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async (req) => {
  const url = new URL(req.url)
  const batchId = url.searchParams.get('batch_id')

  if (!batchId) {
    return new Response(JSON.stringify({ error: 'batch_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )

  const { data: batch, error } = await supabase
    .from('batches')
    .select('*')
    .eq('batch_id', parseInt(batchId))
    .single()

  if (error || !batch) {
    return new Response(JSON.stringify({ error: 'Batch not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(batch), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
