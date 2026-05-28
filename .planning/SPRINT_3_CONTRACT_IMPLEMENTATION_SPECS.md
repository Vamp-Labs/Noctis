# 📐 SPRINT 3 — SMART CONTRACT IMPLEMENTATION SPECIFICATION
## Complete Engineering Specs for All 5 Contracts (TODO → Production)

**Author:** Product Manager  
**Audience:** Smart Contract Engineer, Security Engineer  
**Target:** 100% production-ready contracts by Jul 1, 2026  
**Sprint 3 Epic:** M6 (Contracts Complete)  
**Status:** ✅ SPEC COMPLETE — READY FOR IMPLEMENTATION

---

## TABLE OF CONTENTS

1. [Payroll Dispatcher](#1-payroll-dispatcher-zk-batch-payroll)
2. [Streaming Vault](#2-streaming-vault-per-second-payment-streams)
3. [Wallet Factory](#3-wallet-factory-passkey-smart-wallets)
4. [Yield Router](#4-yield-router-idle-capital-yield-routing)
5. [Policy Signer](#5-policy-signer-authorization--spending-limits)
6. [Cross-Contract Integration Points](#6-cross-contract-integration-points)

---

## 1. PAYROLL DISPATCHER (ZK BATCH PAYROLL)

### 1.1 File: `crates/payroll_dispatcher/src/lib.rs`
### 1.2 Dependencies: `soroban-sdk = "26.0.0"`, `policy_signer`, `streaming_vault`

### 1.3 Storage Layout

```rust
#[contracttype]
pub enum DataKey {
    Owner,                          // Address — contract deployer
    DispatcherAdmin,                // Address — can pause/unpause
    Paused,                         // bool — emergency pause
    BatchCount,                     // u32 — total batches processed
    Batch(u32),                     // BatchMetadata — per-batch metadata
    BatchRoot(u32),                 // BytesN<32> — Merkle root per batch
    NullifierSet(BytesN<32>),       // bool — used nullifier → true
    Streams(u32, Address),          // Address — stream contract per batch per employee
    BatchRootCache,                 // Map<BytesN<32>, u32> — root → batch ID
    YieldRouter,                    // Address — yield router contract
    StreamingVault,                 // Address — streaming vault contract
    TrustedSetupHash,               // BytesN<32> — SHA256 of ZK verification key
}

#[contracttype]
pub struct BatchMetadata {
    pub employer: Address,
    pub total_amount: i128,
    pub recipient_count: u32,
    pub timestamp: u64,
    pub status: BatchStatus,
    pub stream_count: u32,
}

#[contracttype]
pub enum BatchStatus {
    Pending,
    Verified,
    Processing,
    Completed,
    Failed,
}

#[contracttype]
pub struct PayrollBatch {
    pub employer: Address,
    pub total_amount: i128,
    pub commitment_root: BytesN<32>,
    pub zk_proof: Bytes,              // Groth16 proof: 192 bytes
    pub nullifiers: Vec<BytesN<32>>,  // One per recipient
    pub recipients: Vec<Address>,     // Recipient addresses
    pub amounts: Vec<i128>,           // Individual amounts
    pub stream_durations: Vec<u64>,   // Stream durations in seconds
}
```

### 1.4 Function Implementations

#### `process_batch()`
```rust
pub fn process_batch(
    env: Env,
    batch: PayrollBatch,
) -> Result<u32, Error>
```

**Logic:**
1. **Access Control:** `batch.employer.require_auth()`
2. **Guard Check:** `if env.storage().get(&DataKey::Paused).unwrap_or(false) { panic!("paused") }`
3. **Policy Check:** Cross-call `policy_signer.verify_policy(employer, batch.total_amount)` — reject if spending limit exceeded
4. **Nullifier Check:** Iterate `batch.nullifiers`, verify each `!env.storage().has(&DataKey::NullifierSet(n))`. Reject if any already used.
5. **ZK Proof Verification:** Cross-call internal `verify_zk_proof()` with `batch.commitment_root` and `batch.zk_proof`
6. **Merkle Root Validation:** Compute root from `batch.recipients` + `batch.amounts`, compare to `batch.commitment_root`
7. **Sum Check:** `let sum: i128 = batch.amounts.iter().sum()` must equal `batch.total_amount`
8. **Stream Creation:** For each recipient, cross-call `streaming_vault.create_stream(recipient, amount_per_second, total_amount, stream_duration)` 
9. **Nullifier Emission:** Store `env.storage().set(&DataKey::NullifierSet(n), &true)` for each nullifier
10. **Batch Metadata:** `store BatchMetadata`, increment `BatchCount`
11. **Yield Routing:** Cross-call `yield_router.route_yield(employer, idle_amount)` — idle = sum of funds not yet streamable
12. **Event Emission:** `env.events().publish(("payroll", "batch_processed"), batch_id)`
13. **Return:** `Ok(batch_id)`

**Error Handling:**
```rust
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    Unauthorized = 1,
    ContractPaused = 2,
    ProofInvalid = 3,
    NullifierAlreadyUsed = 4,
    AmountMismatch = 5,
    RootMismatch = 6,
    PolicyViolation = 7,
    InsufficientBalance = 8,
    InvalidBatchFormat = 9,
    InternalError = 10,
}
```

#### `verify_zk_proof()`
```rust
pub fn verify_zk_proof(env: Env, commitment_root: BytesN<32>, proof: Bytes) -> bool
```

**Logic:**
1. Validate proof length: `proof.len() == 192` (Groth16 on BLS12-381 = 3 × 64 bytes for G1/G2 elements)
2. Parse proof: `a` (G1), `b` (G2), `c` (G1) — 64 bytes each
3. Use Protocol 25 X-Ray host functions:
   - `env.prng().bls12_381_g1_add()` 
   - `env.prng().bls12_381_g2_add()`
   - `env.prng().bls12_381_pairing()`
4. Verify Groth16 pairing equation: `e(a, b) == e(g1, -sigma_abc) * e(public_inputs, vk)`
5. Return `true` if verification passes, `false` otherwise

**Note:** For testnet MVP, the full BLS12-381 pairing check may be stubbed if host functions are limited. Alternative: verify off-chain and store proof hash on-chain as commitment.

#### `emit_nullifier()`
```rust
pub fn emit_nullifier(env: Env, nullifier: BytesN<32>) -> bool
```

**Logic:**
1. Check: `if env.storage().has(&DataKey::NullifierSet(nullifier)) { return false }`
2. Store: `env.storage().set(&DataKey::NullifierSet(nullifier), &true)`
3. Emit: `env.events().publish(("payroll", "nullifier_emitted"), nullifier)`
4. Return `true`

#### `pause() / unpause()` (Admin)
```rust
pub fn pause(env: Env)
pub fn unpause(env: Env)
```
**Logic:** `env.storage().set(&DataKey::DispatcherAdmin).require_auth()` — toggle `DataKey::Paused`

#### `get_batch_count()` — Read-only
```rust
pub fn get_batch_count(env: Env) -> u32
```
**Logic:** `env.storage().get(&DataKey::BatchCount).unwrap_or(0)`

### 1.5 Event Definitions
```rust
// Batch processed
env.events().publish(("payroll", "batch_processed"), (batch_id: u32, employer: Address, total: i128, count: u32));

// Nullifier emitted
env.events().publish(("payroll", "nullifier_emitted"), (nullifier: BytesN<32>));

// Contract paused
env.events().publish(("payroll", "paused"), (admin: Address));

// Contract unpaused
env.events().publish(("payroll", "unpaused"), (admin: Address));
```

### 1.6 Test Scenarios

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 1 | Valid ZK batch: 3 recipients | batch with valid Merkle root + proof | batch_id > 0, 3 nullifiers stored |
| 2 | Replay attack: duplicate nullifier | Same nullifier twice | Error::NullifierAlreadyUsed |
| 3 | Invalid ZK proof | Garbage proof bytes | Error::ProofInvalid |
| 4 | Amount mismatch | sum(amounts) ≠ total_amount | Error::AmountMismatch |
| 5 | Unauthorized caller | Different employer address | Error::Unauthorized |
| 6 | Contract paused | pause() then process_batch() | Error::ContractPaused |
| 7 | Balance exceeded | total_amount > employer balance | Error::InsufficientBalance |
| 8 | Zero recipients batch | empty vectors | Error::InvalidBatchFormat |
| 9 | Max recipients (100) | 100-recipient batch | batch_id > 0, all streams created |
| 10 | Policy limit hit | batch > employer spending limit | Error::PolicyViolation |

---

## 2. STREAMING VAULT (PER-SECOND PAYMENT STREAMS)

### 2.1 File: `crates/streaming_vault/src/lib.rs`

### 2.2 Storage Layout

```rust
#[contracttype]
pub enum DataKey {
    Admin,                          // Address
    StreamCount,                    // u32
    Stream(u32),                    // StreamData
    EmployeeStreams(Address),       // Vec<u32> — stream IDs per employee
    EmployerBalances(Address),      // i128 — total deposited per employer
    Paused,                         // bool
}

#[contracttype]
pub struct StreamData {
    pub id: u32,
    pub employer: Address,
    pub employee: Address,
    pub token: Address,              // SEP-41 token address
    pub total_amount: i128,          // Total amount for the stream
    pub amount_per_second: i128,     // Amount accrued per second
    pub start_time: u64,             // Unix timestamp (seconds)
    pub stop_time: u64,              // Unix timestamp (seconds)
    pub paused: bool,
    pub paused_at: u64,              // Timestamp when paused (0 = not paused)
    pub total_claimed: i128,         // Amount already withdrawn
    pub refunded: bool,              // True if cancelled and refunded
}
```

### 2.3 Function Implementations

#### `create_stream()`
```rust
pub fn create_stream(
    env: Env,
    employer: Address,
    employee: Address,
    token: Address,
    total_amount: i128,
    amount_per_second: i128,
    duration: u64,
) -> Result<u32, Error>
```

**Logic:**
1. **Access Control:** `employer.require_auth()` (called from payroll_dispatcher or directly)
2. **Validation:**
   - `total_amount > 0`, `amount_per_second > 0`, `duration > 0`
   - `amount_per_second * duration <= total_amount` (or adjust total_amount if not exact)
3. **Token Transfer:** Cross-call `token.transfer(employer, env.current_contract_address(), total_amount)` via SEP-41 interface
4. **Store Stream:** `env.storage().set(&DataKey::Stream(stream_id), &StreamData{...})`
5. **Index:** Append `stream_id` to `EmployeeStreams(employee)`
6. **Balance Tracking:** `EmployerBalances(employer) += total_amount`
7. **Event:** `env.events().publish(("stream", "created"), (stream_id, employer, employee, total_amount, amount_per_second))`
8. **Return:** `Ok(stream_id)`

**SEP-41 Token Interface (soroban_sdk::token):**
```rust
// Transfer tokens from employer to this contract
let token_client = token::Client::new(&env, &token);
token_client.transfer(&employer, &env.current_contract_address(), &total_amount);
```

#### `claim_stream()`
```rust
pub fn claim_stream(env: Env, stream_id: u32) -> Result<i128, Error>
```

**Logic:**
1. **Load Stream:** `let stream = env.storage().get(&DataKey::Stream(stream_id)).expect("stream not found")`
2. **Access Control:** `stream.employee.require_auth()` — only employee can claim
3. **Calculate Accrued:**
   ```rust
   let now = env.ledger().timestamp();
   let effective_stop = if stream.stop_time < now { stream.stop_time } else { now };
   let elapsed = effective_stop - stream.start_time;
   // If paused, subtract paused time
   let accrued = stream.amount_per_second * elapsed as i128;
   let claimable = accrued - stream.total_claimed;
   ```
4. **Transfer:** `token_client.transfer(&env.current_contract_address(), &stream.employee, &claimable)`
5. **Update:** `stream.total_claimed += claimable`
6. **Store:** Update `Stream(stream_id)` in storage
7. **Event:** `env.events().publish(("stream", "claimed"), (stream_id, employee, claimable))`
8. **Return:** `Ok(claimable)`

#### `get_accrued_amount()`
```rust
pub fn get_accrued_amount(env: Env, stream_id: u32) -> i128
```

**Logic:** Same accrual calculation as `claim_stream()` but read-only. No auth required.

#### `cancel_stream()`
```rust
pub fn cancel_stream(env: Env, stream_id: u32) -> Result<i128, Error>
```

**Logic:**
1. **Load Stream**
2. **Access Control:** `stream.employer.require_auth()` — only employer can cancel
3. **Validation:** `if stream.refunded { return Error::AlreadyRefunded }`
4. **Calculate:** Current accrued (claimable by employee), remaining (return to employer)
5. **Process Claim:** If any accrued unclaimed, keep available for employee (mark as claimable later)
6. **Refund:** Return remaining to employer
7. **Mark:** `stream.refunded = true`, update storage
8. **Event:** `env.events().publish(("stream", "cancelled"), (stream_id, employer, refund_amount))`
9. **Return:** `Ok(refund_amount)`

#### `pause_stream() / resume_stream()`
```rust
pub fn pause_stream(env: Env, stream_id: u32)  // employer only — stop accrual temporarily
pub fn resume_stream(env: Env, stream_id: u32)  // employer only — resume accrual
```

#### `get_employee_streams()`
```rust
pub fn get_employee_streams(env: Env, employee: Address) -> Vec<u32>
```
Returns list of stream IDs for the given employee.

### 2.4 Test Scenarios

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 1 | Create stream | valid params | stream_id > 0, tokens transferred |
| 2 | Claim after 10 seconds | 10s elapsed | accrued = amount_per_second × 10 |
| 3 | Claim zero (immediately) | 0s elapsed | claimable = 0 |
| 4 | Double claim | claim twice | second claim = remaining only |
| 5 | Cancel mid-stream | cancel after 50% elapsed | employee gets 50%, employer gets 50% |
| 6 | Unauthorized claim | different address | Error::Unauthorized |
| 7 | Stream expired | claim after stop_time | claimable = total - claimed |
| 8 | Pause and resume | pause 10s, resume 10s | only 10s total accrual |
| 9 | Balance exhaustion | employer has insufficient tokens | Error::InsufficientBalance |

---

## 3. WALLET FACTORY (PASSKEY SMART WALLETS)

### 3.1 File: `crates/wallet_factory/src/lib.rs`

### 3.2 Storage Layout

```rust
#[contracttype]
pub enum DataKey {
    Admin,
    WalletCount,
    Wallet(u32),                    // WalletData
    OwnerToWallet(Address),         // u32 — owner address → wallet ID
    PasskeyToWallet(BytesN<32>),   // u32 — passkey hash → wallet ID
    Paused,
}

#[contracttype]
pub struct WalletData {
    pub id: u32,
    pub owner: Address,
    pub passkey_pubkey: Bytes,       // secp256r1 compressed public key (33 bytes)
    pub deployed_at: u64,
    pub last_used: u64,
    pub nonce: u64,
}
```

### 3.3 Function Implementations

#### `create_wallet()`
```rust
pub fn create_wallet(
    env: Env,
    owner: Address,
    passkey_pubkey: Bytes,
) -> Result<Address, Error>
```

**Logic:**
1. **Access Control:** `owner.require_auth()`
2. **Validation:**
   - `passkey_pubkey.len() == 33` (compressed secp256r1: 0x02/0x03 + 32-byte x-coordinate)
   - Owner doesn't already have a wallet
3. **Passkey Hash:** `let passkey_hash = env.crypto().sha256(&passkey_pubkey)`
4. **Store:**
   ```rust
   let wallet_id = env.storage().get(&DataKey::WalletCount).unwrap_or(0) + 1;
   let wallet = WalletData {
       id: wallet_id,
       owner: owner.clone(),
       passkey_pubkey,
       deployed_at: env.ledger().timestamp(),
       last_used: env.ledger().timestamp(),
       nonce: 0,
   };
   env.storage().set(&DataKey::Wallet(wallet_id), &wallet);
   env.storage().set(&DataKey::OwnerToWallet(owner.clone()), &wallet_id);
   ```
5. **Event:** `env.events().publish(("wallet", "created"), (wallet_id, owner))`
6. **Return:** Compute deterministic wallet address or return `owner`

**Note:** For testnet MVP, the wallet IS the owner's existing Stellar address (no separate contract wallet deployed per user). The factory acts as a registry mapping passkey → Stellar address. True SEP-45 contract-account deployment can be added later.

#### `get_wallet()`
```rust
pub fn get_wallet(env: Env, owner: Address) -> Option<Address>
```
Returns the wallet address for a given owner.

#### `verify_signature()`
```rust
pub fn verify_signature(
    env: Env,
    owner: Address,
    message: Bytes,
    signature: Bytes,
) -> Result<bool, Error>
```

**Logic:**
1. Lookup wallet for `owner`
2. Extract stored `passkey_pubkey`
3. **Parse secp256r1 signature:** `signature` is DER-encoded ECDSA (70-73 bytes typical)
4. **Verify:** Use host function for secp256r1 verification:
   ```rust
   // Protocol 26 host function call
   let valid = env.crypto().secp256r1_verify(&passkey_pubkey, &message, &signature);
   ```
   (Note: If `secp256r1_verify` is not exposed, use `ed25519_verify` as testnet fallback and document the upgrade path)
5. **Update:** `wallet.last_used = env.ledger().timestamp()`
6. **Return:** `Ok(valid)`

#### `update_passkey()`
```rust
pub fn update_passkey(env: Env, owner: Address, new_pubkey: Bytes) -> Result<(), Error>
```
Allow owner to rotate their passkey (e.g., new device).

### 3.4 Test Scenarios

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 1 | Create wallet | valid pubkey | wallet_id = 1, stored |
| 2 | Duplicate wallet | same owner | Error::AlreadyExists |
| 3 | Invalid pubkey | 0-length bytes | Error::InvalidPubkey |
| 4 | Verify valid signature | correct secp256r1 sig | true |
| 5 | Verify invalid sig | wrong signature | false |
| 6 | Rotate passkey | new valid pubkey | passkey updated |
| 7 | Get non-existent wallet | unknown owner | None |

---

## 4. YIELD ROUTER (IDLE CAPITAL YIELD ROUTING)

### 4.1 File: `crates/yield_router/src/lib.rs`

### 4.2 Storage Layout

```rust
#[contracttype]
pub enum DataKey {
    Admin,
    YieldSources(Vec<Symbol>),       // Registered yield sources
    SourceRate(Symbol),              // u32 — APR in basis points (100 = 1%)
    EmployerAllocations(Address),    // Allocations — per employer
    TotalDeposited,                  // i128 — total across all sources
    Paused,
    YieldSplitConfig,                // YieldSplit config
}

#[contracttype]
pub struct YieldSplit {
    pub employer_share: u32,         // Basis points, e.g. 8000 = 80%
    pub employee_pool: u32,          // Basis points, e.g. 1500 = 15%
    pub protocol_fee: u32,           // Basis points, e.g. 500 = 5%
}

#[contracttype]
pub enum YieldSource {
    Blend { pool_address: Address },
    Soroswap { pool_address: Address },
}

#[contracttype]
pub struct Allocations {
    pub total: i128,
    pub by_source: Map<Symbol, i128>,
    pub accumulated_yield: i128,
}
```

### 4.3 Function Implementations

#### `register_source()`
```rust
pub fn register_source(env: Env, source: Symbol, pool_address: Address)
```
**Logic:** Admin only. Register a yield source (Blend, Soroswap) with its pool address.

#### `route_yield()`
```rust
pub fn route_yield(
    env: Env,
    token: Address,
    employer: Address,
    amount: i128,
) -> Result<i128, Error>
```

**Logic:**
1. **Access Control:** Caller must be `payroll_dispatcher` (cross-contract auth)
2. **Balance Check:** `token_client.balance(env.current_contract_address()) >= amount`
3. **Allocate:** Split `amount` across registered yield sources (proportional strategy):
   ```rust
   let sources = env.storage().get(&DataKey::YieldSources).unwrap();
   let per_source = amount / sources.len() as i128;
   for source in sources.iter() {
       // Cross-call to yield source deposit function
       yield_source_deposit(source, per_source);
       allocations.by_source.set(source, allocations.by_source.get(source).unwrap_or(0) + per_source);
   }
   ```
4. **Store Allocations:** Update employer's allocation record
5. **Event:** `env.events().publish(("yield", "routed"), (employer, amount))`
6. **Return:** `Ok(amount)`

#### `withdraw_yield()`
```rust
pub fn withdraw_yield(env: Env, employer: Address, token: Address) -> Result<i128, Error>
```

**Logic:**
1. **Access Control:** `employer.require_auth()`
2. **Claim from Sources:** Cross-call each yield source to withdraw principal + yield
3. **Split Yield:**
   ```rust
   let config = env.storage().get(&DataKey::YieldSplitConfig).unwrap();
   let employer_yield = total_yield * config.employer_share / 10000;
   let employee_pool_yield = total_yield * config.employee_pool / 10000;
   let protocol_fee = total_yield * config.protocol_fee / 10000;
   ```
4. **Transfer to Employer:** `token_client.transfer(contract, employer, principal + employer_yield)`
5. **Transfer Protocol Fee:** `token_client.transfer(contract, admin, protocol_fee)`
6. **Store:** Employee pool yield remains in contract for employee bonus distribution
7. **Event:** `env.events().publish(("yield", "withdrawn"), (employer, principal, employer_yield, protocol_fee))`
8. **Return:** `Ok(principal + employer_yield)`

#### `get_yield_rate()`
```rust
pub fn get_yield_rate(env: Env, source: Symbol) -> u32
```
Returns latest APR (in basis points) for a given yield source.

#### `collect_yield_employee()` (Bonus pool)
```rust
pub fn collect_employee_bonus(env: Env, employee: Address) -> i128
```
Employees can claim their share of the yield bonus pool.

### 4.4 Yield Source Integration

```rust
// Blend Protocol interface (simplified)
pub fn blend_deposit(pool: Address, token: Address, amount: i128) {
    // Approve pool to spend tokens
    // Call pool.deposit(amount)
}

// Soroswap interface (simplified)  
pub fn soroswap_deposit(pool: Address, token: Address, amount: i128) {
    // Add liquidity to pool
    // Receive LP tokens
}
```

**Note for MVP:** Yield source integration may be simulated if Blend/Soroswap testnet contracts are unavailable. Create an `InternalYieldSource` that just tracks "virtual yield" at a configurable APR.

### 4.5 Test Scenarios

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 1 | Register yield source | valid Symbol + address | Source stored |
| 2 | Route idle capital | 10000 USDC | allocated across sources |
| 3 | Withdraw yield | employer withdraws | principal + yield returned |
| 4 | Yield split verification | 100 yield | employer: 80, pool: 15, protocol: 5 |
| 5 | Employee bonus claim | employee claims | bonus distributed |
| 6 | Unauthorized route | non-dispatcher caller | Error::Unauthorized |

---

## 5. POLICY SIGNER (AUTHORIZATION & SPENDING LIMITS)

### 5.1 File: `crates/policy_signer/src/lib.rs`

### 5.2 Storage Layout

```rust
#[contracttype]
pub enum DataKey {
    Admin,
    PolicyCount,
    Policy(u32),                       // PolicyData
    EmployerPolicies(Address),         // Vec<u32> — policies per employer
    ActivePolicies(u32),              // bool — true if policy is active
}

#[contracttype]
pub struct PolicyData {
    pub id: u32,
    pub employer: Address,
    pub name: Symbol,                  // Human-readable name
    pub policy_type: PolicyType,
    pub max_amount: i128,              // Per-batch spending limit
    pub period_limit: i128,            // Daily/weekly/monthly limit
    pub period_seconds: u64,           // Rolling window in seconds
    pub spent_this_period: i128,       // Amount already spent in current window
    pub period_start: u64,             // Start of current rolling window
    pub allowed_tokens: Vec<Address>,  // Token allowlist (empty = any)
    pub required_signers: u32,         // Multi-sig threshold
    pub authorized_signers: Vec<Address>, // Multi-sig signers
    pub active: bool,
    pub created_at: u64,
}

#[contracttype]
pub enum PolicyType {
    SpendingLimit,
    Allowlist,
    MultiSig,
    Timelock,
}
```

### 5.3 Function Implementations

#### `create_policy()`
```rust
pub fn create_policy(
    env: Env,
    employer: Address,
    name: Symbol,
    policy_type: PolicyType,
    max_amount: i128,
    period_limit: i128,
    period_seconds: u64,
    allowed_tokens: Vec<Address>,
    required_signers: u32,
    authorized_signers: Vec<Address>,
) -> Result<u32, Error>
```

**Logic:**
1. **Access Control:** `employer.require_auth()`
2. **Validation:** `required_signers <= authorized_signers.len() as u32`
3. **Store Policy:** Generate `policy_id`, store `PolicyData`
4. **Index:** Append to `EmployerPolicies(employer)`
5. **Event:** `env.events().publish(("policy", "created"), (policy_id, employer, name))`
6. **Return:** `Ok(policy_id)`

#### `verify_policy()`
```rust
pub fn verify_policy(
    env: Env,
    employer: Address,
    amount: i128,
    token: Address,
    signers: Vec<Address>,
) -> Result<u32, Error>
```

**Logic:**
1. **Load Policies:** Get all active policies for `employer`
2. **Check Each Policy:**
   - **SpendingLimit:** `amount <= policy.max_amount`
   - **PeriodLimit:** Rolling window check — if `env.ledger().timestamp() > policy.period_start + policy.period_seconds`, reset counter. Then `policy.spent_this_period + amount <= policy.period_limit`
   - **Allowlist:** If `policy.allowed_tokens` not empty, `token` must be in the list
   - **MultiSig:** `signers.len() as u32 >= policy.required_signers`, all signers in `authorized_signers`
   - **Timelock:** Check if current time >= policy creation + delay
3. **Update Period Spent:** `policy.spent_this_period += amount`, update storage
4. **Return:** `Ok(policy_id)` of the matching policy

**Returns error if no policy allows the transaction.**

#### `revoke_policy()`
```rust
pub fn revoke_policy(env: Env, employer: Address, policy_id: u32) -> Result<(), Error>
```

**Logic:**
1. `employer.require_auth()`
2. Set `policy.active = false`
3. Event: `env.events().publish(("policy", "revoked"), (policy_id, employer))`
4. Return `Ok(())`

#### `get_employer_policies()`
```rust
pub fn get_employer_policies(env: Env, employer: Address) -> Vec<PolicyData>
```

### 5.4 Test Scenarios

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 1 | Create spending limit | max_amount = 10000 | policy_id = 1 |
| 2 | Verify within limit | amount = 5000 | Ok(1) — approved |
| 3 | Verify exceeds limit | amount = 15000 | Error::PolicyViolation |
| 4 | Rolling period limit | 3 txs in 24h window | 3rd tx rejected if exceeds period |
| 5 | Multi-sig threshold | 2/3 signers | approved |
| 6 | Multi-sig insufficient | 1/3 signers | Error::PolicyViolation |
| 7 | Token allowlist | non-allowed token | Error::PolicyViolation |
| 8 | Revoke policy | revoke then verify | Error::PolicyRevoked |
| 9 | Timelock active | before timelock expiry | Error::TimelockActive |

---

## 6. CROSS-CONTRACT INTEGRATION POINTS

### 6.1 Call Flow Diagram

```
Employer initiates batch payroll
         │
         ▼
┌─────────────────┐
│  PAYROLL        │
│  DISPATCHER     │     ┌──────────────┐
│  process_batch()──────▶│ POLICY       │
│                 │     │ SIGNER       │
│  1. Auth check  │     │ verify_policy│
│  2. Policy check│◀────│              │
│  3. Nullifier   │     └──────────────┘
│  4. ZK verify   │
│  5. Root check  │     ┌──────────────┐
│  6. Sum check   │     │ STREAMING    │
│  7. Create      │────▶│ VAULT        │
│     streams     │     │ create_stream│
│  8. Route yield │     └──────────────┘
│                 │
│                 │     ┌──────────────┐
│                 │────▶│ YIELD        │
│                 │     │ ROUTER       │
│                 │     │ route_yield  │
│                 │     └──────────────┘
└─────────────────┘
```

### 6.2 Cross-Contract Address Configuration

All contracts need references to each other. Use an initialization pattern:

```rust
// In each contract's __constructor:
pub fn __constructor(env: Env, admin: Address) {
    env.storage().set(&DataKey::Admin, &admin);
}
```

**Deployment Order:**
1. `policy_signer` — no dependencies
2. `streaming_vault` — no dependencies
3. `wallet_factory` — no dependencies
4. `yield_router` — no dependencies (Blend/Soroswap integration optional)
5. `payroll_dispatcher` — depends on all above

**Post-Deployment Configuration:**
```rust
// In payroll_dispatcher, after all contracts deployed:
pub fn configure(
    env: Env,
    policy_signer: Address,
    streaming_vault: Address,
    yield_router: Address,
    trusted_setup_hash: BytesN<32>,
) {
    env.storage().set(&DataKey::DispatcherAdmin).require_auth();
    env.storage().set(&DataKey::PolicySigner, &policy_signer);
    env.storage().set(&DataKey::StreamingVault, &streaming_vault);
    env.storage().set(&DataKey::YieldRouter, &yield_router);
    env.storage().set(&DataKey::TrustedSetupHash, &trusted_setup_hash);
}
```

### 6.3 Token Standard (SEP-41)

All token operations use the `soroban_sdk::token` interface:

```rust
use soroban_sdk::token;

// Transfer
let token_client = token::Client::new(&env, &token_address);
token_client.transfer(&from, &to, &amount);

// Balance
let balance = token_client.balance(&address);

// Approve (for yield router)
token_client.approve(&owner, &spender, &amount, &expiration_ledger);
```

### 6.4 Event Indexing Schema

Events for Mercury/Galexie indexer:

| Contract | Event | Topics | Data |
|----------|-------|--------|------|
| payroll_dispatcher | batch_processed | `["payroll", "batch_processed"]` | `(u32, Address, i128, u32)` |
| payroll_dispatcher | nullifier_emitted | `["payroll", "nullifier_emitted"]` | `BytesN<32>` |
| streaming_vault | stream_created | `["stream", "created"]` | `(u32, Address, Address, i128, i128)` |
| streaming_vault | stream_claimed | `["stream", "claimed"]` | `(u32, Address, i128)` |
| streaming_vault | stream_cancelled | `["stream", "cancelled"]` | `(u32, Address, i128)` |
| wallet_factory | wallet_created | `["wallet", "created"]` | `(u32, Address)` |
| yield_router | yield_routed | `["yield", "routed"]` | `(Address, i128)` |
| yield_router | yield_withdrawn | `["yield", "withdrawn"]` | `(Address, i128, i128, i128)` |
| policy_signer | policy_created | `["policy", "created"]` | `(u32, Address, Symbol)` |
| policy_signer | policy_revoked | `["policy", "revoked"]` | `(u32, Address)` |

---

## 7. IMPLEMENTATION ORDER & DEPENDENCIES

| Step | Contract | Dependencies | Est. Effort | Notes |
|------|----------|-------------|-------------|-------|
| 1 | `policy_signer` | None | 1 day | Simplest contract, no external deps |
| 2 | `streaming_vault` | None | 2 days | Core streaming logic, token transfers |
| 3 | `wallet_factory` | None | 1 day | Passkey registry, secp256r1 verify |
| 4 | `yield_router` | None (stub) | 2 days | Yield simulation + split logic |
| 5 | `payroll_dispatcher` | All above | 3 days | Orchestrator, ZK verify, nullifiers |
| 6 | Cross-contract tests | All deployed | 2 days | Integration test suite |
| 7 | Deployment scripts | All deployed | 1 day | Soroban deploy + configure |

**Total Estimated Engineering Effort:** 12 days (parallelizable)

---

## 8. ACCEPTANCE CRITERIA

By Sprint 3 end (Jul 9), all 5 contracts must:

- [ ] **Compile** — `cargo build --target wasm32-unknown-unknown` passes for all 5 crates
- [ ] **Test** — `cargo test` passes with ≥80% line coverage (unit + integration)
- [ ] **Deploy** — All contracts deployable to Stellar Testnet via CLI
- [ ] **Configure** — Cross-contract references configured via `configure()` calls
- [ ] **CI Green** — All CI pipeline checks pass
- [ ] **Audit Ready** — Contracts submitted for internal audit (SEC-001)
- [ ] **No Panics** — All error paths return `Error` enum values, no `unwrap()` / `expect()` in production code paths
- [ ] **Network Guard** — No mainnet RPC endpoints hardcoded

---

*End of Contract Implementation Specs*  
*Date: June 26, 2026*  
*Phase: Sprint 3 — Production Readiness*  
*Status: ✅ COMPLETE — Ready for Smart Contract Engineer*
