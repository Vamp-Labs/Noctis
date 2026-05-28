# SMART CONTRACT ENGINEER — Remaining Work Handoff

**6 Tasks | Est. 4-5 weeks | Priority: P0–P2**

---

## TASK 1: CRITICAL-001 — Real Groth16 BLS12-381 Verification
**Priority:** 🔴 P0 | **Effort:** 2-3 weeks | **Status:** ⚠️ STUB

### Current State
`verify_zk_proof_internal()` in `payroll_dispatcher/src/lib.rs` (lines 414-471) only checks:
- Proof length = 192 bytes
- Commitment root ≠ zero
- π_A / π_B / π_C slice lengths

**No cryptographic verification occurs.** The trusted setup hash is fetched but discarded (`_trusted_hash`).

### Requirements
Replace the stub with real Groth16 verification using Stellar Protocol 26 BLS12-381 host functions:

1. **Parse proof components** from 192-byte format:
   - `π_A`: G1 compressed, bytes [0..48)
   - `π_B`: G2 compressed, bytes [48..144)
   - `π_C`: G1 compressed, bytes [144..192)

2. **Load verification key** from `DataKey::TrustedSetupHash` — deserialize VK_G1_A, VK_G2_B, VK_G1_C

3. **Compute Fiat-Shamir challenge**: `e = hash(public_inputs || proof)` using `env.crypto().sha256()`

4. **Execute pairing check**:
   ```
   e(π_A, VK_B) * e(VK_A, π_B) * e(π_C, VK_C) == 1
   ```
   Using `env.bls12_381_pairing()` or equivalent host functions

5. **Bind public input**: Verify `commitment_root` matches the public input signal

6. **Bind trusted setup hash**: Compare proof's verification key hash against stored `DataKey::TrustedSetupHash`

### Testnet Availability
✅ **Available** — Protocol 25 "X-Ray" BLS12-381 host functions are live on testnet since January 2026.

### Reference
- Contract file: `crates/payroll_dispatcher/src/lib.rs` lines 414-471
- SEC-001 audit finding: `CRITICAL-001`
- Circuit: `circuits/payroll_circuit.circom` (Poseidon-based, tree depth 20, batch size 100)
- Frontend zk.ts: `frontend/src/lib/zk.ts` (proof generation scaffold, will need alignment)

### Acceptance Criteria
- [ ] Contract calls real BLS12-381 pairing host functions
- [ ] Real Groth16 proof returns `true`, fake proof returns `false`
- [ ] Trusted setup hash mismatch rejects proofs
- [ ] Commitment root mismatch rejects proofs
- [ ] All existing tests still pass (42/42)
- [ ] E2E test updated to use real proof (not mock)

---

## TASK 2: Yield Router `deposit_to_source()` — REAL IMPLEMENTATION
**Priority:** 🔴 P0 | **Effort:** 1-2 weeks | **Status:** ⚠️ EMPTY PLACEHOLDER

### Current State
```rust
fn deposit_to_source(_env: &Env, _source: &Address, _token: &Address, _amount: &i128) {
    // Placeholder for external contract integration
}
```
Body is completely empty. No approval, no cross-contract call, no event.

### Requirements
1. **Approve token spend**: Call `token::Client::approve(source, amount)` to allow the yield source to pull tokens
2. **Deposit to yield source**: Use `env.invoke_contract()` to call the external protocol's deposit function
3. **Handle errors**: Return `Result` instead of `()` so callers can detect failures
4. **Emit event** on successful deposit

### Testnet Availability
✅ **Available** — Blend Protocol testnet pools are live. Soroswap testnet is live.

### Reference
- Contract file: `crates/yield_router/src/lib.rs` lines 278-287
- Called from: `route_yield()` at line 246
- SEC-001 audit finding: `INFO-001`

### Acceptance Criteria
- [ ] `deposit_to_source()` performs real cross-contract deposit OR returns clear error
- [ ] Tokens are approved before deposit
- [ ] Function returns `Result<(), Error>` instead of `()`
- [ ] Event emitted on successful deposit
- [ ] All existing tests pass

---

## TASK 3: Yield Router `calculate_accrued_yield()` — TIME-AWARE
**Priority:** 🟡 P1 | **Effort:** 1 hour | **Status:** ⚠️ SIMULATED (TIME-IGNORANT)

### Current State
Lines 403-405:
```rust
let now = env.ledger().timestamp();
let _elapsed = now;  // Simplified for MVP
```
`_elapsed` is computed but **never used** in the yield formula. Yield always returns as if 1 year has passed.

### Requirements
Minimal change: use `_elapsed` to pro-rate the simulated yield:
```rust
let time_factor = (_elapsed as i128).min(31536000); // cap at 1 year
let simulated_yield = allocation.total_principal * (avg_rate_bps as i128) * time_factor / 10000 / 31536000;
```

### Acceptance Criteria
- [ ] Yield scales proportionally with time elapsed
- [ ] Zero yield at `t=0`, full annual yield at `t=31536000` (1 year)
- [ ] All existing tests pass

---

## TASK 4: Yield Router `collect_employee_bonus()` — FIX OR DOCUMENT
**Priority:** 🟢 P2 | **Effort:** 15 min | **Status:** ⚠️ ALWAYS ERRORS

### Current State
```rust
pub fn collect_employee_bonus(_env: Env, _employee: Address, _token: Address) -> Result<i128, Error> {
    Err(Error::InternalError)
}
```

### Requirements
Option A: Implement pro-rata distribution logic (employee share = employee_pool / total_employees).
Option B: Document as "deferred to Phase 2" with explanatory comment and change return to `Ok(0)`.

### Acceptance Criteria
- [ ] Function no longer returns `InternalError` (either returns 0 or real value)
- [ ] Documented expected behavior for Phase 2

---

## TASK 5: Cross-Contract Yield Integration (Blend/Soroswap)
**Priority:** 🟡 P1 | **Effort:** 2-3 weeks | **Status:** ❌ MISSING

### Requirements
1. Integrate with **Blend Protocol testnet** pools for lending yield
2. Integrate with **Soroswap** pools for AMM yield
3. Real `get_apy()` oracle that reads from external protocols instead of admin-set static rates
4. Handle multiple yield sources with proportional allocation

### Dependencies
- Web3 Researcher handoff for Blend/Soroswap testnet contract addresses and function signatures

### Acceptance Criteria
- [ ] Yield router deposits to at least one real testnet protocol
- [ ] APY oracle reads real rates from external contracts
- [ ] Withdrawal successfully retrieves deposited funds + yield
- [ ] All existing tests pass

---

## TASK 6: Cross-Contract Call for Stablecoin Auto-Swap
**Priority:** 🟢 P2 | **Effort:** 1-2 weeks | **Status:** ❌ MISSING

### Requirements
- After claim, auto-convert USDC to employee's preferred stablecoin via Soroswap Aggregator
- Cross-contract `swap()` call

### Acceptance Criteria
- [ ] Employee can specify target stablecoin
- [ ] swap executed after claim_stream()
- [ ] Slippage protection
- [ ] All existing tests pass

---

## Task Dependency Graph

```
TASK 1 (Groth16) ──── Depends on: Web3 Researcher (BLS12-381 API research)
     │                    Blocks: Mainnet launch
TASK 2 (deposit)   ──── Depends on: Task 5 (Blend/Soroswap integration)
TASK 3 (time-aware) ─── No dependencies — can do immediately
TASK 4 (bonus)     ──── No dependencies — can do immediately
TASK 5 (Blend)     ──── Depends on: Web3 Researcher (Blend testnet addresses)
TASK 6 (swap)      ──── Depends on: Task 5
```

---

## Files You'll Modify

| File | Tasks |
|------|-------|
| `crates/payroll_dispatcher/src/lib.rs` | T1 (Groth16) |
| `crates/yield_router/src/lib.rs` | T2, T3, T4, T5, T6 |
| `tests/e2e-testnet.ts` | T1 (update proof in E2E) |

## Testing Requirements
- All tasks: `cargo test --workspace` must pass
- T1: E2E test with real proof (not mock)
- T2, T5: Testnet deployment + cross-contract call verification
