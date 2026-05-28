# FRONTEND ENGINEER — Remaining Work Handoff

**12 Tasks | Est. 3-4 weeks | Priority: P0–P2**

---

## TASK 1: 🔴 Network Guard Against Mainnet
**Priority:** 🔴 P0 | **Effort:** 30 min | **Status:** ❌ MISSING

### Current State
`STELLAR_NETWORK` constant defined in `types/index.ts` but used only for passphrase/RPC/faucet URLs. **No runtime enforcement.** If someone changes the RPC URL to a mainnet endpoint, transactions will be submitted to mainnet.

### Requirements
Add a runtime guard in `stellar.ts` `writeWithFreighter()` that checks the network passphrase BEFORE any transaction submission.

```typescript
// In writeWithFreighter(), before any tx submission:
if (this.networkPassphrase !== "Test SDF Network ; September 2015") {
  throw new Error("MAINNET BLOCKED: This application is testnet-only. Set STELLAR_NETWORK=TESTNET.");
}
```

Also add the same check in `simulate()` for read operations.

### File
`frontend/src/lib/stellar.ts`

### Acceptance Criteria
- [ ] `writeWithFreighter()` throws if passphrase !== testnet
- [ ] `simulate()` throws if passphrase !== testnet
- [ ] Error message is clear and actionable
- [ ] Normal testnet operations unaffected

---

## TASK 2: 🔴 Fix SHA-256 → Poseidon Hash Mismatch
**Priority:** 🔴 P0 | **Effort:** 1 day | **Status:** ⚠️ BROKEN

### Current State
- `zk.ts::buildMerkleTree()` uses `crypto.subtle.digest("SHA-256")`
- `circuits/payroll_circuit.circom` uses **Poseidon** hash
- Roots will NEVER match — proofs are structurally invalid
- `circomlibjs` (Poseidon WASM for browser) is **NOT** in `package.json`

### Requirements
1. Add `circomlibjs` to `package.json` dependencies
2. Replace all SHA-256 calls in `buildMerkleTree()` with `circomlibjs.poseidon()`
3. Update `computeNullifier()` to use Poseidon instead of SHA-256
4. Ensure Poseidon implementation matches the Circom circuit's Poseidon configuration

### Reference
- zk.ts: `frontend/src/lib/zk.ts` lines 82-182 (`buildMerkleTree`), 193-208 (`computeNullifier`)
- Circuit: `circuits/payroll_circuit.circom` (uses `circomlib-poseidon` templates)
- Circomlibjs Poseidon: `import { buildPoseidon } from "circomlibjs"`

### Acceptance Criteria
- [ ] `circomlibjs` installed in frontend dependencies
- [ ] Merkle tree built with Poseidon hash
- [ ] Nullifiers computed with Poseidon hash
- [ ] Roots match what the Circom circuit would produce

---

## TASK 3: 🔴 Fix `toBytes()` — Real snarkjs Proof Serialization
**Priority:** 🔴 P0 | **Effort:** 2 hours | **Status:** ⚠️ BROKEN

### Current State
```typescript
const toBytes = (): Uint8Array => {
    return new Uint8Array(192);  // always returns zeros!
};
```
Even when snarkjs generates a real proof, serialization returns all zeros.

### Requirements
Implement proper serialization from snarkjs proof format to Soroban 192-byte format:
```
π_A: G1 compressed — 48 bytes
π_B: G2 compressed — 96 bytes  
π_C: G1 compressed — 48 bytes
```
Total: 192 bytes.

The snarkjs proof object has `proof.pi_a`, `proof.pi_b`, `proof.pi_c` as arrays of strings in affine coordinates. These need to be converted to compressed BLS12-381 points.

### File
`frontend/src/lib/zk.ts` lines 287-291

### Acceptance Criteria
- [ ] `toBytes()` returns properly formatted 192-byte Uint8Array
- [ ] Format matches what the contract's `verify_zk_proof_internal()` expects
- [ ] Round-trip test: snarkjs proof → toBytes → contract verification (once T1 of Smart Contract Engineer is done)

---

## TASK 4: 🟡 Wire Employer Page to `processPayrollBatch()`
**Priority:** 🟡 P1 | **Effort:** 2 hours | **Status:** ⚠️ BYPASSED

### Current State
`employer/page.tsx` lines 305-326 builds a **zeroed Merkle root** and **hardcoded 192-byte magic proof** inline. Nullifiers are `Date.now()`-based. The entire `zk.ts` module is bypassed.

```typescript
const commitmentRoot = new Uint8Array(32); // all zeros
const zkProof = new Uint8Array(192); // magic bytes
const nullifier = new Uint8Array(32); // timestamp-based
```

### Requirements
Replace inline hardcoded values with a call to `zk.ts::processPayrollBatch()`:
1. Parse the payroll CSV into `PayrollRecipient[]`
2. Call `processPayrollBatch()` to get real Merkle root + proof + nullifiers
3. Submit to `PayrollDispatcherClient.processBatch()`

### Files
- `frontend/src/app/employer/page.tsx` lines 300-330
- `frontend/src/lib/zk.ts` (the `processPayrollBatch` function)

### Acceptance Criteria
- [ ] Employer payroll submission calls `processPayrollBatch()` from `zk.ts`
- [ ] Merkle root is computed (not zeroed)
- [ ] Proof is generated (not hardcoded magic bytes)
- [ ] Nullifiers are cryptographic (not timestamp-based)
- [ ] Works with contract's current stub (mock proof) AND real verification (after T1 of Smart Contract Engineer)

---

## TASK 5: 🟡 Fix `hashPair()` Dead Code
**Priority:** 🟡 P1 | **Effort:** 15 min | **Status:** ⚠️ BROKEN

### Current State
```typescript
export async function hashPair(
  left: Uint8Array,
  right: Uint8Array
): Promise<Uint8Array> {
  let error = null;
  try {
    if (crypto.subtle) {
      // This path is unreachable due to null assignment below
    }
  } catch (e) {
    error = e;
  }
  // Both branches assign null — always throws
  if (crypto.subtle) { return null as unknown as Uint8Array; }
  throw new Error("...");
}
```

### Requirements
Option A: Implement properly with Poseidon:
```typescript
import { buildPoseidon } from "circomlibjs";
const poseidon = await buildPoseidon();
const hash = poseidon([left, right]);
return new Uint8Array(poseidon.F.toObject(hash).toString(16).padStart(64, '0'), 'hex');
```

Option B: Remove the function entirely (it's dead code — `buildMerkleTree()` does its own hashing inline).

### File
`frontend/src/lib/zk.ts` lines 60-73

### Acceptance Criteria
- [ ] `hashPair()` no longer throws when called
- [ ] OR function is removed and all callers updated

---

## TASK 6: 🟡 Build Policy Creation UI
**Priority:** 🟡 P1 | **Effort:** 1-2 days | **Status:** ❌ MISSING

### Current State
- `PolicySignerClient.createPolicy()` exists and works
- But there is **zero UI form** to call it
- Employer page says: "Use Stellar Laboratory or CLI for advanced configuration"

### Requirements
Build a policy creation form in the employer dashboard with:
1. Policy name (text input)
2. Policy type selector (SpendingLimit | Allowlist | MultiSig | Timelock)
3. Max amount per transaction (i128 input)
4. Period limit + period seconds
5. Allowed tokens list (address input + add/remove)
6. Required signers count
7. Authorized signers list (address input + add/remove)
8. Validation before submit
9. Success/error feedback

### File
`frontend/src/app/employer/page.tsx` (add new section or modal)

### Acceptance Criteria
- [ ] Policy creation form exists with all fields
- [ ] Form validates inputs before submitting
- [ ] `createPolicy()` write call works via Freighter
- [ ] Newly created policy appears in the policies list
- [ ] Error handling for rejected transactions

---

## TASK 7: 🟡 Add Yield Write Methods to Client
**Priority:** 🟡 P1 | **Effort:** 1 day | **Status:** ❌ MISSING

### Current State
`YieldRouterClient` has **zero write methods** — only reads:
- `getSources()` ✅
- `getYieldRate()` ✅
- `getYieldSplit()` ✅
- `getEmployerAllocation()` ✅
- `getTotalDeposited()` ✅

### Requirements
Add write methods:
1. `depositIdle(employer, token, amount)` — calls `yield_router.route_yield()`
2. `withdrawYield(employer, token)` — calls `yield_router.withdraw_yield()`

### File
`frontend/src/lib/contracts/yieldRouter.ts`

### Acceptance Criteria
- [ ] `depositIdle()` calls `route_yield` on contract
- [ ] `withdrawYield()` calls `withdraw_yield` on contract
- [ ] Methods use `writeWithFreighter()` for signing
- [ ] Error handling for failed transactions

---

## TASK 8: 🟢 Add APY Display in Employer Dashboard
**Priority:** 🟢 P2 | **Effort:** 2-3 hours | **Status:** ❌ MISSING

### Current State
Yield data is loaded via RPC reads but **never displayed** in any UI component.

### Requirements
Add yield section to employer dashboard:
1. Show registered yield sources with APY
2. Show employer's total allocated capital
3. Show accumulated yield (total vs claimed)
4. Add "Withdraw Yield" button (calls `withdrawYield`)
5. Show yield split breakdown (employer/employee/protocol)

### File
`frontend/src/app/employer/page.tsx`

### Acceptance Criteria
- [ ] Yield sources visible in employer dashboard
- [ ] APY rates displayed
- [ ] Allocation amounts visible
- [ ] "Withdraw Yield" button functional
- [ ] Clean loading/empty/error states

---

## TASK 9: 🟢 Wire Passkey Wallet Deployment
**Priority:** 🟢 P2 | **Effort:** 1-2 days | **Status:** ❌ MISSING

### Current State
- `passkey-kit` npm package IS in dependencies (v0.2.0)
- `WalletFactoryClient.createWallet()` exists
- `useWallet.ts` attempts `import("passkey-kit")` but falls back to simulated keys `"simulated_pubkey_for_dev_1234567890"`
- **No UI flow calls `createWallet()`**

### Requirements
1. Wire passkey registration to `WalletFactoryClient.createWallet()`
2. After successful passkey creation, store wallet ID in session
3. Handle fallback gracefully when passkey-kit fails

### Files
- `frontend/src/lib/hooks/useWallet.ts`
- `frontend/src/components/WalletConnect.tsx`
- `frontend/src/app/page.tsx`

### Acceptance Criteria
- [ ] Passkey registration creates a wallet on-chain
- [ ] Wallet ID persisted across sessions
- [ ] Fallback to simulation when passkey-kit unavailable
- [ ] Error handling for failed wallet creation

---

## TASK 10: 🟢 Run Circuit Build Script & Bundle Artifacts
**Priority:** 🟢 P2 | **Effort:** 1-2 hours | **Status:** ❌ MISSING

### Current State
`circuits/build.sh` has **never been executed**. No `.zkey`, `.wasm`, or `.ptau` files exist in `frontend/public/circuits/`.

### Requirements
1. Install circom and snarkjs system dependencies
2. Run `circuits/build.sh` (may need adjustments for your environment)
3. Copy output `.zkey` and `.wasm` files to `frontend/public/circuits/`
4. Verify `zk.ts` can load them

### Acceptance Criteria
- [ ] `build.sh` completes successfully
- [ ] Circuit artifacts in `frontend/public/circuits/`
- [ ] `zk.ts` can load and instantiate the proving key

---

## TASK 11: 🟢 Add Push Notification Placeholder
**Priority:** 🟢 P2 | **Effort:** 1 hour | **Status:** ❌ MISSING

### Requirements
Add notification toast/banner system to employee portal:
- Show "New stream created" notification
- Show "Salary accrued" status
- Placeholder for future push notification integration

### File
`frontend/src/app/employee/page.tsx`

### Acceptance Criteria
- [ ] In-app notification for new streams
- [ ] Claim success/failure feedback
- [ ] Clean dismissal

---

## TASK 12: 🟢 Session State Hardening
**Priority:** 🟢 P2 | **Effort:** 1 hour | **Status:** ⚠️ BASIC

### Current State
Wallet state stored in `sessionStorage`. No encryption, no expiry, no validation.

### Requirements
1. Validate stored address format before use
2. Clear session on network mismatch
3. Add session expiry (24 hours)

### File
`frontend/src/lib/hooks/useWallet.ts`

### Acceptance Criteria
- [ ] Invalid session data rejected gracefully
- [ ] Network change clears session
- [ ] Session expires after 24 hours

---

## Task Priority & Sequence

```
WEEK 1                      WEEK 2                      WEEK 3
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ T1: Network guard│   │ T4: Employer     │   │ T9: Passkey      │
│ T2: Poseidon fix │   │     → zk.ts wire │   │     deployment   │
│ T3: toBytes()    │   │ T6: Policy UI    │   │ T10: Circuit     │
│ T5: hashPair()   │   │ T7: Yield writes │   │      build       │
└──────────────────┘   │ T8: APY display  │   │ T11: Notif       │
                       └──────────────────┘   │ T12: Session     │
                                              └──────────────────┘
```

## Files You'll Modify

| File | Tasks |
|------|-------|
| `frontend/src/lib/stellar.ts` | T1 (network guard) |
| `frontend/src/lib/zk.ts` | T2 (Poseidon), T3 (toBytes), T5 (hashPair) |
| `frontend/src/app/employer/page.tsx` | T4 (wiring), T6 (policy UI), T8 (APY) |
| `frontend/src/lib/contracts/yieldRouter.ts` | T7 (write methods) |
| `frontend/src/lib/hooks/useWallet.ts` | T9 (passkey), T12 (session) |
| `frontend/src/components/WalletConnect.tsx` | T9 (passkey) |
| `frontend/src/app/employee/page.tsx` | T11 (notifications) |
| `frontend/package.json` | T2 (circomlibjs dep) |
| `frontend/public/circuits/` | T10 (new files) |
