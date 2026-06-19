'use client'

import { useState } from 'react'

export default function AuditorPage() {
  const [batchId, setBatchId] = useState('')
  const [result, setResult] = useState<'match' | 'mismatch' | null>(null)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Auditor Tool</h1>
      <p className="text-white/60">
        Verify payroll batch integrity. Upload the employer&apos;s CSV and enter the batch ID
        to confirm the Merkle root matches on-chain state.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold">Batch ID</h2>
          <input
            type="text"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            placeholder="e.g. 1"
            className="w-full px-4 py-2 rounded-input bg-white/5 border border-white/10 font-mono text-sm focus:outline-none focus:border-primary/50"
          />
        </div>

        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold">Payroll CSV</h2>
          <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-primary/50 transition cursor-pointer">
            <p className="text-sm text-white/40">Drop CSV here</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setResult('match')}
        disabled={!batchId}
        className="w-full px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover transition disabled:opacity-50"
      >
        Verify Batch
      </button>

      {result === 'match' && (
        <div className="glass-card p-6 border border-success/30 space-y-3">
          <div className="flex items-center gap-2 text-success">
            <span className="text-2xl">✅</span>
            <span className="font-semibold">Root MATCH</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/40 mb-1">On-chain Root</p>
              <p className="font-mono text-xs">0x3a1b...ff</p>
            </div>
            <div>
              <p className="text-white/40 mb-1">Computed Root</p>
              <p className="font-mono text-xs">0x3a1b...ff</p>
            </div>
          </div>
        </div>
      )}

      {result === 'mismatch' && (
        <div className="glass-card p-6 border border-error/30 space-y-3">
          <div className="flex items-center gap-2 text-error">
            <span className="text-2xl">❌</span>
            <span className="font-semibold">Root MISMATCH</span>
          </div>
          <p className="text-sm text-white/60">The computed Merkle root does not match the on-chain value. The batch may be corrupted or the CSV does not match.</p>
        </div>
      )}
    </div>
  )
}
