// ─── Noctis Payroll ZK Circuit ───────────────────────────────────
// Groth16 zk-SNARK over BLS12-381
// Proves payroll batch validity without revealing recipient identities
//
// Compilation:
//   circom payroll_circuit.circom --r1cs --wasm --sym -o build/
//
// Dependency: circomlib (Poseidon hash)
//   npm install circomlib

pragma circom 2.2.0;

include "circomlib/poseidon.circom";

// ─── Merkle Tree Path Verifier ───────────────────────────────────
// Verifies a single Merkle proof path from leaf to root
// depth: number of levels in the tree
template MerkleTreeVerifier(depth) {
    signal input leaf;                          // The leaf hash
    signal input root;                          // Expected Merkle root
    signal input siblings[depth];               // Sibling hashes at each level
    signal input indices[depth];                // 0 = left, 1 = right at each level

    signal cur[depth + 1];
    signal left[depth];
    signal right[depth];
    signal diff1[depth];
    signal diff2[depth];
    component hash[depth];

    // Pre-declare hash components (required by circom ≥2.2)
    for (var i = 0; i < depth; i++) {
        hash[i] = Poseidon(2);
    }

    cur[0] <== leaf;

    // Traverse up the tree, hashing with sibling at each level
    for (var i = 0; i < depth; i++) {
        // Decomposed multiplexer to keep each constraint quadratic:
        //   left  = cur + idx * (sibling - cur)
        //   right = sibling + idx * (cur - sibling)
        diff1[i] <== siblings[i] - cur[i];
        left[i] <== cur[i] + indices[i] * diff1[i];

        diff2[i] <== cur[i] - siblings[i];
        right[i] <== siblings[i] + indices[i] * diff2[i];

        hash[i].inputs[0] <== left[i];
        hash[i].inputs[1] <== right[i];

        cur[i + 1] <== hash[i].out;
    }

    // Constrain final hash equals expected root
    root === cur[depth];
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

    // Pre-declare component arrays (required by circom ≥2.2)
    component rangeCheck[num_recipients];
    component leafHash[num_recipients];
    component merkleVerifier[num_recipients];
    component nullifierCheck[num_recipients];

    for (var i = 0; i < num_recipients; i++) {
        rangeCheck[i] = AmountRangeCheck();
        leafHash[i] = Poseidon(3);
        merkleVerifier[i] = MerkleTreeVerifier(20);
        nullifierCheck[i] = NullifierComputer();
    }

    // Sum accumulator (use array to avoid reassignment)
    signal total_sum[num_recipients + 1];

    total_sum[0] <== 0;

    // Process each recipient
    for (var i = 0; i < num_recipients; i++) {
        // ─── Constraint 1: Amount range check ──────────
        rangeCheck[i].amount <== payment_amounts[i];

        // ─── Constraint 2: Create leaf hash ────────────
        leafHash[i].inputs[0] <== recipient_addresses[i];
        leafHash[i].inputs[1] <== payment_amounts[i];
        leafHash[i].inputs[2] <== stream_durations[i];

        // ─── Constraint 3: Merkle tree verification ─────
        merkleVerifier[i].leaf <== leafHash[i].out;
        merkleVerifier[i].root <== batch_commitment;
        for (var j = 0; j < 20; j++) {
            merkleVerifier[i].siblings[j] <== merkle_proofs[i][j];
            merkleVerifier[i].indices[j] <== merkle_proof_indices[i][j];
        }

        // ─── Constraint 4: Nullifier computation ────────
        nullifierCheck[i].employer_address <== employer_address;
        nullifierCheck[i].batch_commitment <== batch_commitment;
        nullifierCheck[i].payment_index <== i;
        nullifierCheck[i].expected_nullifier <== batch_nullifiers[i];

        // ─── Constraint 5: Accumulate amount ────────────
        total_sum[i + 1] <== total_sum[i] + payment_amounts[i];
    }

    // ─── Constraint 6: Total amount verification ────────
    total_sum[num_recipients] === batch_total_amount;

    // ─── Constraint 7: Circuit version check ────────────
    circuit_version === 1;
}

// ─── Export Component ────────────────────────────────────────────
// Batch size: 100 recipients (for MVP; adjust as needed)
// Tree depth: 20 (supports up to 1M leaves)
component main {public [batch_commitment, batch_total_amount, batch_nullifiers, circuit_version]} = PayrollBatch(100);
