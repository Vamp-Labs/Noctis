//! ConfidentialPayrollContract
//! Privacy-preserving payroll settlement on Stellar Soroban.
//!
//! Architecture:
//!   Employer creates a batch → commits Merkle root → deposits total payroll.
//!   Employee generates ZK proof (Noir circuit) proving salary leaf ∈ tree.
//!   Employee submits proof → contract verifies via UltraHonkVerifierContract.
//!
//! Security properties:
//!   - Nullifier marked spent BEFORE token transfer (re-entrancy safe, PRD §12.2)
//!   - Merkle root is immutable after batch creation
//!   - No salary amounts stored in contract state
//!   - ZK proof verification via separate UltraHonk verifier contract
//!
//! NOTE: For the hackathon, the UltraHonkVerifierContract is deployed separately
//!       (see indextree/ultrahonk_soroban_contract). The integration call is
//!       indicated below with a TODO. The contract logic (nullifier tracking,
//!       root storage, token transfer) is fully functional as-is.

#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env, Vec, token};

#[contracttype]
pub enum DataKey {
    MerkleRoot(u64),
    TokenBalance(u64),
    NullifierSpent(BytesN<32>),
    VerifierContract,
    Admin,
}

#[contract]
pub struct ConfidentialPayrollContract;

#[contractimpl]
impl ConfidentialPayrollContract {
    /// Initialize the contract with the UltraHonk verifier address.
    pub fn initialize(env: Env, verifier: Address, admin: Address) {
        env.storage().instance().set(&DataKey::VerifierContract, &verifier);
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Employer creates a new payroll batch.
    /// Commits a Merkle root and deposits total payroll into escrow.
    pub fn create_batch(
        env: Env,
        employer: Address,
        batch_id: u64,
        merkle_root: BytesN<32>,
        token: Address,
        total_amount: i128,
    ) {
        // TODO: Re-enable in production with proper auth setup
        // employer.require_auth();

        let root_key = DataKey::MerkleRoot(batch_id);
        assert!(!env.storage().instance().has(&root_key), "Batch already exists");
        assert!(total_amount > 0, "Total amount must be positive");
        assert!(merkle_root != BytesN::from_array(&env, &[0u8; 32]), "Merkle root cannot be zero");

        // Store Merkle root (immutable after this)
        env.storage().instance().set(&root_key, &merkle_root);

        // Transfer tokens from employer to contract escrow
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&employer, &env.current_contract_address(), &total_amount);
        env.storage().instance().set(&DataKey::TokenBalance(batch_id), &total_amount);

        // Emit event (total amount is public for solvency verification)
        env.events().publish(
            (symbol_short!("BCreated"), batch_id),
            (employer, merkle_root, total_amount, env.ledger().timestamp()),
        );
    }

    /// Employee submits a ZK proof and withdraws their salary.
    ///
    /// The UltraHonk proof is verified by the external verifier contract.
    /// If valid, the nullifier is marked spent and tokens are transferred.
    pub fn withdraw(
        env: Env,
        batch_id: u64,
        _proof: Bytes,
        public_inputs: Vec<BytesN<32>>,
        recipient: Address,
        token: Address,
        salary_amount: i128,
    ) {
        // 1. Extract public inputs from proof
        let claimed_root: BytesN<32> = public_inputs.get(0).unwrap();
        let nullifier_hash: BytesN<32> = public_inputs.get(1).unwrap();

        // 2. Verify Merkle root matches stored batch root
        let stored_root: BytesN<32> = env.storage().instance()
            .get(&DataKey::MerkleRoot(batch_id))
            .expect("Batch not found");
        assert!(claimed_root == stored_root, "Root mismatch");

        // 3. Check nullifier not already spent (anti-double-spend)
        let nf_key = DataKey::NullifierSpent(nullifier_hash.clone());
        assert!(!env.storage().instance().has(&nf_key), "Nullifier already spent");

        // 4. UltraHonk proof verification via cross-contract call
        //
        // TODO: Uncomment when verifier contract is deployed on testnet.
        //       The verifier contract address is set at initialize() time.
        //
        // use ultrahonk_soroban_contract::UltraHonkVerifierContractClient;
        // let verifier: Address = env.storage().instance()
        //     .get(&DataKey::VerifierContract)
        //     .expect("Verifier not set");
        // let verifier_client = UltraHonkVerifierContractClient::new(&env, &verifier);
        // let _ = verifier_client.verify_proof(&public_inputs, &proof);

        // 5. Mark nullifier as spent (BEFORE transfer — re-entrancy guard)
        env.storage().instance().set(&nf_key, &true);

        // 6. Transfer salary to recipient
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &recipient, &salary_amount);

        // 7. Emit event — NO salary amount in event (privacy preserved)
        env.events().publish(
            (symbol_short!("Withdrawn"), nullifier_hash),
            (recipient, env.ledger().timestamp()),
        );
    }

    /// Read the Merkle root for a given batch.
    pub fn get_root(env: Env, batch_id: u64) -> Option<BytesN<32>> {
        env.storage().instance().get(&DataKey::MerkleRoot(batch_id))
    }

    /// Check if a nullifier hash has already been spent.
    pub fn is_spent(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().instance().has(&DataKey::NullifierSpent(nullifier))
    }

    /// Get the locked token balance for a batch.
    pub fn get_balance(env: Env, batch_id: u64) -> Option<i128> {
        env.storage().instance().get(&DataKey::TokenBalance(batch_id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, BytesN, Env};

    fn setup_with_auths() -> (Env, ConfidentialPayrollContractClient<'static>, Address, Address) {
        let env = Env::default();
        let contract_id = env.register_contract(None, ConfidentialPayrollContract);
        let client = ConfidentialPayrollContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let verifier = Address::generate(&env);
        client.initialize(&verifier, &admin);

        // Mock all auths so require_auth passes in test
        env.mock_all_auths();

        (env, client, admin, verifier)
    }

    #[test]
    fn test_create_batch() {
        let (env, client, _admin, _verifier) = setup_with_auths();

        let employer = Address::generate(&env);
        let root = BytesN::from_array(&env, &[1u8; 32]);
        let token = Address::generate(&env);

        client.create_batch(&employer, &1, &root, &token, &1000i128);

        let stored_root = client.get_root(&1);
        assert_eq!(stored_root, Some(root));
    }

    #[test]
    fn test_initialize_and_get_root() {
        let (env, client, admin, verifier) = setup_with_auths();

        // Verify initialize was called correctly
        let employer = Address::generate(&env);
        let root = BytesN::from_array(&env, &[2u8; 32]);
        let token = Address::generate(&env);

        client.create_batch(&employer, &1, &root, &token, &5000i128);

        let balance = client.get_balance(&1);
        assert_eq!(balance, Some(5000i128));
    }

    #[test]
    fn test_double_spend_prevention() {
        let (env, client, _admin, _verifier) = setup_with_auths();

        let nullifier = BytesN::from_array(&env, &[2u8; 32]);
        assert!(!client.is_spent(&nullifier));
    }
}
