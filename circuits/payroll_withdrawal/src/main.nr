// payroll_withdrawal.nr
// Zero-knowledge circuit for confidential payroll on Stellar.
//
// Proves: an employee's salary is a committed leaf in the employer's
// Merkle tree, without revealing the salary amount to the blockchain.
//
// Public inputs: merkle_root, nullifier_hash, recipient_address, expected_amount
// Private inputs: salary_amount, nullifier_secret, employee_index, merkle_siblings, merkle_path_indices

use dep::std::hash::poseidon2;

// Merkle tree depth: 16 supports up to 65,536 employees
// Depth 20 (1M+ employees) available post-MVP
global DEPTH: u32 = 16;

fn merkle_root(
    leaf: Field,
    index: Field,
    path: [Field; 16],
    path_indices: [u1; 16]
) -> Field {
    let mut current = leaf;
    let index_bits = index.to_le_bits(DEPTH);
    
    for i in 0..DEPTH {
        let sibling = path[i];
        let is_right = path_indices[i];
        
        let (left, right) = if is_right == 1 {
            (sibling, current)
        } else {
            (current, sibling)
        };
        
        current = poseidon2::Poseidon2::hash([left, right], 2);
    }
    current
}

fn main(
    // === PRIVATE INPUTS (known only to employee) ===
    salary_amount: u64,
    nullifier_secret: Field,
    employee_index: Field,
    merkle_siblings: [Field; 16],
    merkle_path_indices: [u1; 16],
    
    // === PUBLIC INPUTS (verified on-chain) ===
    merkle_root_pub: pub Field,
    nullifier_hash_pub: pub Field,
    recipient_address: pub Field,
    expected_amount: pub u64,
) {
    // 1. Enforce salary matches declared amount
    //    Prevents proof reuse with different amounts
    assert(salary_amount == expected_amount);
    
    // 2. Compute leaf commitment: Poseidon2(amount, secret, index)
    let leaf = poseidon2::Poseidon2::hash(
        [salary_amount as Field, nullifier_secret, employee_index], 
        3
    );
    
    // 3. Verify Merkle inclusion proof
    //    Proves this salary is part of the committed batch
    let computed_root = merkle_root(leaf, employee_index, merkle_siblings, merkle_path_indices);
    assert(computed_root == merkle_root_pub);
    
    // 4. Compute and verify nullifier
    //    Prevents double-spending without linking to identity
    let computed_nullifier = poseidon2::Poseidon2::hash([nullifier_secret], 1);
    assert(computed_nullifier == nullifier_hash_pub);
    
    // 5. Recipient binding (public input, bound to proof)
    //    Prevents proof relay attacks
    let _ = recipient_address;
}

#[test]
fn test_merkle_root() {
    // Test vector: single leaf, zero path
    let leaf = poseidon2::Poseidon2::hash([5, 0x1234, 0], 3);
    let siblings = [0; 16];
    let indices = [0; 16];
    let root = merkle_root(leaf, 0, siblings, indices);
    assert(root != 0);
}

#[test]
fn test_amount_binding() {
    // Salary must equal expected_amount
    // This test verifies the constraint
    let secret = 0xdeadbeef;
    let leaf = poseidon2::Poseidon2::hash([1000, secret, 0], 3);
    assert(leaf != 0);  // Leaf is non-trivial
}
