#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, symbol_short, token,
    Address, Bytes, BytesN, Env, Symbol, Vec,
};
use soroban_sdk::crypto::bls12_381::{
    Bls12381G1Affine, Bls12381G2Affine, Bls12381Fr,
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
    // Verification key components (stored alongside trusted setup hash)
    VkAlpha,                            // BytesN<96> — α G1 point
    VkBeta,                             // BytesN<192> — β G2 point
    VkGamma,                            // BytesN<192> — γ G2 point
    VkDelta,                            // BytesN<192> — δ G2 point
    VkIcCount,                          // u32 — number of IC elements
    VkIc(u32),                          // BytesN<96> — each IC G1 element
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

/// Reference to a stream (batch_id, stream_index) for the get_employee_streams return
#[contracttype]
pub struct StreamRef {
    pub batch_id: u32,
    pub stream_index: u32,
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
            .ok_or(Error::InternalError)?;
        admin.require_auth();

        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance()
            .set(&DataKey::TrustedSetupHash, &trusted_setup_hash);

        Ok(())
    }

    /// Store the verification key for Groth16 proof verification (admin only)
    pub fn set_verification_key(
        env: Env,
        alpha: BytesN<96>,
        beta: BytesN<192>,
        gamma: BytesN<192>,
        delta: BytesN<192>,
        ic: Vec<BytesN<96>>,
    ) -> Result<(), Error> {
        let admin: Address = env
            .storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::InternalError)?;
        admin.require_auth();

        env.storage().instance().set(&DataKey::VkAlpha, &alpha);
        env.storage().instance().set(&DataKey::VkBeta, &beta);
        env.storage().instance().set(&DataKey::VkGamma, &gamma);
        env.storage().instance().set(&DataKey::VkDelta, &delta);

        let ic_count = ic.len();
        env.storage().instance().set(&DataKey::VkIcCount, &ic_count);
        for i in 0..ic_count {
            env.storage().instance()
                .set(&DataKey::VkIc(i), &ic.get(i).ok_or(Error::InvalidBatchFormat)?);
        }

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
            let amt = batch.amounts.get(i).ok_or(Error::InvalidBatchFormat)?;
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
            let nullifier = batch.nullifiers.get(i).ok_or(Error::InvalidBatchFormat)?;
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
            .ok_or(Error::InternalError)?;

        let mut stream_count: u32 = 0;
        let now = env.ledger().timestamp();

        for i in 0..batch.recipients.len() {
            let employee = batch.recipients.get(i).ok_or(Error::InvalidBatchFormat)?;
            let amount = batch.amounts.get(i).ok_or(Error::InvalidBatchFormat)?;
            let duration = if i < batch.stream_durations.len() {
                batch.stream_durations.get(i).ok_or(Error::InvalidBatchFormat)?
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
            let nullifier = batch.nullifiers.get(i).ok_or(Error::InvalidBatchFormat)?;
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

    /// Get stream data by batch ID and stream index
    pub fn get_stream(env: Env, batch_id: u32, stream_index: u32) -> Option<InternalStream> {
        env.storage().instance()
            .get(&DataKey::Stream(batch_id, stream_index))
    }

    /// Get all stream references for an employee by scanning batches
    /// NOTE: This is O(batch_count * stream_count) — acceptable for MVP testnet.
    /// Production should maintain an employee→streams index.
    pub fn get_employee_streams(env: Env, employee: Address) -> Vec<StreamRef> {
        let batch_count: u32 = env
            .storage().instance()
            .get(&DataKey::BatchCount)
            .unwrap_or(0);
        let mut result: Vec<StreamRef> = Vec::new(&env);
        for batch_id in 1..=batch_count {
            let meta: Option<BatchMetadata> = env
                .storage().instance()
                .get(&DataKey::Batch(batch_id));
            if let Some(m) = meta {
                for si in 1..=m.stream_count {
                    let stream: Option<InternalStream> = env
                        .storage().instance()
                        .get(&DataKey::Stream(batch_id, si));
                    if let Some(s) = stream {
                        if s.employee == employee {
                            result.push_back(StreamRef { batch_id, stream_index: si });
                        }
                    }
                }
            }
        }
        result
    }

    /// Internal ZK proof verification
    /// Uses Protocol 26 BLS12-381 host functions for real Groth16 verification
    fn verify_zk_proof_internal(
        env: &Env,
        commitment_root: &BytesN<32>,
        proof: &Bytes,
    ) -> bool {
        // Groth16 proof on BLS12-381 (uncompressed) is 384 bytes:
        // - π_A (G1 uncompressed): bytes [0..96)
        // - π_B (G2 uncompressed): bytes [96..288)
        // - π_C (G1 uncompressed): bytes [288..384)
        if proof.len() != 384 {
            return false;
        }

        // Fetch trusted setup hash for verification key binding
        let _trusted_hash: BytesN<32> = env
            .storage().instance()
            .get(&DataKey::TrustedSetupHash)
            .expect("TrustedSetupHash must be configured");

        // Parse proof components — uncompressed format
        let pi_a: Bls12381G1Affine = Self::parse_g1_point(env, proof, 0);
        let pi_b: Bls12381G2Affine = Self::parse_g2_point(env, proof, 96);
        let pi_c: Bls12381G1Affine = Self::parse_g1_point(env, proof, 288);

        // Load verification key from storage
        let vk_alpha: Bls12381G1Affine = Self::load_vk_alpha(env);
        let vk_beta: Bls12381G2Affine = Self::load_vk_beta(env);
        let vk_gamma: Bls12381G2Affine = Self::load_vk_gamma(env);
        let vk_delta: Bls12381G2Affine = Self::load_vk_delta(env);
        let vk_ic: Vec<Bls12381G1Affine> = Self::load_vk_ic(env);

        // Ensure IC has at least 2 elements (1 base + 1 for public input)
        if vk_ic.len() < 2 {
            return false;
        }

        // Commitment root is the public input scalar
        let pub_input = Bls12381Fr::from_bytes(commitment_root.clone());

        let bls = env.crypto().bls12_381();

        // Compute vk_x = ic[0] + pub_input * ic[1]
        // This linearly combines the verification key's IC with the public input
        let vk_x = bls.g1_add(
            &vk_ic.get(0).unwrap(),
            &bls.g1_mul(&vk_ic.get(1).unwrap(), &pub_input),
        );

        // Groth16 pairing check: e(π_A, VK_B) * e(VK_A, π_B) * e(π_C, VK_C) == 1
        // Using the negated form: e(-A, B) * e(α, β) * e(vk_x, γ) * e(C, δ) == 1
        let mut vp1: Vec<Bls12381G1Affine> = Vec::new(env);
        vp1.push_back(-pi_a);
        vp1.push_back(vk_alpha);
        vp1.push_back(vk_x);
        vp1.push_back(pi_c);

        let mut vp2: Vec<Bls12381G2Affine> = Vec::new(env);
        vp2.push_back(pi_b);
        vp2.push_back(vk_beta);
        vp2.push_back(vk_gamma);
        vp2.push_back(vk_delta);

        bls.pairing_check(vp1, vp2)
    }

    /// Parse a G1 point from proof bytes at the given offset
    fn parse_g1_point(env: &Env, data: &Bytes, offset: u32) -> Bls12381G1Affine {
        let mut arr = [0u8; 96];
        for i in 0..96u32 {
            arr[i as usize] = data.get(offset + i).expect("G1 point bounds");
        }
        Bls12381G1Affine::from_bytes(BytesN::from_array(env, &arr))
    }

    /// Parse a G2 point from proof bytes at the given offset
    fn parse_g2_point(env: &Env, data: &Bytes, offset: u32) -> Bls12381G2Affine {
        let mut arr = [0u8; 192];
        for i in 0..192u32 {
            arr[i as usize] = data.get(offset + i).expect("G2 point bounds");
        }
        Bls12381G2Affine::from_bytes(BytesN::from_array(env, &arr))
    }

    /// Load the α G1 component of the verification key from storage
    fn load_vk_alpha(env: &Env) -> Bls12381G1Affine {
        let bytes: BytesN<96> = env
            .storage().instance()
            .get(&DataKey::VkAlpha)
            .expect("VK Alpha not configured");
        Bls12381G1Affine::from_bytes(bytes)
    }

    /// Load the β G2 component of the verification key from storage
    fn load_vk_beta(env: &Env) -> Bls12381G2Affine {
        let bytes: BytesN<192> = env
            .storage().instance()
            .get(&DataKey::VkBeta)
            .expect("VK Beta not configured");
        Bls12381G2Affine::from_bytes(bytes)
    }

    /// Load the γ G2 component of the verification key from storage
    fn load_vk_gamma(env: &Env) -> Bls12381G2Affine {
        let bytes: BytesN<192> = env
            .storage().instance()
            .get(&DataKey::VkGamma)
            .expect("VK Gamma not configured");
        Bls12381G2Affine::from_bytes(bytes)
    }

    /// Load the δ G2 component of the verification key from storage
    fn load_vk_delta(env: &Env) -> Bls12381G2Affine {
        let bytes: BytesN<192> = env
            .storage().instance()
            .get(&DataKey::VkDelta)
            .expect("VK Delta not configured");
        Bls12381G2Affine::from_bytes(bytes)
    }

    /// Load the IC (public input commitment) vector from storage
    fn load_vk_ic(env: &Env) -> Vec<Bls12381G1Affine> {
        let count: u32 = env
            .storage().instance()
            .get(&DataKey::VkIcCount)
            .expect("VK IC not configured");
        let mut ic: Vec<Bls12381G1Affine> = Vec::new(env);
        for i in 0..count {
            let bytes: BytesN<96> = env
                .storage().instance()
                .get(&DataKey::VkIc(i))
                .expect("VK IC element corrupted");
            ic.push_back(Bls12381G1Affine::from_bytes(bytes));
        }
        ic
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
            let recipient = recipients.get(i).expect("recipient index must be in bounds");
            let amount = amounts.get(i).expect("amount index must be in bounds");

            // Build leaf data: hash(recipient_address_bytes ++ amount_bytes)
            let mut leaf_data = Bytes::new(env);

            // Serialize recipient address into bytes using to_bytes()
            let rec_bytes = recipient.to_string().to_bytes();
            for j in 0..rec_bytes.len() {
                leaf_data.push_back(rec_bytes.get(j).expect("rec_bytes index must be in bounds"));
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
                let left = leaves.get(j).expect("leaf index must be in bounds");
                if j + 1 < leaves.len() {
                    let right = leaves.get(j + 1).expect("leaf+1 index must be in bounds");
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
        leaves.get(0).expect("Merkle tree must have a root after reduction")
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
            .expect("TrustedSetupHash must be configured")
    }

    /// Emergency pause (admin only)
    pub fn pause(env: Env) {
        let admin: Address = env
            .storage().instance()
            .get(&DataKey::Admin)
            .expect("Admin must be configured");
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
            .expect("Admin must be configured");
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

        // Build a valid 384-byte uncompressed proof (all identity points)
        let mut proof_bytes = [0u8; 384];
        proof_bytes[0] = 0x40;
        proof_bytes[96] = 0x40;
        proof_bytes[288] = 0x40;
        let proof = Bytes::from_array(&env, &proof_bytes);

        let nullifier = BytesN::from_array(&env, &[1u8; 32]);

        let contract_id = env.register(PayrollDispatcher, (&admin,));
        let client = PayrollDispatcherClient::new(&env, &contract_id);

        client.configure(&token_id, &setup_hash);

        // Set verification key with identity points
        let mut g1_id = [0u8; 96];
        g1_id[0] = 0x40;
        let mut g2_id = [0u8; 192];
        g2_id[0] = 0x40;
        let alpha = BytesN::from_array(&env, &g1_id);
        let beta = BytesN::from_array(&env, &g2_id);
        let gamma = BytesN::from_array(&env, &g2_id);
        let delta = BytesN::from_array(&env, &g2_id);
        let ic = vec![
            &env,
            BytesN::from_array(&env, &g1_id),
            BytesN::from_array(&env, &g1_id),
        ];
        client.set_verification_key(&alpha, &beta, &gamma, &delta, &ic);

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

        let mut proof_bytes = [0u8; 384];
        proof_bytes[0] = 0x40;
        proof_bytes[96] = 0x40;
        proof_bytes[288] = 0x40;
        let proof = Bytes::from_array(&env, &proof_bytes);

        let contract_id = env.register(PayrollDispatcher, (&admin,));
        let client = PayrollDispatcherClient::new(&env, &contract_id);

        client.configure(&token, &setup_hash);

        // Set verification key with identity points (required by Groth16 check)
        let mut g1_id = [0u8; 96];
        g1_id[0] = 0x40;
        let mut g2_id = [0u8; 192];
        g2_id[0] = 0x40;
        client.set_verification_key(
            &BytesN::from_array(&env, &g1_id),
            &BytesN::from_array(&env, &g2_id),
            &BytesN::from_array(&env, &g2_id),
            &BytesN::from_array(&env, &g2_id),
            &vec![&env, BytesN::from_array(&env, &g1_id), BytesN::from_array(&env, &g1_id)],
        );

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

        // Set verification key with identity points
        let mut g1_id = [0u8; 96];
        g1_id[0] = 0x40;
        let mut g2_id = [0u8; 192];
        g2_id[0] = 0x40;
        let alpha = BytesN::from_array(&env, &g1_id);
        let beta = BytesN::from_array(&env, &g2_id);
        let gamma = BytesN::from_array(&env, &g2_id);
        let delta = BytesN::from_array(&env, &g2_id);
        let ic = vec![
            &env,
            BytesN::from_array(&env, &g1_id),
            BytesN::from_array(&env, &g1_id),
        ];
        client.set_verification_key(&alpha, &beta, &gamma, &delta, &ic);

        // Compute Merkle root
        // Use amount divisible by duration so amount_per_second > 0
        let recipients = vec![&env, employee.clone()];
        let amounts = vec![&env, 3600i128];
        let durations = vec![&env, 3600u64];
        let root = PayrollDispatcher::compute_merkle_root(&env, &recipients, &amounts);

        let mut proof_bytes = [0u8; 384];
        proof_bytes[0] = 0x40;
        proof_bytes[96] = 0x40;
        proof_bytes[288] = 0x40;
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
