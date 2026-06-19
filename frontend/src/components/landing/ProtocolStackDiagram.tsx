export function ProtocolStackDiagram() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Protocol Stack</h2>
      <div className="glass-card p-8 font-mono text-sm">
        <pre className="text-white/60 leading-relaxed overflow-x-auto">
{`┌─────────────────────────────────────────────┐
│           USER LAYER (Browser)               │
│  Employer Portal    Employee Portal          │
│  Next.js + React    Noir.js WASM Proof Gen   │
│  Freighter Wallet   Freighter Wallet         │
└───────────────────────┬─────────────────────┘
                        │
┌───────────────────────▼─────────────────────┐
│         PROOF GENERATION LAYER               │
│  payrolL_withdrawal.nr (Noir Circuit)        │
│  UltraHonk Backend via Barretenberg          │
│  Poseidon2 over BN254 scalar field           │
└───────────────────────┬─────────────────────┘
                        │
┌───────────────────────▼─────────────────────┐
│           SOROBAN CONTRACT LAYER              │
│  ConfidentialPayrollContract                  │
│    ├─ Merkle root storage                     │
│    ├─ Nullifier set (spent tracker)           │
│    ├─ Token pool (USDC escrow)                │
│    └─ Calls UltraHonkVerifierContract         │
└───────────────────────┬─────────────────────┘
                        │
┌───────────────────────▼─────────────────────┐
│          STELLAR PROTOCOL LAYER               │
│  BN254 host functions (CAP-0074)              │
│  Poseidon2 host functions (CAP-0075)          │
│  BN254 MSM + scalar arithmetic (CAP-0080)     │
│  Protocol 26 (Yardstick)                      │
└─────────────────────────────────────────────┘`}
        </pre>
      </div>
    </section>
  )
}
