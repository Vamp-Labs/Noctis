'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { connectWallet, WalletState } from '@/lib/stellar'

type ProofStatus = 'idle' | 'loading_circuit' | 'constructing_witness' | 'proving' | 'done' | 'error'

const stepLabels = ['Loading circuit...', 'Constructing witness...', 'Proving...', 'Done!'] as const

export default function WithdrawPage() {
  const params = useParams()
  const payloadB64 = params.payload_b64 as string
  const [wallet, setWallet] = useState<WalletState | null>(null)
  const [proofStatus, setProofStatus] = useState<ProofStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Decode payload
  const payload = (() => {
    try {
      if (!payloadB64 || payloadB64 === 'payload_b64') return null
      const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
      return JSON.parse(json)
    } catch {
      return null
    }
  })()

  const stepIndex = ['idle', 'loading_circuit', 'constructing_witness', 'proving', 'done'].indexOf(proofStatus)
  const currentStep = Math.max(0, stepIndex - 1) // -1 for idle

  async function handleGenerateProof() {
    setProofStatus('loading_circuit')
    setError(null)

    try {
      // Simulate proof generation stages
      await delay(2000)
      setProofStatus('constructing_witness')

      await delay(3000)
      setProofStatus('proving')

      await delay(5000)
      setProofStatus('done')
    } catch (err: any) {
      setError(err.message || 'Proof generation failed')
      setProofStatus('error')
    }
  }

  async function handleWithdraw() {
    // TODO: Construct withdraw() tx and sign with Freighter
    setTxHash('0x0000000000000000000000000000000000000000000000000000000')
  }

  if (!payload) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-6xl">🔗</p>
        <h1 className="text-2xl font-bold">Invalid Withdrawal Link</h1>
        <p className="text-white/60">
          This link is invalid or expired. Contact your employer for a new withdrawal link.
        </p>
        <a href="/" className="inline-block px-6 py-3 rounded-full border border-white/20 hover:bg-white/5 transition">
          Go Home
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-8">
      <div className="glass-card p-8 space-y-6 text-center">
        <p className="text-5xl">💰</p>
        <h1 className="text-3xl font-bold">
          ${payload.salary_amount || '—'} USDC
        </h1>
        <p className="text-white/60">Ready to claim</p>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h2 className="font-semibold">1. Connect Wallet</h2>
        {!wallet?.connected ? (
          <button
            onClick={async () => setWallet(await connectWallet())}
            className="w-full px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover transition"
          >
            Connect Freighter
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="font-mono">{wallet.publicKey?.slice(0, 12)}...</span>
          </div>
        )}
      </div>

      {wallet?.connected && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold">2. Generate Private Proof</h2>

          {proofStatus === 'idle' && (
            <button
              onClick={handleGenerateProof}
              className="w-full px-6 py-3 rounded-full bg-primary text-white font-semibold glow-purple hover:bg-primary-hover transition"
            >
              Generate Proof
            </button>
          )}

          {(proofStatus === 'loading_circuit' || proofStatus === 'constructing_witness' || proofStatus === 'proving') && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              <div className="space-y-2">
                {stepLabels.map((label, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      i <= currentStep ? 'bg-primary text-white' : 'bg-white/10 text-white/40'
                    }`}>
                      {i < currentStep ? '✓' : i === currentStep ? '●' : '○'}
                    </span>
                    <span className={i <= currentStep ? 'text-white' : 'text-white/40'}>{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/40">Your proof is generated locally. No data leaves your browser.</p>
            </div>
          )}

          {proofStatus === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-success">
                <span>✅</span>
                <span className="font-semibold">Proof generated successfully!</span>
              </div>
              <button
                onClick={handleWithdraw}
                className="w-full px-6 py-3 rounded-full bg-primary text-white font-semibold glow-purple hover:bg-primary-hover transition"
              >
                Claim ${payload.salary_amount || '—'} USDC
              </button>
            </div>
          )}

          {proofStatus === 'error' && (
            <div className="text-center space-y-3">
              <p className="text-error">{error || 'Something went wrong'}</p>
              <button
                onClick={handleGenerateProof}
                className="px-6 py-2 rounded-full border border-white/20 hover:bg-white/5 transition"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {txHash && (
        <div className="glass-card p-6 space-y-4 text-center">
          <p className="text-4xl">🎉</p>
          <h2 className="text-xl font-bold">Payment Received!</h2>
          <p className="text-sm font-mono text-white/40 break-all">{txHash}</p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-secondary hover:underline"
          >
            View on Stellar Expert →
          </a>
        </div>
      )}
    </div>
  )
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
