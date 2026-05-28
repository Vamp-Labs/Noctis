# Noctis Protocol — Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EMPLOYER                                      │
│  (Submits batch payroll via Passkey wallet or Freighter)            │
└──────────┬──────────────────────────────────────────┬────────────────┘
           │                                          │
           ▼                                          ▼
┌──────────────────────┐              ┌──────────────────────────────┐
│   wallet_factory     │              │    policy_signer             │
│  (Passkey registry)  │              │  (Spending limits, multi-sig)│
│                      │              │                              │
│  create_wallet()     │              │  create_policy()             │
│  verify_signature()  │              │  verify_spending_limit()     │
│  update_passkey()    │              │  revoke_policy()             │
└──────────────────────┘              └──────────────────────────────┘
           │                                          │
           └──────────┬───────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       payroll_dispatcher                             │
│  (Core orchestrator — ZK-private batch payroll)                     │
│                                                                      │
│  process_batch():                                                    │
│    1. Verify ZK proof (placeholder — see SEC-001-CRIT-001)          │
│    2. Check nullifiers (prevent double-spend)                        │
│    3. Verify Merkle root                                             │
│    4. Create internal streams for each employee                      │
│    5. Transfer employer tokens to contract                           │
│    6. Emit event                                                     │
│                                                                      │
│  claim_stream(): Withdraw accrued streaming payment                  │
│  pause/unpause(): Emergency admin controls                           │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│streaming_vault│ │   USDC   │ │ yield_router │
│(Per-second    │ │  (SEP-41)│ │ (Yield       │
│ stream engine)│ │  Token   │ │  routing)    │
│               │ │          │ │              │
│ create_stream │ │ transfer │ │ route_yield  │
│ claim_stream  │ │  ()      │ │ withdraw_yld │
│ cancel_stream │ │          │ │ register_src │
│ pause/resume  │ │          │ │ set_yld_splt │
└──────────────┘ └──────────┘ └──────────────┘
```

## Contract Dependencies

```
payroll_dispatcher ──depends-on──► token (USDC)
streaming_vault    ──depends-on──► token (USDC)
yield_router       ──depends-on──► token (USDC), external yield pools (Blend/Soroswap)
wallet_factory     ──standalone──► (no contract dependencies)
policy_signer      ──standalone──► (no contract dependencies)
```

## Data Flow — Batch Payroll

```
1. Employer prepares batch:
   - Recipient list (addresses, amounts, durations)
   - Merkle root computed off-chain
   - ZK proof generated off-chain (placeholder)
   - Nullifiers for privacy

2. Employer calls payroll_dispatcher.process_batch():
   - ZK proof verified (placeholder — format check)
   - Nullifiers checked (no double-spend)
   - Merkle root verified (on-chain computation)
   - Internal streams created per recipient
   - Tokens transferred from employer → contract

3. Employee calls payroll_dispatcher.claim_stream():
   - Accrued amount calculated (time-based)
   - Tokens transferred to employee
```

## Storage Model

Each contract uses Soroban's instance storage with `DataKey` enum variants:

- **payroll_dispatcher**: Admin, Paused, BatchCount, Batch(u32), BatchRoot(u32), Stream(u32,u32), NullifierSet(BytesN<32>), Token, TrustedSetupHash
- **streaming_vault**: Admin, StreamCount, Stream(u32), EmployeeStreams(Address), EmployerBalances(Address), Paused
- **wallet_factory**: Admin, WalletCount, Wallet(Address), OwnerByPubkey(BytesN<33>)
- **yield_router**: Admin, YieldSources, SourceAddress(Symbol), SourceRate(Symbol), EmployerAllocations(Address), TotalDeposited, Paused, YieldSplitConfig, PayrollDispatcher
- **policy_signer**: Admin, PolicyCount, Policy(String), EmployerPolicies(Address)

## Security Model

- **Authentication**: `Address::require_auth()` on all privileged functions
- **Authorization**: Admin stored per-contract, controlled by multi-sig
- **Pause mechanism**: Emergency pause/unpause on each contract (admin-only)
- **Nullifier system**: Prevents double-spend of ZK proofs (SHA256-based)
- **Stream accrual**: Time-based with pause tracking, capped at total_amount
- **Overflow protection**: `overflow-checks = true` in release profile, checked arithmetic throughout
- **ZK Privacy**: Groth16 on BLS12-381 (placeholder — see SEC-001-CRIT-001)

## Key Design Decisions

1. **Self-contained streams**: payroll_dispatcher creates streams internally rather than making cross-contract calls to streaming_vault (MVP simplification)
2. **Simulated yield routing**: yield_router tracks allocations but doesn't make external deposits (MVP)
3. **Passkey-first UX**: No seed phrases — WebAuthn-based wallets via wallet_factory
4. **Policy enforcement**: policy_signer provides optional multi-sig and spending limits
5. **No proxy/upgrade pattern**: Contracts are immutable. Upgrades require new deployment + migration.
