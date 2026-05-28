pragma circom 2.2.0;

include "circomlib/poseidon.circom";

template MerkleTreeVerifier(depth) {
    signal input leaf;
    signal input root;
    signal input siblings[depth];
    signal input indices[depth];

    signal cur[depth + 1];
    signal left[depth];
    signal right[depth];
    signal diff1[depth];
    signal diff2[depth];
    component hash[depth];

    for (var i = 0; i < depth; i++) {
        hash[i] = Poseidon(2);
    }

    cur[0] <== leaf;

    for (var i = 0; i < depth; i++) {
        diff1[i] <== siblings[i] - cur[i];
        left[i] <== cur[i] + indices[i] * diff1[i];
        diff2[i] <== cur[i] - siblings[i];
        right[i] <== siblings[i] + indices[i] * diff2[i];
        hash[i].inputs[0] <== left[i];
        hash[i].inputs[1] <== right[i];
        cur[i + 1] <== hash[i].out;
    }

    root === cur[depth];
}

template NullifierComputer() {
    signal input employer_address;
    signal input batch_commitment;
    signal input payment_index;
    signal input expected_nullifier;

    component hash = Poseidon(3);
    hash.inputs[0] <== employer_address;
    hash.inputs[1] <== batch_commitment;
    hash.inputs[2] <== payment_index;

    expected_nullifier === hash.out;
}

template AmountRangeCheck() {
    signal input amount;

    signal positive;
    positive <-- amount > 0;
    positive === 1;

    signal bits[64];
    var acc = 0;
    for (var i = 0; i < 64; i++) {
        bits[i] <-- (amount >> i) & 1;
        bits[i] * (bits[i] - 1) === 0;
        acc += bits[i] * (1 << i);
    }
    acc === amount;
}

template PayrollBatch(num_recipients) {
    signal input batch_commitment;
    signal input batch_total_amount;
    signal input batch_nullifiers[num_recipients];
    signal input circuit_version;

    signal input employer_address;
    signal input recipient_addresses[num_recipients];
    signal input payment_amounts[num_recipients];
    signal input stream_durations[num_recipients];
    signal input merkle_proofs[num_recipients][20];
    signal input merkle_proof_indices[num_recipients][20];

    component rangeCheck[num_recipients];
    component leafHash[num_recipients];
    component merkleVerifier[num_recipients];
    component nullifierCheck[num_recipients];
    signal total_sum[num_recipients + 1];

    total_sum[0] <== 0;

    for (var i = 0; i < num_recipients; i++) {
        rangeCheck[i] = AmountRangeCheck();
        leafHash[i] = Poseidon(3);
        merkleVerifier[i] = MerkleTreeVerifier(20);
        nullifierCheck[i] = NullifierComputer();
    }

    for (var i = 0; i < num_recipients; i++) {
        rangeCheck[i].amount <== payment_amounts[i];

        leafHash[i].inputs[0] <== recipient_addresses[i];
        leafHash[i].inputs[1] <== payment_amounts[i];
        leafHash[i].inputs[2] <== stream_durations[i];

        merkleVerifier[i].leaf <== leafHash[i].out;
        merkleVerifier[i].root <== batch_commitment;
        for (var j = 0; j < 20; j++) {
            merkleVerifier[i].siblings[j] <== merkle_proofs[i][j];
            merkleVerifier[i].indices[j] <== merkle_proof_indices[i][j];
        }

        nullifierCheck[i].employer_address <== employer_address;
        nullifierCheck[i].batch_commitment <== batch_commitment;
        nullifierCheck[i].payment_index <== i;
        nullifierCheck[i].expected_nullifier <== batch_nullifiers[i];

        total_sum[i + 1] <== total_sum[i] + payment_amounts[i];
    }

    total_sum[num_recipients] === batch_total_amount;
    circuit_version === 1;
}

component main {public [batch_commitment, batch_total_amount, batch_nullifiers, circuit_version]} = PayrollBatch(2);
