'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface BatchState {
  batch_id: number
  status: string
  claimed_count: number
  leaf_count: number
  total_amount: number
  merkle_root: string
}

export default function BatchDashboardPage() {
  const params = useParams()
  const batchId = params.id as string
  const [batch, setBatch] = useState<BatchState | null>(null)
  const [claims, setClaims] = useState<any[]>([])

  useEffect(() => {
    // Fetch batch state from Supabase Edge Function or direct DB
    async function load() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/batch-status?batch_id=${batchId}`
        )
        if (res.ok) {
          const data = await res.json()
          setBatch(data)
        }
      } catch {
        // Edge function not deployed yet; use mock
        setBatch({
          batch_id: Number(batchId),
          status: 'active',
          claimed_count: 7,
          leaf_count: 47,
          total_amount: 235000,
          merkle_root: '0x3a1b...ff',
        })
      }
    }
    load()

    // Subscribe to Realtime updates
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
            setBatch((prev) =>
              prev ? { ...prev, claimed_count: prev.claimed_count + 1 } : prev
            )
            setClaims((prev) => [payload.new, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [batchId])

  const progress = batch ? Math.round((batch.claimed_count / batch.leaf_count) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch #{batchId}</h1>
          <p className="text-sm text-white/40 mt-1">
            {batch?.status === 'active' ? '🟢 Active' : '🔴 Closed'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-full border border-white/20 text-sm hover:bg-white/5 transition">
            Copy Root Hash
          </button>
          <button className="px-4 py-2 rounded-full border border-white/20 text-sm hover:bg-white/5 transition">
            Export Report
          </button>
        </div>
      </div>

      {batch && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 uppercase tracking-wider">Total Locked</p>
              <p className="text-2xl font-bold text-success">${(batch.total_amount / 1000).toLocaleString()} USDC</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 uppercase tracking-wider">Employees</p>
              <p className="text-2xl font-bold">{batch.leaf_count}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 uppercase tracking-wider">Claimed</p>
              <p className="text-2xl font-bold">{batch.claimed_count} <span className="text-sm text-white/40">/ {batch.leaf_count}</span></p>
            </div>
          </div>

          <div className="glass-card p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Claim Progress</span>
              <span className="font-mono">{batch.claimed_count} / {batch.leaf_count} ({progress}%)</span>
            </div>
            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h2 className="font-semibold">Recent Claims</h2>
            {claims.length === 0 ? (
              <p className="text-sm text-white/40">No claims yet. Waiting for employees...</p>
            ) : (
              <div className="space-y-2">
                {claims.map((claim, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 text-sm">
                    <span className="font-mono text-xs">{claim.nullifier_hash?.slice(0, 20)}...</span>
                    <span className="text-white/40">{new Date(claim.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
