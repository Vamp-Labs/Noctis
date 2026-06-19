'use client'

import { useState } from 'react'
import { connectWallet, WalletState } from '@/lib/stellar'

export default function EmployerConnectPage() {
  const [wallet, setWallet] = useState<WalletState | null>(null)
  const [connecting, setConnecting] = useState(false)

  async function handleConnect() {
    setConnecting(true)
    try {
      const state = await connectWallet()
      setWallet(state)
    } catch (err) {
      console.error(err)
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      <h1 className="text-3xl font-bold">Connect Wallet</h1>
      <p className="text-white/60">
        Connect your Freighter wallet to start managing payroll batches.
        Make sure you&apos;re on the <strong>Stellar Testnet</strong>.
      </p>

      {!wallet?.connected ? (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full px-6 py-3 rounded-full bg-primary text-white font-semibold glow-purple hover:bg-primary-hover transition disabled:opacity-50"
        >
          {connecting ? 'Connecting...' : 'Connect Freighter'}
        </button>
      ) : (
        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-sm text-white/60">Connected</span>
          </div>
          <p className="font-mono text-sm break-all">{wallet.publicKey}</p>
          <p className="text-xs text-white/40">Network: {wallet.network}</p>
          <a
            href="/employer/batch/new"
            className="block text-center px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover transition mt-4"
          >
            Create New Payroll Batch
          </a>
        </div>
      )}
    </div>
  )
}
