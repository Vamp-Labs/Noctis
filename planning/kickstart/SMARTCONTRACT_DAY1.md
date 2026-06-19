# Kickstart: Smart Contract Engineer — Day 1
## ZK-SDP Development: First 24 Hours
### Start: Now | Deliverables by End of Day

---

## Your Day 1 Mission

**Write, compile, and locally verify the Noir circuit + deploy UltraHonk verifier.**

This is the **critical path** of the entire project. Everything else depends on you producing:
1. A working `payroll_withdrawal.nr` circuit
2. A deployed `UltraHonkVerifierContract` on testnet

---

## Step 1: Set Up Noir Environment (30 min)

```bash
# Install Noir
curl -L https://raw.githubusercontent.com/noir-lang/noir-releases/main/install.sh | bash

# Verify
nargo --version  # Must be >= 0.36.0

# Install Barretenberg (bb)
curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/release/barretenberg/install.sh | bash
bb --version
```

## Step 2: Create Circuit Project (30 min)

```bash
mkdir -p circuits/payroll_withdrawal/src
cd circuits/payroll_withdrawal

# Write Nargo.toml
cat > Nargo.toml << 'EOF'
[package]
name = "payroll_withdrawal"
type = "bin"
compiler_version = ">=0.36.0"
[dependencies]
EOF

# Write main.nr
cat > src/main.nr << 'CIRCUIT'
use dep::std::hash::poseidon2;

global DEPTH: u32 = 16;

fn merkle_root(leaf: Field, index: Field, path: [Field; 16], path_indices: [u1; 16]) -> Field {
    let mut current = leaf;
    let index_bits = index.to_le_bits(DEPTH);
    for i in 0..DEPTH {
        let sibling = path[i];
        let is_right = path_indices[i];
        let (left, right) = if is_right == 1 { (sibling, current) } else { (current, sibling) };
        current = poseidon2::Poseidon2::hash([left, right], 2);
    }
    current
}

fn main(
    salary_amount: u64,
    nullifier_secret: Field,
    employee_index: Field,
    merkle_siblings: [Field; 16],
    merkle_path_indices: [u1; 16],
    merkle_root_pub: pub Field,
    nullifier_hash_pub: pub Field,
    recipient_address: pub Field,
    expected_amount: pub u64,
) {
    assert(salary_amount == expected_amount);
    let leaf = poseidon2::Poseidon2::hash([salary_amount as Field, nullifier_secret, employee_index], 3);
    let computed_root = merkle_root(leaf, employee_index, merkle_siblings, merkle_path_indices);
    assert(computed_root == merkle_root_pub);
    let computed_nullifier = poseidon2::Poseidon2::hash([nullifier_secret], 1);
    assert(computed_nullifier == nullifier_hash_pub);
}
CIRCUIT
```

## Step 3: Compile Circuit (10 min)

```bash
nargo compile
# Output: target/payroll_withdrawal.json

# Check constraint count
nargo info
# Target: < 500,000 gates
```

## Step 4: Generate Verification Key (10 min)

```bash
bb write_vk -b ./target/payroll_withdrawal.json
# Output: target/vk
```

## Step 5: Test Locally (30 min)

Write a test script using `@noir-lang/noir_js` in Node.js:

```typescript
// test_local.mjs
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@noir-lang/backend_barretenberg';
import { readFileSync } from 'fs';

const circuit = JSON.parse(readFileSync('./target/payroll_withdrawal.json'));
const backend = new UltraHonkBackend(circuit.bytecode);
const noir = new Noir(circuit);

const input = {
  salary_amount: 5000,
  nullifier_secret: "0x1234...",
  employee_index: 0,
  merkle_siblings: Array(16).fill("0x00..."),
  merkle_path_indices: Array(16).fill(0),
  merkle_root_pub: "0x...",
  nullifier_hash_pub: "0x...",
  recipient_address: "0x...",
  expected_amount: 5000,
};

const { witness } = await noir.execute(input);
const { proof, publicInputs } = await backend.generateProof(witness);
console.log("Proof generated:", proof.length, "bytes");

// Verify
const isValid = await backend.verifyProof({ proof, publicInputs });
console.log("Verified:", isValid); // Must be true
```

## Step 6: Deploy UltraHonkVerifierContract (1 hour)

```bash
# Clone the reference verifier
git clone https://github.com/indextree/ultrahonk_soroban_contract
cd ultrahonk_soroban_contract

# Build WASM
cargo build --target wasm32v1-none --release

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/ultrahonk_soroban_contract.wasm \
  --source $DEPLOYER_KEY \
  --network testnet \
  -- \
  --vk-bytes-file-path ../circuits/payroll_withdrawal/target/vk

# Record the contract ID!
echo "Verifier Contract ID: <COPY THIS>"
```

## Step 7: Share Your Output

By end of Day 1, post in Telegram #dev:

```
✅ Day 1 done — Smart Contract
- Circuit: compiled (XX,XXX constraints)
- Local verify: PASS
- Verifier deployed: CCYF...XXXX
- VK hash: 0x...
- Circuit artifact at: circuits/payroll_withdrawal/target/payroll_withdrawal.json
```

---

## What NOT to Do on Day 1

- ❌ Don't write the ConfidentialPayrollContract yet (Day 3)
- ❌ Don't worry about multi-batch support
- ❌ Don't optimize for gas yet
- ❌ Don't write integration tests yet

**Just circuit + verifier deploy.**

---

## If You Get Stuck

| Problem | Try |
|---------|-----|
| `nargo compile` fails | Check Noir version ≥ 0.36.0; verify `use dep::std::hash::poseidon2` |
| `bb write_vk` fails | Check circuit builds first; Barretenberg version matches Noir |
| Verifier deploy fails | Check testnet RPC at `https://soroban-testnet.stellar.org`; fund deployer via Friendbot |
| WASM build fails | Ensure `wasm32v1-none` target installed: `rustup target add wasm32v1-none` |

**Escalate:** Tag @pm in Telegram if stuck > 30 min.

---

*Your full hand-off doc: `planning/handoffs/SMARTCONTRACT_ENGINEER.md`*
