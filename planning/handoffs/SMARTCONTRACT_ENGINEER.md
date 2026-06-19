# Hand-off: Smart Contract Engineer
## ZK-SDP — Confidential Payroll on Stellar
### From: Product Manager

---

## 1. Your Mission

Build the cryptographic trust layer of ZK-SDP. You own three interconnected deliverables:

1. **Noir ZK Circuit** (`payroll_withdrawal.nr`) — the zero-knowledge logic
2. **ConfidentialPayrollContract** (Soroban/Rust) — the on-chain payroll state machine
3. **UltraHonkVerifierContract** deployment — the proof verification engine

Your code is the **most security-critical component**. A bug in the circuit or contract can leak salary data, allow double-spending, or lock funds. Write tests aggressively.

---

## 2. Architecture Overview

```
Employee Browser                          Stellar Testnet
┌─────────────────┐                     ┌─────────────────────────┐
│ Noir WASM       │  proof + pub_inputs │ ConfidentialPayroll     │
│ (proof gen)     │ ──────────────────▶ │   Contract              │
│                 │                     │   │                     │
│ payroll_with-   │                     │   ├─ verify nullifier   │
│ drawal.nr       │                     │   ├─ verify root        │
│                 │                     │   └─ XCall ──────────▶  │
└─────────────────┘                     │      UltraHonkVerifier  │
                                        │      Contract.verify()  │
                                        └─────────────────────────┘
```

---

## 3. Deliverables

### 3.1 Noir Circuit: `circuits/payroll_withdrawal/src/main.nr`

**Specification (from PRD §8.3):**

```noir
fn main(
    // PRIVATE (known only to employee, never on-chain)
    salary_amount: u64,
    nullifier_secret: Field,
    employee_index: Field,
    merkle_siblings: [Field; 20],       // or [Field; 16] if depth=16
    merkle_path_indices: [u1; 20],      // or [u1; 16]
    
    // PUBLIC (verified on-chain)
    merkle_root_pub: pub Field,
    nullifier_hash_pub: pub Field,
    recipient_address: pub Field,
    expected_amount: pub u64,
)
```

**Circuit constraints to prove:**
1. **Leaf commitment:** `Poseidon2([salary_amount, nullifier_secret, employee_index]) == leaf`
2. **Merkle inclusion:** `merkle_root(leaf, index, siblings, path_indices) == computed_root`
3. **Nullifier derivation:** `Poseidon2([nullifier_secret]) == nullifier_hash`
4. **Amount binding:** `salary_amount == expected_amount`
5. **Recipient binding:** `recipient_address` is a public input (bound to proof, no constraint needed)

**Key decisions from PRD §13:**
- **Proving system:** UltraHonk (not Groth16) — no trusted ceremony
- **Tree depth:** 16 for MVP (65,536 employees), but make depth configurable
- **Poseidon2 params:** t=3, d=5 (CAP-0075 compatible)
- **Nullifier:** `Poseidon2([secret])` — single input

**Nargo.toml:**
```toml
[package]
name = "payroll_withdrawal"
type = "bin"
compiler_version = ">=0.36.0"

[dependencies]
std = { path = "../../node_modules/@noir-lang/noir_stdlib" }
```

**Acceptance Criteria:**
- [ ] Compiles with `nargo compile`
- [ ] `nargo info` shows constraint count (< 500k gates)
- [ ] Local prover+verifier test passes with `bb prove` + `bb verify`
- [ ] Verification key generated with `bb write_vk`
- [ ] Tampered proof is rejected

### 3.2 UltraHonkVerifierContract Deployment

**Reference repo:** `github.com/indextree/ultrahonk_soroban_contract`

**Steps:**
1. Clone, build WASM
2. Deploy with VK from §3.1
3. Test `verify(proof, public_inputs)` returns `true`

**Deployment command:**
```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/ultrahonk_soroban_contract.wasm \
  --source deployer \
  --network testnet \
  -- \
  --vk-bytes-file-path ./circuits/payroll_withdrawal/target/vk
```

**Contract interface (what ConfidentialPayrollContract calls):**
```rust
fn verify(env: Env, proof: Bytes, public_inputs: Vec<BytesN<32>>) -> bool;
```

### 3.3 ConfidentialPayrollContract: `contracts/confidential_payroll/src/lib.rs`

**Full spec in PRD §8.2.1.** Key elements:

| Function | Auth | Storage Writes | Events | Notes |
|----------|------|---------------|--------|-------|
| `initialize(verifier, vk_hash)` | Deployer | VerifierContract, Admin | — | Called once at deploy |
| `create_batch(employer, batch_id, merkle_root, token, total_amount)` | `employer.require_auth()` | MerkleRoot(batch_id), TokenBalance(batch_id) | `BatchCreated { batch_id, employer, root, total }` | Root is immutable after this |
| `withdraw(batch_id, proof, public_inputs, recipient, token, salary_amount)` | None (proof is auth) | NullifierSpent(nullifier_hash) | `Withdrawn { nullifier_hash, recipient, timestamp }` | ⚠️ NO amount in event |
| `get_root(batch_id)` | — | Read only | — | View function |
| `is_spent(nullifier_hash)` | — | Read only | — | View function |

**Critical security patterns (PRD §12.2):**
1. **Re-entrancy guard:** Mark nullifier as spent **BEFORE** token transfer
2. **Immutable root:** `assert!(!env.storage().instance().has(&root_key))` in create_batch
3. **Salary not stored** — only proven via ZK, transferred via `token_client.transfer()`
4. **Public input order** must match circuit: `[merkle_root, nullifier_hash, recipient_address_field, expected_amount_field]`

**Cross-contract call pattern:**
```rust
let verifier: Address = env.storage().instance().get(&DataKey::VerifierContract).unwrap();
let verifier_client = UltraHonkVerifierContractClient::new(&env, &verifier);
let verified = verifier_client.verify(&proof, &public_inputs);
assert!(verified, "Proof verification failed");
```

**Test requirements (S1-007):**
- Happy path: create_batch → withdraw with valid proof
- Double-spend: same nullifier twice → revert `NullifierSpent`
- Root mismatch: different root → revert `RootMismatch`
- Invalid proof: tampered proof → revert `ProofInvalid`
- Unauthorized: non-employer creates batch → revert
- Zero amount: total_amount = 0 → revert
- Overflow: ensure i128 doesn't overflow

---

## 4. Dependencies & Timeline

```
S1-001 ──────────────────────────────────────────────────┐
  Deploy UltraHonkVerifierContract (Day 1-2)            │
                                                         ├──▶ S1-004 ──▶ S1-006 ──▶ S1-007 ──▶ S1-008 ──▶ S1-009
S1-002 ──▶ S1-003 ──────────────────────────────────────┘    Deploy    Write     Unit      Integ.     Deploy
Circuit   Local verify                                  Verifier  Contract  Tests     Tests      Public
(Day 1-2) (Day 2-3)                                    (Day 3)   (Day 3-4) (Day 4)   (Day 4-5)  (Day 5)
```

---

## 5. Key References

| Resource | Link | Why |
|----------|------|-----|
| PRD §8.2.1 | `PRD.md#82-smart-contract-layer` | Full contract spec with code |
| PRD §8.3 | `PRD.md#83-noir-circuit-layer` | Full circuit spec with code |
| PRD §9.4 | `PRD.md#94-zk-circuit-witness-schema` | Witness schema for public/private inputs |
| PRD §12.2 | `PRD.md#122-smart-contract-security` | Security patterns to implement |
| PRD §13.1 | `PRD.md#131-cryptographic-decisions` | Cryptographic parameter decisions |
| indextree/ultrahonk | `github.com/indextree/ultrahonk_soroban_contract` | Verifier contract reference |
| tupui/ultrahonk | `github.com/tupui/ultrahonk_soroban_contract` | Full E2E example (Sudoku) |
| Nethermind PoolStellar | `github.com/NethermindEth/stellar-private-payments` | Pipeline reference (Circom/Groth16) |

---

### 4.1 Infra Note: Free Tier Deployment

This hackathon runs on $0 infrastructure:
- **Smart Contracts**: Soroban testnet (free)
- **Frontend**: Cloudflare Pages (free, unlimited bandwidth)
- **Backend**: Supabase Edge Functions + Realtime (free tier)
- **Database**: Supabase PostgreSQL 500MB (free)
- **Circuit artifacts**: Static files on Cloudflare CDN (free)

Your contract addresses feed into the Supabase event indexer. Share them with Backend Engineer as soon as deployed.

---

## 6. Technical Constraints & Known Issues

| Constraint | Implication |
|-----------|-------------|
| Soroban instruction limit (~25M) | UltraHonk verify may be expensive; test early with minimal circuit |
| Protocol 26 required (BN254 MSM) | Ensure testnet running Protocol 26+; verify with `stellar network info` |
| Noir compiler ≥ 0.36.0 | Use latest stable; check `nargo --version` |
| WASM32 target for Soroban | Contracts compile to `wasm32v1-none` |
| Freighter signing | Employee must sign withdraw() tx — no `require_auth()` needed in contract |

**Known unknowns (from PRD §13.3):**
- T1: Actual Soroban instruction count for UltraHonk verify — **benchmark this first**
- T4: Cross-contract call fees — simulate before finalizing architecture

---

## 7. Open Questions for PM

| Question | Context | Decision Needed By |
|----------|---------|-------------------|
| Tree depth: 16 or 20? | 20 = 1M employees, slower proof; 16 = 65K, faster | Sprint planning Day 1 |
| Single batch or multi-batch? | Multi-batch adds storage complexity | Sprint planning Day 1 |
| Token: XLM or USDC testnet? | Affects `token_client` calls | Sprint planning Day 1 |

---

## 8. Definition of Done Checklist

- [ ] Circuit compiles and local verify passes
- [ ] VK generated and verifier deployed
- [ ] ConfidentialPayrollContract all functions implemented
- [ ] Unit tests: all cases passing (happy + error)
- [ ] Integration test: full flow on local testnet
- [ ] Internal security review complete
- [ ] Contract addresses documented in `planning/specs/testnet_addresses.md`
- [ ] Code pushed to monorepo `contracts/` and `circuits/`
- [ ] Performance benchmarks (instruction count, proof size) recorded

---

## 9. Communication

- **Daily standup:** 9:30 AM Telegram — what you did, what's blocking, what's next
- **Blockers:** Tag @pm in Telegram immediately (don't wait for standup)
- **Code review:** Request from Backend Engineer (Rust experience) + PM
- **Demo:** Internal demo Wed before sprint end

---

*This hand-off document is your source of truth. If anything in the PRD contradicts this, raise it in standup.*

*Product Manager — ArbaLabs | June 2026*
