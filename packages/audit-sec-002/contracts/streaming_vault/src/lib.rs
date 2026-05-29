#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, symbol_short, token,
    Address, Env, Symbol, Vec,
};

/// Error codes for Streaming Vault contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    Unauthorized = 1,
    StreamNotFound = 2,
    StreamAlreadyExists = 3,
    StreamPaused = 4,
    StreamCancelled = 5,
    StreamExpired = 6,
    InsufficientBalance = 7,
    InvalidAmount = 8,
    AmountPerSecondZero = 9,
    DurationZero = 10,
    TotalAmountZero = 11,
    AlreadyRefunded = 12,
    NothingToClaim = 13,
    TransferFailed = 14,
    ContractPaused = 15,
    InternalError = 16,
}

/// Storage keys for the Streaming Vault contract
#[contracttype]
pub enum DataKey {
    Admin,                              // Address — contract admin
    StreamCount,                        // u32 — total streams created
    Stream(u32),                        // StreamData — stream by ID
    EmployeeStreams(Address),           // Vec<u32> — stream IDs per employee
    EmployerBalances(Address),          // i128 — total deposited per employer
    Paused,                             // bool — emergency pause
}

/// Full stream data structure
#[contracttype]
pub struct StreamData {
    pub id: u32,
    pub employer: Address,
    pub employee: Address,
    pub token: Address,                  // SEP-41 token address
    pub total_amount: i128,              // Total amount for the stream
    pub amount_per_second: i128,         // Amount accrued per second
    pub start_time: u64,                 // Unix timestamp (seconds)
    pub stop_time: u64,                  // Unix timestamp (seconds) = start_time + duration
    pub paused: bool,
    pub paused_at: u64,                  // Timestamp when paused (0 = not paused)
    pub total_paused_duration: u64,      // Total seconds paused so far
    pub total_claimed: i128,            // Amount already withdrawn
    pub refunded: bool,                  // True if cancelled and refunded
}

// ─── Events ──────────────────────────────────────────────────────────
#[contractevent]
pub struct StreamCreatedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub stream_id: u32,
    pub employer: Address,
    pub employee: Address,
    pub total_amount: i128,
    pub amount_per_second: i128,
}

#[contractevent]
pub struct StreamClaimedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub stream_id: u32,
    pub employee: Address,
    pub claimable: i128,
}

#[contractevent]
pub struct StreamCancelledEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub stream_id: u32,
    pub employer: Address,
    pub refund_amount: i128,
}

#[contractevent]
pub struct StreamPausedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub stream_id: u32,
    pub employer: Address,
}

#[contractevent]
pub struct StreamResumedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub stream_id: u32,
    pub employer: Address,
}

#[contractevent]
pub struct AllPausedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
}

#[contractevent]
pub struct AllUnpausedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
}

/// The main Streaming Vault contract
/// Per-second payment streaming with pause/resume and cancellation
#[contract]
pub struct StreamingVault;

#[contractimpl]
impl StreamingVault {
    /// Initialize contract with admin address
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    /// Create a new payment stream
    /// Employer deposits total_amount tokens, which stream to employee per-second
    pub fn create_stream(
        env: Env,
        employer: Address,
        employee: Address,
        token: Address,
        total_amount: i128,
        amount_per_second: i128,
        duration: u64,
    ) -> Result<u32, Error> {
        // Access control: employer must authorize
        employer.require_auth();

        // Guard: contract not paused
        if env.storage().instance().get::<_, bool>(&DataKey::Paused).unwrap_or(false) {
            return Err(Error::ContractPaused);
        }

        // Validation
        if total_amount <= 0 {
            return Err(Error::TotalAmountZero);
        }
        if amount_per_second <= 0 {
            return Err(Error::AmountPerSecondZero);
        }
        if duration == 0 {
            return Err(Error::DurationZero);
        }

        let now = env.ledger().timestamp();
        let stop_time = now + duration;

        // Transfer tokens from employer to this contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&employer, env.current_contract_address(), &total_amount);

        // Generate stream ID
        let stream_count = env
            .storage().instance()
            .get::<_, u32>(&DataKey::StreamCount)
            .unwrap_or(0);
        let stream_id = stream_count + 1;

        let stream = StreamData {
            id: stream_id,
            employer: employer.clone(),
            employee: employee.clone(),
            token,
            total_amount,
            amount_per_second,
            start_time: now,
            stop_time,
            paused: false,
            paused_at: 0,
            total_paused_duration: 0,
            total_claimed: 0,
            refunded: false,
        };

        // Store stream
        env.storage().instance().set(&DataKey::Stream(stream_id), &stream);
        env.storage().instance().set(&DataKey::StreamCount, &stream_id);

        // Index: append to employee's stream list
        let mut employee_streams: Vec<u32> = env
            .storage().instance()
            .get(&DataKey::EmployeeStreams(employee.clone()))
            .unwrap_or(Vec::new(&env));
        employee_streams.push_back(stream_id);
        env.storage().instance()
            .set(&DataKey::EmployeeStreams(employee.clone()), &employee_streams);

        // Track employer balance
        let employer_balance: i128 = env
            .storage().instance()
            .get(&DataKey::EmployerBalances(employer.clone()))
            .unwrap_or(0);
        env.storage().instance()
            .set(&DataKey::EmployerBalances(employer.clone()), &(employer_balance + total_amount));

        // Emit event
        StreamCreatedEvent {
            contract: symbol_short!("stream"),
            event_type: symbol_short!("created"),
            stream_id,
            employer,
            employee,
            total_amount,
            amount_per_second,
        }.publish(&env);

        Ok(stream_id)
    }

    /// Calculate the accrued (but not yet claimed) amount for a stream
    fn calculate_accrued(env: &Env, stream: &StreamData) -> i128 {
        let now = env.ledger().timestamp();
        let effective_end = if stream.stop_time < now {
            stream.stop_time
        } else {
            now
        };

        let elapsed = effective_end.saturating_sub(stream.start_time);

        // Account for current pause period (if stream is paused now)
        let total_paused = if stream.paused && stream.paused_at > 0 {
            let current_pause = now - stream.paused_at;
            stream.total_paused_duration + current_pause
        } else {
            stream.total_paused_duration
        };

        // Subtract paused duration from elapsed time
        let effective_elapsed = elapsed.saturating_sub(total_paused);

        // Use u128 arithmetic with checked_mul to prevent overflow.
        // amount_per_second is i128; realistic values fit in u128.
        let gross_accrued = (stream.amount_per_second as u128).saturating_mul(effective_elapsed as u128);
        let gross_accrued_i128 = gross_accrued.min(i128::MAX as u128) as i128;
        let claimable = gross_accrued_i128 - stream.total_claimed;

        // Cap at total_amount - total_claimed
        let remaining = stream.total_amount - stream.total_claimed;
        if claimable > remaining {
            remaining
        } else if claimable < 0 {
            0
        } else {
            claimable
        }
    }

    /// Claim accrued streaming payments
    /// Only the employee can claim their own stream
    pub fn claim_stream(env: Env, stream_id: u32) -> Result<i128, Error> {
        // Load stream
        let mut stream: StreamData = env
            .storage().instance()
            .get(&DataKey::Stream(stream_id))
            .ok_or(Error::StreamNotFound)?;

        // Access control: only employee can claim
        stream.employee.require_auth();

        // Guard: not paused
        if stream.paused {
            return Err(Error::StreamPaused);
        }

        // Allow claiming even after cancellation (for unclaimed accrued amount).
        // The `refunded` flag only prevents double-cancellation.
        // `calculate_accrued` naturally caps at remaining amount via total_claimed tracking.

        let claimable = Self::calculate_accrued(&env, &stream);

        if claimable <= 0 {
            return Err(Error::NothingToClaim);
        }

        // Transfer tokens to employee
        let token_client = token::Client::new(&env, &stream.token);
        token_client.transfer(
            &env.current_contract_address(),
            &stream.employee,
            &claimable,
        );

        // Update stream state
        stream.total_claimed += claimable;
        env.storage().instance().set(&DataKey::Stream(stream_id), &stream);

        // Emit event
        StreamClaimedEvent {
            contract: symbol_short!("stream"),
            event_type: symbol_short!("claimed"),
            stream_id,
            employee: stream.employee.clone(),
            claimable,
        }.publish(&env);

        Ok(claimable)
    }

    /// Get the currently accrued (claimable) amount without claiming
    pub fn get_accrued_amount(env: Env, stream_id: u32) -> Result<i128, Error> {
        let stream: StreamData = env
            .storage().instance()
            .get(&DataKey::Stream(stream_id))
            .ok_or(Error::StreamNotFound)?;

        Ok(Self::calculate_accrued(&env, &stream))
    }

    /// Cancel an active stream (employer only)
    /// Employee gets accrued amount, employer gets remaining un-accrued refund
    pub fn cancel_stream(env: Env, stream_id: u32) -> Result<i128, Error> {
        let mut stream: StreamData = env
            .storage().instance()
            .get(&DataKey::Stream(stream_id))
            .ok_or(Error::StreamNotFound)?;

        // Access control: only employer can cancel
        stream.employer.require_auth();

        // Guard: not already refunded
        if stream.refunded {
            return Err(Error::AlreadyRefunded);
        }

        // Mark as refunded
        stream.refunded = true;
        env.storage().instance().set(&DataKey::Stream(stream_id), &stream);

        // Calculate what the employee has accrued but not yet claimed
        let accrued = Self::calculate_accrued(&env, &stream);
        let remaining = stream.total_amount - stream.total_claimed - accrued;

        // If employee has accrued unclaimed amount, they can still claim later
        // The remaining (un-accrued) goes back to employer
        let refund_amount = if remaining > 0 { remaining } else { 0 };

        if refund_amount > 0 {
            let token_client = token::Client::new(&env, &stream.token);
            token_client.transfer(
                &env.current_contract_address(),
                &stream.employer,
                &refund_amount,
            );
        }

        // Update employer balance
        let employer_balance: i128 = env
            .storage().instance()
            .get(&DataKey::EmployerBalances(stream.employer.clone()))
            .unwrap_or(0);
        let new_balance = employer_balance - (stream.total_amount - refund_amount);
        env.storage().instance()
            .set(&DataKey::EmployerBalances(stream.employer.clone()), &new_balance);

        // Emit event
        StreamCancelledEvent {
            contract: symbol_short!("stream"),
            event_type: symbol_short!("cancel"),
            stream_id,
            employer: stream.employer.clone(),
            refund_amount,
        }.publish(&env);

        Ok(refund_amount)
    }

    /// Pause a stream (employer only — stops accrual temporarily)
    pub fn pause_stream(env: Env, stream_id: u32) -> Result<(), Error> {
        let mut stream: StreamData = env
            .storage().instance()
            .get(&DataKey::Stream(stream_id))
            .ok_or(Error::StreamNotFound)?;

        stream.employer.require_auth();

        if stream.paused {
            return Ok(()); // Idempotent
        }

        stream.paused = true;
        stream.paused_at = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::Stream(stream_id), &stream);

        StreamPausedEvent {
            contract: symbol_short!("stream"),
            event_type: symbol_short!("paused"),
            stream_id,
            employer: stream.employer.clone(),
        }.publish(&env);

        Ok(())
    }

    /// Resume a paused stream (employer only)
    pub fn resume_stream(env: Env, stream_id: u32) -> Result<(), Error> {
        let mut stream: StreamData = env
            .storage().instance()
            .get(&DataKey::Stream(stream_id))
            .ok_or(Error::StreamNotFound)?;

        stream.employer.require_auth();

        if !stream.paused {
            return Ok(()); // Idempotent
        }

        let now = env.ledger().timestamp();
        let pause_duration = now - stream.paused_at;
        stream.total_paused_duration += pause_duration;
        stream.paused = false;
        stream.paused_at = 0;
        env.storage().instance().set(&DataKey::Stream(stream_id), &stream);

        StreamResumedEvent {
            contract: symbol_short!("stream"),
            event_type: symbol_short!("resumed"),
            stream_id,
            employer: stream.employer.clone(),
        }.publish(&env);

        Ok(())
    }

    /// Get all stream IDs for an employee
    pub fn get_employee_streams(env: Env, employee: Address) -> Vec<u32> {
        env.storage().instance()
            .get(&DataKey::EmployeeStreams(employee))
            .unwrap_or(Vec::new(&env))
    }

    /// Get stream data by ID
    pub fn get_stream(env: Env, stream_id: u32) -> Result<StreamData, Error> {
        env.storage().instance()
            .get(&DataKey::Stream(stream_id))
            .ok_or(Error::StreamNotFound)
    }

    /// Get employer's total deposited balance
    pub fn get_employer_balance(env: Env, employer: Address) -> i128 {
        env.storage().instance()
            .get(&DataKey::EmployerBalances(employer))
            .unwrap_or(0)
    }

    /// Get total stream count
    pub fn get_stream_count(env: Env) -> u32 {
        env.storage().instance()
            .get::<_, u32>(&DataKey::StreamCount)
            .unwrap_or(0)
    }

    /// Emergency pause (admin only)
    pub fn pause(env: Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Admin must be configured");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
        AllPausedEvent {
            contract: symbol_short!("stream"),
            event_type: Symbol::new(&env, "paused_all"),
        }.publish(&env);
    }

    /// Emergency unpause (admin only)
    pub fn unpause(env: Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Admin must be configured");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
        AllUnpausedEvent {
            contract: symbol_short!("stream"),
            event_type: Symbol::new(&env, "unpaused_all"),
        }.publish(&env);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        Env,
    };

    #[test]
    fn test_create_stream_basic() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let employee = Address::generate(&env);

        // Register a token contract
        let token_asset = env.register_stellar_asset_contract_v2(employer.clone());
        let token_id = token_asset.address();
        let token_client = token::StellarAssetClient::new(&env, &token_id);

        // Fund employer with tokens
        token_client.mint(&employer, &10000);

        let contract_id = env.register(StreamingVault, (&admin,));
        let client = StreamingVaultClient::new(&env, &contract_id);

        let stream_id = client
            .create_stream(&employer, &employee, &token_id, &10000, &10, &1000);

        assert_eq!(stream_id, 1);

        let stream = client.get_stream(&stream_id);
        assert_eq!(stream.employer, employer);
        assert_eq!(stream.employee, employee);
        assert_eq!(stream.total_amount, 10000);
        assert_eq!(stream.amount_per_second, 10);

        // Employer balance tracked
        assert_eq!(client.get_employer_balance(&employer), 10000);
    }

    #[test]
    fn test_claim_after_time() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let employee = Address::generate(&env);

        let token_asset = env.register_stellar_asset_contract_v2(employer.clone());
        let token_id = token_asset.address();
        let token_client = token::StellarAssetClient::new(&env, &token_id);
        token_client.mint(&employer, &10000);

        let contract_id = env.register(StreamingVault, (&admin,));
        let client = StreamingVaultClient::new(&env, &contract_id);

        let stream_id = client
            .create_stream(&employer, &employee, &token_id, &10000, &10, &1000);

        // Advance time by 100 seconds
        env.ledger().set_timestamp(100);

        // Accrued should be 10 * 100 = 1000
        let accrued = client.get_accrued_amount(&stream_id);
        assert_eq!(accrued, 1000);

        // Claim
        let claimed = client.claim_stream(&stream_id);
        assert_eq!(claimed, 1000);

        // Second claim should have nothing new
        let result = client.try_claim_stream(&stream_id).unwrap_err().unwrap();
        assert_eq!(result, Error::NothingToClaim);
    }

    #[test]
    fn test_cancel_mid_stream() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let employee = Address::generate(&env);

        let token_asset = env.register_stellar_asset_contract_v2(employer.clone());
        let token_id = token_asset.address();
        let token_client = token::StellarAssetClient::new(&env, &token_id);
        token_client.mint(&employer, &10000);

        let contract_id = env.register(StreamingVault, (&admin,));
        let client = StreamingVaultClient::new(&env, &contract_id);

        let stream_id = client
            .create_stream(&employer, &employee, &token_id, &10000, &10, &1000);

        // Advance 500 seconds (50% complete)
        env.ledger().set_timestamp(500);

        // Cancel: employee gets 5000 (accrued), employer gets 5000 (remaining)
        let refund = client.cancel_stream(&stream_id);
        assert_eq!(refund, 5000); // remaining un-accrued

        // Verify employee can still claim their accrued
        let claimed = client.claim_stream(&stream_id);
        assert_eq!(claimed, 5000);
    }

    #[test]
    fn test_pause_resume() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let employee = Address::generate(&env);

        let token_asset = env.register_stellar_asset_contract_v2(employer.clone());
        let token_id = token_asset.address();
        let token_client = token::StellarAssetClient::new(&env, &token_id);
        token_client.mint(&employer, &10000);

        let contract_id = env.register(StreamingVault, (&admin,));
        let client = StreamingVaultClient::new(&env, &contract_id);

        let stream_id = client
            .create_stream(&employer, &employee, &token_id, &10000, &10, &1000);

        // Advance 100 seconds
        env.ledger().set_timestamp(100);
        let accrued = client.get_accrued_amount(&stream_id);
        assert_eq!(accrued, 1000);

        // Pause
        client.pause_stream(&stream_id);

        // Advance 200 more seconds (should NOT accrue while paused)
        env.ledger().set_timestamp(300);
        let accrued = client.get_accrued_amount(&stream_id);
        assert_eq!(accrued, 1000); // Still 1000 — no accrual during pause

        // Resume
        client.resume_stream(&stream_id);

        // Advance 100 more seconds
        env.ledger().set_timestamp(400);
        let accrued = client.get_accrued_amount(&stream_id);
        assert_eq!(accrued, 2000); // 1000 + (10 * 100) = 2000
    }

    #[test]
    fn test_unauthorized_cancel() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let employee = Address::generate(&env);
        let _attacker = Address::generate(&env);

        let token_asset = env.register_stellar_asset_contract_v2(employer.clone());
        let token_id = token_asset.address();
        let token_client = token::StellarAssetClient::new(&env, &token_id);
        token_client.mint(&employer, &10000);

        let contract_id = env.register(StreamingVault, (&admin,));
        let client = StreamingVaultClient::new(&env, &contract_id);

        let _stream_id = client
            .create_stream(&employer, &employee, &token_id, &10000, &10, &1000);

        // TODO: Add negative auth test (requires clearing mock_all_auths)
    }

    #[test]
    fn test_claim_expired_stream() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let employee = Address::generate(&env);

        let token_asset = env.register_stellar_asset_contract_v2(employer.clone());
        let token_id = token_asset.address();
        let token_client = token::StellarAssetClient::new(&env, &token_id);
        token_client.mint(&employer, &10000);

        let contract_id = env.register(StreamingVault, (&admin,));
        let client = StreamingVaultClient::new(&env, &contract_id);

        let stream_id = client
            .create_stream(&employer, &employee, &token_id, &10000, &10, &1000);

        // Advance past expiry
        env.ledger().set_timestamp(2000);

        // Should cap at total_amount
        let accrued = client.get_accrued_amount(&stream_id);
        assert_eq!(accrued, 10000); // Capped

        let claimed = client.claim_stream(&stream_id);
        assert_eq!(claimed, 10000);
    }
}
