'use client'

import { useState } from 'react'

interface PayrollRow {
  employee_index: number
  wallet_address: string
  salary_amount_usdc: number
}

export default function NewBatchPage() {
  const [rows, setRows] = useState<PayrollRow[]>([])
  const [showSalaries, setShowSalaries] = useState(true)
  const [step, setStep] = useState<'upload' | 'tree' | 'deposit' | 'export'>('upload')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-2 text-sm text-white/40">
        {['Upload CSV', 'Build Tree', 'Deposit', 'Export'].map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === ['upload', 'tree', 'deposit', 'export'][i]
                ? 'bg-primary text-white'
                : 'bg-white/10 text-white/40'
            }`}>
              {i + 1}
            </span>
            {s}
            {i < 3 && <span className="text-white/20">—</span>}
          </span>
        ))}
      </div>

      <h1 className="text-3xl font-bold">Create Payroll Batch</h1>

      {step === 'upload' && (
        <div className="glass-card p-8 space-y-6">
          <div className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-primary/50 transition cursor-pointer">
            <p className="text-white/40 text-lg mb-2">Drop your CSV here</p>
            <p className="text-sm text-white/20">or click to browse</p>
          </div>

          <div className="text-sm text-white/40 space-y-1">
            <p>Expected CSV format:</p>
            <code className="block bg-black/30 p-3 rounded-lg font-mono text-xs">
              employee_index,wallet_address,salary_amount_usdc{'\n'}
              0,GDQJUTYK2MQX2CLIS73IFRGT34NKQFZQWM...,5000.00{'\n'}
              1,GBQX...,3500.00
            </code>
          </div>

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">{rows.length} employees · ${rows.reduce((a, r) => a + r.salary_amount_usdc, 0).toLocaleString()} total</p>
                <button
                  onClick={() => setShowSalaries(!showSalaries)}
                  className="text-xs text-white/40 hover:text-white transition"
                >
                  {showSalaries ? 'Hide' : 'Show'} Salaries
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/40 text-left">
                      <th className="p-2">#</th>
                      <th className="p-2">Wallet</th>
                      <th className="p-2">{showSalaries ? 'Salary' : '***'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row) => (
                      <tr key={row.employee_index} className="border-t border-white/5">
                        <td className="p-2 font-mono text-xs">{row.employee_index}</td>
                        <td className="p-2 font-mono text-xs">{row.wallet_address.slice(0, 12)}...</td>
                        <td className="p-2">{showSalaries ? `$${row.salary_amount_usdc.toFixed(2)}` : '***'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep('tree')}
            disabled={rows.length === 0}
            className="w-full px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover transition disabled:opacity-50"
          >
            Continue to Build Tree
          </button>
        </div>
      )}

      {step === 'tree' && (
        <div className="glass-card p-8 space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-lg">Building commitment tree...</p>
          <p className="text-sm text-white/40">Computing Poseidon2 hashes for {rows.length} employees</p>
        </div>
      )}

      {step === 'deposit' && (
        <div className="glass-card p-8 space-y-6">
          <h2 className="text-xl font-semibold">Confirm Deposit</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Total Amount</span>
              <span className="font-mono">${rows.reduce((a, r) => a + r.salary_amount_usdc, 0).toLocaleString()} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Employees</span>
              <span>{rows.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Merkle Root</span>
              <span className="font-mono text-xs">0x3a1b...ff</span>
            </div>
          </div>
          <button className="w-full px-6 py-3 rounded-full bg-primary text-white font-semibold glow-purple hover:bg-primary-hover transition">
            Sign & Deposit with Freighter
          </button>
        </div>
      )}

      {step === 'export' && (
        <div className="glass-card p-8 space-y-6 text-center">
          <p className="text-4xl">🔗</p>
          <h2 className="text-xl font-semibold">Batch Created!</h2>
          <p className="text-sm text-white/60">Download employee claim links to distribute them securely.</p>
          <div className="flex gap-3 justify-center">
            <button className="px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover transition">
              Download Secrets CSV
            </button>
            <a
              href="/employer/batch/1"
              className="px-6 py-3 rounded-full border border-white/20 text-white font-semibold hover:bg-white/5 transition"
            >
              View Dashboard
            </a>
          </div>
          <p className="text-xs text-warning">⚠️ These secrets cannot be recovered. Download now.</p>
        </div>
      )}
    </div>
  )
}
