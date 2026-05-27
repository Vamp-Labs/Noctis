#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, symbol_short, token,
    Address, Bytes, BytesN, Env, Symbol, Vec,
};

/// Error codes for Payroll Dispatcher contract
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
    BatchNotFound = 11,
    StreamCreationFailed = 12,
    YieldRoutingFailed = 13,
    InvalidProofLength = 14,
    RecipientCountMismatch = 15,
    NoRecipients = 16,
    AmountZero = 17,
    TrustedSetupMismatch = 18,
    CrossContractCallFailed = 19,
}

/// Storage keys for Payroll Dispatcher contract
#[contracttype]
pub enum DataKey {
    Admin,                              // Address
    Paused,                             // bool
    BatchCount,                         // u32
    Batch(u32),                         // BatchMetadata
    BatchRoot(u32),                     // BytesN<32> — Merkle root per batch
    Stream(u32, u32),                   // InternalStream — (batch_id, stream_index)
    NullifierSet(BytesN<32>),           // bool — used nullifiers
    Token,                              // Address — payroll token (USDC)
    TrustedSetupHash,                   // BytesN<32> — SHA256 of ZK verification key
}

/// Batch status enum
#[contracttype]
pub enum BatchStatus {
    Pending,
    Verified,
    Processing,
    Completed,
    Failed,
}

/// Metadata about a processed batch
#[contracttype]
pub struct BatchMetadata {
    pub id: u32,
    pub employer: Address,
    pub total_amount: i128,
    pub token: Address,
    pub recipient_count: u32,
    pub timestamp: u64,
    pub status: BatchStatus,
    pub stream_count: u32,
    pub nullifier_count: u32,
}

/// Input structure for batch processing
#[contracttype]
pub struct PayrollBatch {
    pub employer: Address,
    pub total_amount: i128,
    pub commitment_root: BytesN<32>,
    pub zk_proof: Bytes,
    pub nullifiers: Vec<BytesN<32>>,
    pub recipients: Vec<Address>,
    pub amounts: Vec<i128>,
    pub stream_durations: Vec<u64>,
}

/// Tracks a stream internally within the dispatcher
/// For MVP: streams are tracked inside the dispatcher rather than via cross-contract calls
#[contracttype]
pub struct InternalStream {
    pub id: u32,
    pub employer: Address,
    pub employee: Address,
    pub token: Address,
    pub total_amount: i128,
    pub amount_per_second: i128,
    pub start_time: u64,
    pub stop_time: u64,
    pub total_claimed: i128,
    pub active: bool,
}

/// Policy check configuration (inline for MVP)
#[contracttype]
pub struct PolicyConfig {
    pub employer_max_amount: i128,
    pub employer_period_limit: i128,
}

/// Events emitted by the Payroll Dispatcher contract
#[contractevent]
pub struct BatchProcessedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub batch_id: u32,
    pub employer: Address,
    pub total_amount: i128,
    pub recipient_count: u32,
}

#[contractevent]
pub struct PausedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub action: Symbol,
}

#[contractevent]
pub struct UnpausedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub action: Symbol,
}

/// The main Payroll Dispatcher contract
/// Processes ZK-private batch payroll with inline stream creation
/// For MVP: self-contained (no cross-contract calls)
#[contract]
pub struct PayrollDispatcher;

#[contractimpl]
impl PayrollDispatcher {
    /// Initialize contract with admin address
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    /// Configure token and trusted setup hash (admin only)
    pub fn configure(
        env: Env,
        token: Address,
        trusted_setup_hash: BytesN<32>,
    ) -> Result<(), Error> {
        let admin: Address = env
            .storage().instance()
            .get(&DataKey::Admin)
            .unwrap();
        admin.require_auth();

        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance()
            .set(&DataKey::TrustedSetupHash, &trusted_setup_hash);

        Ok(())
    }

    /// Process a batch payroll with ZK privacy
    /// For MVP: self-contained — handles policy, ZK, streams, and yield tracking inline
    pub fn process_batch(env: Env, batch: PayrollBatch) -> Result<u32, Error> {
        // ---- ACCESS CONTROL ----
        batch.employer.require_auth();

        // ---- GUARDS ----
        if env
            .storage().instance()
            .get::<_, bool>(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(Error::ContractPaused);
        }

        // ---- VALIDATION ----
        if batch.recipients.is_empty() {
            return Err(Error::NoRecipients);
        }
        if batch.recipients.len() != batch.amounts.len() {
            return Err(Error::RecipientCountMismatch);
        }
        if batch.recipients.len() != batch.nullifiers.len() {
            return Err(Error::RecipientCountMismatch);
        }
        if batch.total_amount <= 0 {
            return Err(Error::AmountZero);
        }

        // Verify sum of amounts equals total_amount
        let mut sum: i128 = 0;
        for i in 0..batch.amounts.len() {
            let amt = batch.amounts.get(i).unwrap();
            if amt <= 0 {
                return Err(Error::InvalidBatchFormat);
            }
            sum = sum.checked_add(amt).ok_or(Error::InvalidBatchFormat)?;
        }
        if sum != batch.total_amount {
            return Err(Error::AmountMismatch);
        }

        // ---- POLICY CHECK (inline for MVP) ----
        // Note: Policy configuration storage is reserved for future use.
        // Currently defaults to no cap (i128::MAX).
        let employer_max: i128 = i128::MAX;
        if batch.total_amount > employer_max {
            return Err(Error::PolicyViolation);
        }

        // ---- NULLIFIER CHECK ----
        for i in 0..batch.nullifiers.len() {
            let nullifier = batch.nullifiers.get(i).unwrap();
            if env
                .storage().instance()
                .has(&DataKey::NullifierSet(nullifier))
            {
                return Err(Error::NullifierAlreadyUsed);
            }
        }

        // ---- ZK PROOF VERIFICATION ----
        let proof_valid =
            Self::verify_zk_proof_internal(&env, &batch.commitment_root, &batch.zk_proof);
        if !proof_valid {
            return Err(Error::ProofInvalid);
        }

        // ---- MERKLE ROOT VERIFICATION ----
        let computed_root =
            Self::compute_merkle_root(&env, &batch.recipients, &batch.amounts);
        if computed_root != batch.commitment_root {
            return Err(Error::RootMismatch);
        }

        // ---- CREATE BATCH ID ----
        let batch_count = env
            .storage().instance()
            .get::<_, u32>(&DataKey::BatchCount)
            .unwrap_or(0);
        let batch_id = batch_count + 1;

        // ---- CREATE INTERNAL STREAMS ----
        let token: Address = env
            .storage().instance()
            .get(&DataKey::Token)
            .unwrap();

        let mut stream_count: u32 = 0;
        let now = env.ledger().timestamp();

        for i in 0..batch.recipients.len() {
            let employee = batch.recipients.get(i).unwrap();
            let amount = batch.amounts.get(i).unwrap();
            let duration = if i < batch.stream_durations.len() {
                batch.stream_durations.get(i).unwrap()
            } else {
                86400u64 // Default: 1 day
            };

            let amount_per_second = if duration > 0 {
                amount / (duration as i128)
            } else {
                amount
            };

            // GUARD: amount_per_second must be > 0 to prevent silent stream drop.
            // Integer division truncation: if amount < duration, result is 0.
            // Reject the batch instead of silently losing the stream.
            if amount_per_second == 0 {
                return Err(Error::InvalidBatchFormat);
            }

            {
                let stream = InternalStream {
                    id: stream_count + 1,
                    employer: batch.employer.clone(),
                    employee,
                    token: token.clone(),
                    total_amount: amount,
                    amount_per_second,
                    start_time: now,
                    stop_time: now + duration,
                    total_claimed: 0,
                    active: true,
                };

                // Store stream under batch_id + stream index
                env.storage().instance()
                    .set(&DataKey::Stream(batch_id, stream_count + 1), &stream);
                stream_count += 1;
            }
        }

        // ---- EMIT NULLIFIERS ----
        let mut nullifier_count: u32 = 0;
        for i in 0..batch.nullifiers.len() {
            let nullifier = batch.nullifiers.get(i).unwrap();
            env.storage().instance()
                .set(&DataKey::NullifierSet(nullifier), &true);
            nullifier_count += 1;
        }

        // ---- TRANSFER TOKENS ----
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(
            &batch.employer,
            env.current_contract_address(),
            &batch.total_amount,
        );

        // ---- STORE BATCH METADATA ----
        let metadata = BatchMetadata {
            id: batch_id,
            employer: batch.employer.clone(),
            total_amount: batch.total_amount,
            token: token.clone(),
            recipient_count: batch.recipients.len(),
            timestamp: now,
            status: BatchStatus::Completed,
            stream_count,
            nullifier_count,
        };

        env.storage().instance()
            .set(&DataKey::Batch(batch_id), &metadata);
        env.storage().instance()
            .set(&DataKey::BatchRoot(batch_id), &batch.commitment_root);
        env.storage().instance()
            .set(&DataKey::BatchCount, &batch_id);

        // ---- EMIT EVENTS ----
        BatchProcessedEvent {
            contract: symbol_short!("payroll"),
            event_type: symbol_short!("batch"),
            batch_id,
            employer: batch.employer,
            total_amount: batch.total_amount,
            recipient_count: batch.recipients.len(),
        }.publish(&env);

        Ok(batch_id)
    }

    /// Claim from an internal stream
    pub fn claim_stream(
        env: Env,
        batch_id: u32,
        stream_index: u32,
    ) -> Result<i128, Error> {
        let mut stream: InternalStream = env
            .storage().instance()
            .get(&DataKey::Stream(batch_id, stream_index))
            .ok_or(Error::StreamCreationFailed)?;

        stream.employee.require_auth();

        if !stream.active {
            return Err(Error::StreamCreationFailed);
        }

        let now = env.ledger().timestamp();
        let effective_end = if stream.stop_time < now {
            stream.stop_time
        } else {
            now
        };

        let elapsed = effective_end.saturating_sub(stream.start_time);

        // Use i128 arithmetic to avoid overflow (amount_per_second is i128).
        // The `as u64` cast is safe here because realistic amounts per second
        // fit in u64, and we cap elapsed to stream duration.
        let gross_accrued = (stream.amount_per_second as u128).saturating_mul(elapsed as u128);
        let gross_accrued_i128 = gross_accrued.min(i128::MAX as u128) as i128;
        let claimable = gross_accrued_i128 - stream.total_claimed;
        let remaining = stream.total_amount - stream.total_claimed;

        let actual_claim = if claimable > remaining {
            remaining
        } else if claimable < 0 {
            0
        } else {
            claimable
        };

        if actual_claim <= 0 {
            return Err(Error::StreamCreationFailed);
        }

        let token_client = token::Client::new(&env, &stream.token);
        token_client.transfer(
            &env.current_contract_address(),
            &stream.employee,
            &actual_claim,
        );

        stream.total_claimed += actual_claim;
        env.storage().instance()
            .set(&DataKey::Stream(batch_id, stream_index), &stream);

        Ok(actual_claim)
    }

    /// Internal ZK proof verification
    /// Uses Protocol 25 X-Ray BLS12-381 host functions for Groth16 verification
    fn verify_zk_proof_internal(
        env: &Env,
        commitment_root: &BytesN<32>,
        proof: &Bytes,
    ) -> bool {
        // Groth16 proof on BLS12-381 is 192 bytes:
        // - π_A (G1): 48 bytes compressed
        // - π_B (G2): 96 bytes compressed
        // - π_C (G1): 48 bytes compressed
        if proof.len() != 192 {
            return false;
        }

        // Verify the trusted setup hash matches
        // ─── SECURITY NOTE: GROTH16 VERIFICATION IS A STUB ──────────────
        // WARNING: This function does NOT perform actual BLS12-381 pairing verification.
        // It only validates proof format (length checks, non-zero root).
        //
        // What's needed for production:
        //   1. Load the verification key using DataKey::TrustedSetupHash
        //   2. Use Protocol 26 BLS12-381 host functions (env.bls12_381_*()):
        //      - parse proof components: π_A (G1, 48 bytes), π_B (G2, 96 bytes), π_C (G1, 48 bytes)
        //      - compute Fiat-Shamir challenge e = hash(public_inputs || proof)
        //      - perform pairing check: e(π_A, VK_B) * e(VK_A, π_B) * e(π_C, VK_C) == 1
        //      where VK_A, VK_B, VK_C are the verification key components
        //   3. Verify commitment_root matches the public input
        //   4. Verify the trusted setup hash matches the stored value
        //
        // Reference: Protocol 25 X-Ray BLS12-381 host function spec
        // Tracking issue: SEC-001-CRIT-001
        // ──────────────────────────────────────────────────────────────

        // Fetch trusted setup hash for verification key binding
        let _trusted_hash: BytesN<32> = env
            .storage().instance()
            .get(&DataKey::TrustedSetupHash)
            .unwrap();

        // Parse proof components
        // [0..48]:   π_A (G1 compressed)
        // [48..144]: π_B (G2 compressed)
        // [144..192]: π_C (G1 compressed)
        let pi_a = proof.slice(0..48);
        let pi_b = proof.slice(48..144);
        let pi_c = proof.slice(144..192);

        // Validate commitment_root is non-zero
        let root_is_valid = commitment_root.to_array() != [0u8; 32];

        // Validate that proof components have correct lengths
        let pi_a_valid = pi_a.len() == 48;
        let pi_b_valid = pi_b.len() == 96;
        let pi_c_valid = pi_c.len() == 48;

        // Stub: only format checks. See security note above.
        root_is_valid && pi_a_valid && pi_b_valid && pi_c_valid
    }

    /// Compute a Merkle root from recipient addresses and amounts
    /// Uses SHA256-based binary Merkle tree
    fn compute_merkle_root(
        env: &Env,
        recipients: &Vec<Address>,
        amounts: &Vec<i128>,
    ) -> BytesN<32> {
        let mut leaves: Vec<BytesN<32>> = Vec::new(env);

        // Hash each (recipient, amount) pair into a leaf using Bytes
        for i in 0..recipients.len() {
            let recipient = recipients.get(i).unwrap();
            let amount = amounts.get(i).unwrap();

            // Build leaf data: hash(recipient_address_bytes ++ amount_bytes)
            let mut leaf_data = Bytes::new(env);

            // Serialize recipient address into bytes using to_bytes()
            let rec_bytes = recipient.to_string().to_bytes();
            for j in 0..rec_bytes.len() {
                leaf_data.push_back(rec_bytes.get(j).unwrap());
            }

            // Serialize amount into bytes (16 bytes for i128/u128)
            let amt_bytes = (amount as u128).to_be_bytes();
            for &byte in &amt_bytes {
                leaf_data.push_back(byte);
            }

            let leaf_hash: BytesN<32> = env.crypto().sha256(&leaf_data).into();
            leaves.push_back(leaf_hash);
        }

        // Build Merkle tree bottom-up
        while leaves.len() > 1 {
            let mut new_level: Vec<BytesN<32>> = Vec::new(env);

            let mut j = 0;
            while j < leaves.len() {
                let left = leaves.get(j).unwrap();
                if j + 1 < leaves.len() {
                    let right = leaves.get(j + 1).unwrap();
                    // Hash(left || right)
                    let mut combined = Bytes::new(env);
                    let left_arr = left.to_array();
                    let right_arr = right.to_array();
                    for &byte in &left_arr {
                        combined.push_back(byte);
                    }
                    for &byte in &right_arr {
                        combined.push_back(byte);
                    }
                    let parent_hash: BytesN<32> = env.crypto().sha256(&combined).into();
                    new_level.push_back(parent_hash);
                } else {
                    // Odd leaf — propagate up
                    new_level.push_back(left);
                }
                j += 2;
            }

            leaves = new_level;
        }

        // Return the root (last remaining element)
        leaves.get(0).unwrap()
    }

    /// Verify a nullifier has not been used before
    pub fn verify_nullifier(env: Env, nullifier: BytesN<32>) -> bool {
        !env
            .storage().instance()
            .has(&DataKey::NullifierSet(nullifier))
    }

    /// Get batch metadata by ID
    pub fn get_batch(env: Env, batch_id: u32) -> Result<BatchMetadata, Error> {
        env.storage().instance()
            .get(&DataKey::Batch(batch_id))
            .ok_or(Error::BatchNotFound)
    }

    /// Get batch Merkle root by ID
    pub fn get_batch_root(env: Env, batch_id: u32) -> Result<BytesN<32>, Error> {
        env.storage().instance()
            .get(&DataKey::BatchRoot(batch_id))
            .ok_or(Error::BatchNotFound)
    }

    /// Get total batch count
    pub fn get_batch_count(env: Env) -> u32 {
        env.storage().instance()
            .get::<_, u32>(&DataKey::BatchCount)
            .unwrap_or(0)
    }

    /// Get the stored trusted setup hash
    pub fn get_trusted_setup_hash(env: Env) -> BytesN<32> {
        env.storage().instance()
            .get(&DataKey::TrustedSetupHash)
            .unwrap()
    }

    /// Emergency pause (admin only)
    pub fn pause(env: Env) {
        let admin: Address = env
            .storage().instance()
            .get(&DataKey::Admin)
            .unwrap();
        admin.require_auth();
        env.storage().instance()
            .set(&DataKey::Paused, &true);
        PausedEvent {
            contract: symbol_short!("payroll"),
            action: symbol_short!("paused"),
        }.publish(&env);
    }

    /// Emergency unpause (admin only)
    pub fn unpause(env: Env) {
        let admin: Address = env
            .storage().instance()
            .get(&DataKey::Admin)
            .unwrap();
        admin.require_auth();
        env.storage().instance()
            .set(&DataKey::Paused, &false);
        UnpausedEvent {
            contract: symbol_short!("payroll"),
            action: symbol_short!("unpaused"),
        }.publish(&env);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Ledger}, vec, Env};

    #[test]
    fn test_constructor_and_configure() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let setup_hash = BytesN::from_array(&env, &[1u8; 32]);

        let contract_id = env.register(PayrollDispatcher, (&admin,));
        let client = PayrollDispatcherClient::new(&env, &contract_id);

        client.configure(&token, &setup_hash);
    }

    #[test]
    fn test_compute_merkle_root_basic() {
        let env = Env::default();
        env.mock_all_auths();

        let recipient1 = Address::generate(&env);
        let recipient2 = Address::generate(&env);
        let recipient3 = Address::generate(&env);

        let recipients = vec![&env, recipient1, recipient2, recipient3];
        let amounts = vec![&env, 1000i128, 2000i128, 3000i128];

        let root = PayrollDispatcher::compute_merkle_root(&env, &recipients, &amounts);

        // Root should be non-zero (32 bytes)
        assert!(root.to_array() != [0u8; 32]);
    }

    #[test]
    fn test_compute_merkle_root_deterministic() {
        let env = Env::default();
        env.mock_all_auths();

        let recipient1 = Address::generate(&env);
        let recipient2 = Address::generate(&env);

        let recipients = vec![&env, recipient1.clone(), recipient2.clone()];
        let amounts = vec![&env, 1000i128, 2000i128];

        let root1 = PayrollDispatcher::compute_merkle_root(&env, &recipients, &amounts);
        let root2 = PayrollDispatcher::compute_merkle_root(&env, &recipients, &amounts);

        // Same inputs must produce same root
        assert_eq!(root1, root2);
    }

    #[test]
    fn test_verify_nullifier_fresh() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);

        let contract_id = env.register(PayrollDispatcher, (&admin,));
        let client = PayrollDispatcherClient::new(&env, &contract_id);

        let nullifier = BytesN::from_array(&env, &[42u8; 32]);
        assert!(client.verify_nullifier(&nullifier));
    }

    #[test]
    fn test_nullifier_used_after_batch() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let employee = Address::generate(&env);

        // Register a token and mint to employer
        let token_asset = env.register_stellar_asset_contract_v2(employer.clone());
        let token_id = token_asset.address();
        let token_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_id);
        token_client.mint(&employer, &10000);

        let setup_hash = BytesN::from_array(&env, &[1u8; 32]);

        // Build a valid 192-byte proof
        let mut proof_bytes = [0u8; 192];
        proof_bytes[0] = 0x02;
        proof_bytes[48] = 0x0A;
        proof_bytes[144] = 0x02;
        let proof = Bytes::from_array(&env, &proof_bytes);

        let nullifier = BytesN::from_array(&env, &[1u8; 32]);

        let contract_id = env.register(PayrollDispatcher, (&admin,));
        let client = PayrollDispatcherClient::new(&env, &contract_id);

        client.configure(&token_id, &setup_hash);

        // Compute the actual Merkle root
        // Use amount divisible by duration to ensure stream is created
        let recipients = vec![&env, employee.clone()];
        let amounts = vec![&env, 3600i128];
        let durations = vec![&env, 3600u64];
        let actual_root =
            PayrollDispatcher::compute_merkle_root(&env, &recipients, &amounts);

        let batch = PayrollBatch {
            employer: employer.clone(),
            total_amount: 3600,
            commitment_root: actual_root,
            zk_proof: proof.clone(),
            nullifiers: vec![&env, nullifier.clone()],
            recipients: recipients.clone(),
            amounts: amounts.clone(),
            stream_durations: durations.clone(),
        };

        // First batch should succeed
        client.process_batch(&batch);

        // Nullifier should now be used
        assert!(!client.verify_nullifier(&nullifier));
    }

    #[test]
    fn test_pause_unpause() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);

        let contract_id = env.register(PayrollDispatcher, (&admin,));
        let client = PayrollDispatcherClient::new(&env, &contract_id);

        client.pause();
        client.unpause();
        // No panic = success
    }

    #[test]
    fn test_batch_count() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);

        let contract_id = env.register(PayrollDispatcher, (&admin,));
        let client = PayrollDispatcherClient::new(&env, &contract_id);

        assert_eq!(client.get_batch_count(), 0);
    }

    #[test]
    fn test_trusted_setup_hash() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let setup_hash = BytesN::from_array(&env, &[42u8; 32]);

        let contract_id = env.register(PayrollDispatcher, (&admin,));
        let client = PayrollDispatcherClient::new(&env, &contract_id);

        client.configure(&token, &setup_hash);

        let stored_hash = client.get_trusted_setup_hash();
        assert_eq!(stored_hash, setup_hash);
    }

    #[test]
    fn test_empty_batch_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);

        let contract_id = env.register(PayrollDispatcher, (&admin,));
        let client = PayrollDispatcherClient::new(&env, &contract_id);

        let empty_batch = PayrollBatch {
            employer: employer.clone(),
            total_amount: 0,
            commitment_root: BytesN::from_array(&env, &[0u8; 32]),
            zk_proof: Bytes::new(&env),
            nullifiers: vec![&env],
            recipients: vec![&env],
            amounts: vec![&env],
            stream_durations: vec![&env],
        };

        let result = client.try_process_batch(&empty_batch).unwrap_err().unwrap();
        assert_eq!(result, Error::NoRecipients);
    }

    #[test]
    fn test_amount_mismatch_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let employee = Address::generate(&env);
        let token = Address::generate(&env);
        let setup_hash = BytesN::from_array(&env, &[1u8; 32]);

        let proof = Bytes::from_array(&env, &[0u8; 192]);

        let contract_id = env.register(PayrollDispatcher, (&admin,));
        let client = PayrollDispatcherClient::new(&env, &contract_id);

        client.configure(&token, &setup_hash);

        let batch = PayrollBatch {
            employer,
            total_amount: 500, // Does NOT match sum(amounts) = 1000 + 2000 = 3000
            commitment_root: BytesN::from_array(&env, &[2u8; 32]),
            zk_proof: proof,
            nullifiers: vec![&env, BytesN::from_array(&env, &[1u8; 32]), BytesN::from_array(&env, &[2u8; 32])],
            recipients: vec![&env, employee.clone(), Address::generate(&env)],
            amounts: vec![&env, 1000i128, 2000i128],
            stream_durations: vec![&env, 3600u64, 3600u64],
        };

        let result = client.try_process_batch(&batch).unwrap_err().unwrap();
        assert_eq!(result, Error::AmountMismatch);
    }

    #[test]
    fn test_claim_stream() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let employee = Address::generate(&env);

        // Register a token and mint to employer
        let token_asset = env.register_stellar_asset_contract_v2(employer.clone());
        let token_id = token_asset.address();
        let token_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_id);
        token_client.mint(&employer, &10000);

        let setup_hash = BytesN::from_array(&env, &[1u8; 32]);

        let contract_id = env.register(PayrollDispatcher, (&admin,));
        let client = PayrollDispatcherClient::new(&env, &contract_id);

        client.configure(&token_id, &setup_hash);

        // Compute Merkle root
        // Use amount divisible by duration so amount_per_second > 0
        let recipients = vec![&env, employee.clone()];
        let amounts = vec![&env, 3600i128];
        let durations = vec![&env, 3600u64];
        let root = PayrollDispatcher::compute_merkle_root(&env, &recipients, &amounts);

        let mut proof_bytes = [0u8; 192];
        proof_bytes[0] = 0x02;
        proof_bytes[48] = 0x0A;
        proof_bytes[144] = 0x02;
        let proof = Bytes::from_array(&env, &proof_bytes);

        let batch = PayrollBatch {
            employer: employer.clone(),
            total_amount: 3600,
            commitment_root: root,
            zk_proof: proof,
            nullifiers: vec![&env, BytesN::from_array(&env, &[99u8; 32])],
            recipients,
            amounts,
            stream_durations: durations,
        };

        client.process_batch(&batch);

        // Advance time by 1 second and claim
        env.ledger().set_timestamp(1);
        let claimed = client.claim_stream(&1, &1);
        // After 1 second at 1 token/sec, should have 1 token accrued
        assert_eq!(claimed, 1);
    }
}
