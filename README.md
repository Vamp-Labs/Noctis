# ZK-SDP: Zero-Knowledge Stellar Disbursement Protocol

**Confidential payroll on Stellar.** Privacy-preserving institutional payroll using Noir zero-knowledge proofs and Soroban smart contracts.

Built for [Stellar Hacks: Real-World ZK](https://dorahacks.io/hackathon/stellar-hacks-real-world-zk) — Protocol 26 (Yardstick).

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│               USER LAYER (Browser)                │
│  Employer Portal    Employee Withdrawal Portal    │
│  Next.js + React    Noir.js WASM Proof Generation │
│  Freighter Wallet   Freighter Wallet              │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│           PROOF GENERATION LAYER                   │
│  payroll_withdrawal.nr (Noir Circuit)              │
│  UltraHonk Backend via Barretenberg                │
│  Poseidon2 over BN254 scalar field                 │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│              SOROBAN CONTRACT LAYER                │
│  ConfidentialPayrollContract                       │
│    ├─ Merkle root storage                          │
│    ├─ Nullifier set (spent tracker)                │
│    ├─ Token pool (USDC escrow)                     │
│    └─ Calls UltraHonkVerifierContract.verify()     │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│           STELLAR PROTOCOL LAYER (P25 + P26)       │
│  BN254 host functions (CAP-0074)                    │
│  Poseidon2 host functions (CAP-0075)                │
│  BN254 MSM + scalar arithmetic (CAP-0080)           │
└──────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | Next.js 14 + Tailwind + Shadcn/UI | **$0** (Cloudflare Pages) |
| Backend | Supabase Edge Functions (Deno) | **$0** (free tier) |
| Database | Supabase PostgreSQL | **$0** (500MB free) |
| Realtime | Supabase Realtime (PG replication) | **$0** (200 connections) |
| Smart Contracts | Soroban (Rust) on Stellar Testnet | **$0** |
| ZK Circuits | Noir + UltraHonk | **$0** |
| Wallet | Freighter (browser extension) | **$0** |

## Quick Start

### Prerequisites

- Node.js >= 18, pnpm >= 9
- Rust + wasm32v1-none target (`rustup target add wasm32v1-none`)
- Noir >= 0.36.0 (`curl -L https://raw.githubusercontent.com/noir-lang/noir-releases/main/install.sh | bash`)
- Supabase CLI (`npm install -g supabase`)
- Stellar CLI (`cargo install stellar-cli`)

### Install

```bash
pnpm install
```

### Local Development

```bash
# Start Supabase locally
pnpm supabase:start

# Start frontend
cd frontend && pnpm dev

# Compile Noir circuit
pnpm circuit:compile

# Build Soroban contract
pnpm contract:build
```

### Deploy

```bash
# Frontend → Cloudflare Pages
cd frontend && pnpm pages:build && pnpm pages:deploy

# Edge Functions → Supabase
pnpm supabase:deploy:fns

# Soroban Contracts → Stellar Testnet
# See planning/handoffs/SMARTCONTRACT_ENGINEER.md
```

## Project Structure

```
zk-sdp/
├── contracts/                    # Soroban smart contracts (Rust)
│   └── confidential_payroll/     # Main payroll contract
├── circuits/                     # Noir ZK circuits
│   └── payroll_withdrawal/       # Salary withdrawal circuit
├── frontend/                     # Next.js web application
│   └── src/
│       ├── app/                  # Pages (employer, withdraw, auditor)
│       ├── components/           # React components
│       └── lib/                  # Wallet, Supabase, Stellar clients
├── supabase/                     # Supabase infrastructure
│   ├── functions/                # Edge Functions (event-indexer, batch-status)
│   └── migrations/               # Database schema
├── packages/
│   └── shared/                   # Shared TypeScript types and utilities
└── planning/                     # Product management docs
    ├── ROADMAP.md
    ├── handoffs/                  # Role-specific development guides
    ├── sprints/                   # Sprint plans
    └── kickstart/                 # Day 1 quick-start guides
```

## Documentation

All planning and specification documents are in `planning/`:

- [Development Flow](planning/DEVELOPMENT_FLOW.md) — Master execution plan
- [Product Roadmap](planning/ROADMAP.md) — Strategic timeline
- [Smart Contract Hand-off](planning/handoffs/SMARTCONTRACT_ENGINEER.md) — Circuits + contracts
- [Backend Hand-off](planning/handoffs/BACKEND_ENGINEER.md) — Supabase + Edge Functions
- [Frontend Hand-off](planning/handoffs/FRONTEND_ENGINEER.md) — Web app + proof generation
- [Launch Checklist](planning/LAUNCH_CHECKLIST.md) — Pre-submission readiness

## License

MIT — ArbaLabs 2026
