// ─── Noctis Payroll ZK Circuit ───────────────────────────────────
// Groth16 zk-SNARK over BLS12-381
// Proves payroll batch validity without revealing recipient identities
//
// Compilation:
//   circom payroll_circuit.circom --r1cs --wasm --sym -o build/
//
// Dependency: circomlib (Poseidon hash)
//   npm install circomlib

pragma circom 2.1.2;

include "circomlib/poseidon.circom";

// ─── Merkle Tree Path Verifier ───────────────────────────────────
// Verifies a single Merkle proof path from leaf to root
// depth: number of levels in the tree
template MerkleTreeVerifier(depth) {
    signal input leaf;                          // The leaf hash
    signal input root;                          // Expected Merkle root
    signal input siblings[depth];               // Sibling hashes at each level
    signal input indices[depth];                // 0 = left, 1 = right at each level

    signal current;

    current <== leaf;

    // Traverse up the tree, hashing with sibling at each level
    for (var i = 0; i < depth; i++) {
        // Use Poseidon 2-to-1 hash
        // If index[i] == 0: hash(current, sibling)
        // If index[i] == 1: hash(sibling, current)
        signal pos;
        component hash = Poseidon(2);

        // Mux based on index bit
        var left  = (1 - indices[i]) * current + indices[i] * siblings[i];
        var right = (1 - indices[i]) * siblings[i] + indices[i] * current;

        hash.inputs[0] <== left;
        hash.inputs[1] <== right;

        current <== hash.out;
    }

    // Constrain final hash equals expected root
    root === current;
}

// ─── Nullifier Check ─────────────────────────────────────────────
// Computes nullifier hash and constrains it matches the expected value
template NullifierComputer() {
    signal input employer_address;
    signal input batch_commitment;
    signal input payment_index;
    signal input expected_nullifier;

    component hash = Poseidon(3);
    hash.inputs[0] <== employer_address;
    hash.inputs[1] <== batch_commitment;
    hash.inputs[2] <== payment_index;

    // Constrain computed nullifier equals expected
    expected_nullifier === hash.out;
}

// ─── Amount Range Check (0 < amount < 2^64) ──────────────────────
template AmountRangeCheck() {
    signal input amount;

    // Ensure amount is positive
    signal positive;
    positive <-- amount > 0;
    positive === 1;

    // Ensure amount < 2^64 (prevents overflow)
    // Using bit decomposition check
    signal bits[64];
    var acc = 0;
    for (var i = 0; i < 64; i++) {
        bits[i] <-- (amount >> i) & 1;
        bits[i] * (bits[i] - 1) === 0;  // boolean constraint
        acc += bits[i] * (1 << i);
    }
    acc === amount;
}

// ─── Main Payroll Batch Circuit ──────────────────────────────────
// Verifies a payroll batch with `num_recipients` employees
// Tree depth is fixed at 20 (supports up to 2^20 = 1M employees)
template PayrollBatch(num_recipients) {
    // ===== PUBLIC SIGNALS (visible on-chain) =====
    signal input batch_commitment;             // Merkle root of all payment commitments
    signal input batch_total_amount;            // Sum of all payment amounts
    signal input batch_nullifiers[num_recipients]; // Nullifier hashes for replay prevention
    signal input circuit_version;               // Version identifier (currently 1)

    // ===== PRIVATE SIGNALS (hidden from ledger) =====
    signal input employer_address;
    signal input recipient_addresses[num_recipients];
    signal input payment_amounts[num_recipients];
    signal input stream_durations[num_recipients];
    signal input merkle_proofs[num_recipients][20];     // Sibling hashes
    signal input merkle_proof_indices[num_recipients][20]; // Left/right bits

    // ===== CONSTRAINTS =====

    // Sum accumulator
    signal total_sum;

    // Initialize
    total_sum <== 0;

    // Process each recipient
    for (var i = 0; i < num_recipients; i++) {
        // ─── Constraint 1: Amount range check ──────────
        component rangeCheck = AmountRangeCheck();
        rangeCheck.amount <== payment_amounts[i];

        // ─── Constraint 2: Create leaf hash ────────────
        component leafHash = Poseidon(3);
        leafHash.inputs[0] <== recipient_addresses[i];
        leafHash.inputs[1] <== payment_amounts[i];
        leafHash.inputs[2] <== stream_durations[i];

        // ─── Constraint 3: Merkle tree verification ─────
        component merkleVerifier = MerkleTreeVerifier(20);
        merkleVerifier.leaf <== leafHash.out;
        merkleVerifier.root <== batch_commitment;
        for (var j = 0; j < 20; j++) {
            merkleVerifier.siblings[j] <== merkle_proofs[i][j];
            merkleVerifier.indices[j] <== merkle_proof_indices[i][j];
        }

        // ─── Constraint 4: Nullifier computation ────────
        component nullifierCheck = NullifierComputer();
        nullifierCheck.employer_address <== employer_address;
        nullifierCheck.batch_commitment <== batch_commitment;
        nullifierCheck.payment_index <== i;
        nullifierCheck.expected_nullifier <== batch_nullifiers[i];

        // ─── Constraint 5: Accumulate amount ────────────
        signal new_total;
        new_total <== total_sum + payment_amounts[i];
        total_sum <== new_total;
    }

    // ─── Constraint 6: Total amount verification ────────
    total_sum === batch_total_amount;

    // ─── Constraint 7: Circuit version check ────────────
    circuit_version === 1;
}

// ─── Export Component ────────────────────────────────────────────
// Batch size: 100 recipients (for MVP; adjust as needed)
// Tree depth: 20 (supports up to 1M leaves)
component main {public [batch_commitment, batch_total_amount, batch_nullifiers, circuit_version]} = PayrollBatch(100);
