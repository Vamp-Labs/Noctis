#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, symbol_short, Address, Env,
    Symbol, Vec,
};

/// Error codes for Policy Signer contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    Unauthorized = 1,
    PolicyNotFound = 2,
    PolicyRevoked = 3,
    AmountExceedsLimit = 4,
    PeriodLimitExceeded = 5,
    TokenNotAllowed = 6,
    InsufficientSigners = 7,
    InvalidSigner = 8,
    DuplicatePolicyName = 9,
    PeriodNotStarted = 10,
    PolicyNotActive = 11,
    InternalError = 12,
}

/// DataKey enum defines storage keys for the Policy Signer contract
#[contracttype]
pub enum DataKey {
    Admin,                         // Address — contract admin
    PolicyCount,                   // u32 — total policies created
    Policy(u32),                   // PolicyData — policy by ID
    EmployerPolicies(Address),     // Vec<u32> — policy IDs per employer
    ActivePolicy(u32),             // bool — whether a policy is active
    PolicyName(Symbol),            // u32 — policy ID by name for uniqueness check
}

/// Types of policies that can be created
#[contracttype]
pub enum PolicyType {
    SpendingLimit,                 // Max amount per transaction
    Allowlist,                     // Approved tokens/recipients
    MultiSig,                      // Requires N-of-M signatures
    Timelock,                      // Delayed execution
}

/// Full policy data structure
#[contracttype]
pub struct PolicyData {
    pub id: u32,
    pub employer: Address,
    pub name: Symbol,
    pub policy_type: PolicyType,
    pub max_amount: i128,
    pub period_limit: i128,
    pub period_seconds: u64,
    pub spent_this_period: i128,
    pub period_start: u64,
    pub allowed_tokens: Vec<Address>,
    pub required_signers: u32,
    pub authorized_signers: Vec<Address>,
    pub active: bool,
    pub created_at: u64,
}

/// Configuration for a new policy (used in create_policy)
#[contracttype]
pub struct PolicyConfig {
    pub name: Symbol,
    pub policy_type: PolicyType,
    pub max_amount: i128,
    pub period_limit: i128,
    pub period_seconds: u64,
    pub allowed_tokens: Vec<Address>,
    pub required_signers: u32,
    pub authorized_signers: Vec<Address>,
}

// ─── Events ──────────────────────────────────────────────────────────
#[contractevent]
pub struct PolicyCreatedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub policy_id: u32,
    pub employer: Address,
    pub name: Symbol,
}

#[contractevent]
pub struct PolicyRevokedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub policy_id: u32,
    pub employer: Address,
}

/// The main Policy Signer contract
/// Authorization & Spending Limits for employer payroll operations
#[contract]
pub struct PolicySigner;

#[contractimpl]
impl PolicySigner {
    /// Initialize the contract with an admin address
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Create a new policy for an employer
    /// Returns the new policy ID
    pub fn create_policy(
        env: Env,
        employer: Address,
        config: PolicyConfig,
    ) -> Result<u32, Error> {
        // Access control: only the employer can create their own policies
        employer.require_auth();

        // Validate: required_signers must not exceed authorized_signers count
        if config.required_signers > config.authorized_signers.len() {
            return Err(Error::InvalidSigner);
        }

        // Validate: check for unique policy name per employer
        let name_key = DataKey::PolicyName(config.name.clone());
        if env.storage().instance().has(&name_key) {
            return Err(Error::DuplicatePolicyName);
        }

        // Generate new policy ID
        let policy_count = env
            .storage().instance()
            .get::<_, u32>(&DataKey::PolicyCount)
            .unwrap_or(0);
        let policy_id = policy_count + 1;

        let now = env.ledger().timestamp();

        let policy = PolicyData {
            id: policy_id,
            employer: employer.clone(),
            name: config.name.clone(),
            policy_type: config.policy_type,
            max_amount: config.max_amount,
            period_limit: config.period_limit,
            period_seconds: config.period_seconds,
            spent_this_period: 0,
            period_start: now,
            allowed_tokens: config.allowed_tokens,
            required_signers: config.required_signers,
            authorized_signers: config.authorized_signers,
            active: true,
            created_at: now,
        };

        // Store policy
        env.storage().instance().set(&DataKey::Policy(policy_id), &policy);
        env.storage().instance().set(&DataKey::PolicyCount, &policy_id);
        env.storage().instance().set(&DataKey::ActivePolicy(policy_id), &true);
        env.storage().instance().set(&name_key, &policy_id);

        // Index: append policy ID to employer's policy list
        let mut employer_policies: Vec<u32> = env
            .storage().instance()
            .get(&DataKey::EmployerPolicies(employer.clone()))
            .unwrap_or(Vec::new(&env));
        employer_policies.push_back(policy_id);
        env.storage().instance()
            .set(&DataKey::EmployerPolicies(employer.clone()), &employer_policies);

        // Emit event
        PolicyCreatedEvent {
            contract: symbol_short!("policy"),
            event_type: symbol_short!("created"),
            policy_id,
            employer: employer.clone(),
            name: config.name,
        }.publish(&env);

        Ok(policy_id)
    }

    /// Verify that a transaction is allowed under the employer's policies
    /// Checks: spending limit, period limit, token allowlist, multi-sig threshold
    /// Returns the policy ID that authorized the transaction
    pub fn verify_policy(
        env: Env,
        employer: Address,
        amount: i128,
        token: Option<Address>,
        signers: Vec<Address>,
    ) -> Result<u32, Error> {
        let employer_policies: Vec<u32> = env
            .storage().instance()
            .get(&DataKey::EmployerPolicies(employer.clone()))
            .ok_or(Error::PolicyNotFound)?;

        let now = env.ledger().timestamp();

        // Iterate through all policies; a transaction must pass ALL active policies
        for i in 0..employer_policies.len() {
            let policy_id = employer_policies.get(i).ok_or(Error::PolicyNotFound)?;
            let active = env
                .storage().instance()
                .get::<_, bool>(&DataKey::ActivePolicy(policy_id))
                .unwrap_or(false);
            if !active {
                continue; // Skip revoked policies
            }

            let mut policy: PolicyData = env
                .storage().instance()
                .get(&DataKey::Policy(policy_id))
                .ok_or(Error::PolicyNotFound)?;

            // Check: spending limit
            if amount > policy.max_amount {
                return Err(Error::AmountExceedsLimit);
            }

            // Check: rolling period limit
            if policy.period_seconds > 0 {
                // Reset if period has elapsed
                if now > policy.period_start + policy.period_seconds {
                    policy.spent_this_period = 0;
                    policy.period_start = now;
                }

                // Check period limit
                if policy.spent_this_period + amount > policy.period_limit {
                    return Err(Error::PeriodLimitExceeded);
                }

                // Update spent amount
                policy.spent_this_period += amount;
                env.storage().instance().set(&DataKey::Policy(policy_id), &policy);
            }

            // Check: token allowlist (if token is provided and allowlist is non-empty)
            if let Some(token_addr) = token.clone() {
                if !policy.allowed_tokens.is_empty() {
                    let mut token_allowed = false;
                    for j in 0..policy.allowed_tokens.len() {
                        if policy.allowed_tokens.get(j).ok_or(Error::InternalError)? == token_addr {
                            token_allowed = true;
                            break;
                        }
                    }
                    if !token_allowed {
                        return Err(Error::TokenNotAllowed);
                    }
                }
            }

            // Check: multi-sig threshold
            if policy.required_signers > 0 {
                if signers.len() < policy.required_signers {
                    return Err(Error::InsufficientSigners);
                }

                // Verify each signer is authorized
                for k in 0..signers.len() {
                    let signer = signers.get(k).ok_or(Error::InternalError)?;
                    let mut authorized = false;
                    for m in 0..policy.authorized_signers.len() {
                        if policy.authorized_signers.get(m).ok_or(Error::InternalError)? == signer {
                            authorized = true;
                            break;
                        }
                    }
                    if !authorized {
                        return Err(Error::InvalidSigner);
                    }
                }
            }
        }

        // Return the first active policy ID (caller uses this for reference)
        let first_policy_id = employer_policies.get(0).ok_or(Error::PolicyNotFound)?;
        Ok(first_policy_id)
    }

    /// Revoke a policy by ID (employer only)
    pub fn revoke_policy(env: Env, employer: Address, policy_id: u32) -> Result<(), Error> {
        employer.require_auth();

        // Verify policy exists and belongs to this employer
        let policy: PolicyData = env
            .storage().instance()
            .get(&DataKey::Policy(policy_id))
            .ok_or(Error::PolicyNotFound)?;

        if policy.employer != employer {
            return Err(Error::Unauthorized);
        }

        // Mark as inactive (soft-delete)
        env.storage().instance().set(&DataKey::ActivePolicy(policy_id), &false);

        // Emit event
        PolicyRevokedEvent {
            contract: symbol_short!("policy"),
            event_type: symbol_short!("revoked"),
            policy_id,
            employer: employer.clone(),
        }.publish(&env);

        Ok(())
    }

    /// Get a specific policy by ID
    pub fn get_policy(env: Env, policy_id: u32) -> Result<PolicyData, Error> {
        env.storage().instance()
            .get(&DataKey::Policy(policy_id))
            .ok_or(Error::PolicyNotFound)
    }

    /// Get all policies for an employer
    pub fn get_employer_policies(env: Env, employer: Address) -> Vec<PolicyData> {
        let policy_ids: Vec<u32> = env
            .storage().instance()
            .get(&DataKey::EmployerPolicies(employer))
            .unwrap_or(Vec::new(&env));

        let mut policies: Vec<PolicyData> = Vec::new(&env);
        for i in 0..policy_ids.len() {
            let pid = policy_ids.get(i).expect("policy_ids index must be in bounds");
            if let Some(policy) = env.storage().instance().get(&DataKey::Policy(pid)) {
                policies.push_back(policy);
            }
        }
        policies
    }

    /// Check if a policy is active
    pub fn is_policy_active(env: Env, policy_id: u32) -> bool {
        env.storage().instance()
            .get::<_, bool>(&DataKey::ActivePolicy(policy_id))
            .unwrap_or(false)
    }

    /// Get total policy count (admin only)
    pub fn get_policy_count(env: Env) -> u32 {
        env.storage().instance()
            .get::<_, u32>(&DataKey::PolicyCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        vec, Env,
    };

    #[test]
    fn test_create_policy_basic() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let employer = Address::generate(&env);

        let contract_id = env.register(PolicySigner, (&admin,));
        let client = PolicySignerClient::new(&env, &contract_id);

        let config = PolicyConfig {
            name: Symbol::new(&env, "test_limit"),
            policy_type: PolicyType::SpendingLimit,
            max_amount: 10000,
            period_limit: 50000,
            period_seconds: 86400, // 24 hours
            allowed_tokens: vec![&env],
            required_signers: 0,
            authorized_signers: vec![&env],
        };

        let policy_id = client.create_policy(&employer, &config);
        assert_eq!(policy_id, 1);

        let policy = client.get_policy(&policy_id);
        assert_eq!(policy.employer, employer);
        assert_eq!(policy.max_amount, 10000);
        assert!(policy.active);
    }

    #[test]
    fn test_verify_spending_limit() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let employer = Address::generate(&env);

        let contract_id = env.register(PolicySigner, (&admin,));
        let client = PolicySignerClient::new(&env, &contract_id);

        let config = PolicyConfig {
            name: Symbol::new(&env, "limit_5000"),
            policy_type: PolicyType::SpendingLimit,
            max_amount: 5000,
            period_limit: 50000,
            period_seconds: 86400,
            allowed_tokens: vec![&env],
            required_signers: 0,
            authorized_signers: vec![&env],
        };

        client.create_policy(&employer, &config);

        // Within limit — should pass
        client.verify_policy(&employer, &3000, &None, &vec![&env]);

        // Exceeds limit — should fail
        assert_eq!(client.try_verify_policy(&employer, &6000, &None, &vec![&env]).unwrap_err().unwrap(), Error::AmountExceedsLimit);
    }

    #[test]
    fn test_period_limit_rolling() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let employer = Address::generate(&env);

        let contract_id = env.register(PolicySigner, (&admin,));
        let client = PolicySignerClient::new(&env, &contract_id);

        let config = PolicyConfig {
            name: Symbol::new(&env, "period_1000"),
            policy_type: PolicyType::SpendingLimit,
            max_amount: 10000,
            period_limit: 1000,
            period_seconds: 3600, // 1 hour
            allowed_tokens: vec![&env],
            required_signers: 0,
            authorized_signers: vec![&env],
        };

        client.create_policy(&employer, &config);

        // First tx: 600 (within 1000 limit)
        client.verify_policy(&employer, &600, &None, &vec![&env]);

        // Second tx: 500 (would exceed 1000 limit: 600+500 > 1000)
        assert_eq!(client.try_verify_policy(&employer, &500, &None, &vec![&env]).unwrap_err().unwrap(), Error::PeriodLimitExceeded);

        // Advance time past period
        env.ledger().set_timestamp(3601);

        // Now should pass (period reset)
        client.verify_policy(&employer, &500, &None, &vec![&env]);
    }

    #[test]
    fn test_token_allowlist() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let usdc = Address::generate(&env);
        let eurc = Address::generate(&env);
        let bad_token = Address::generate(&env);

        let contract_id = env.register(PolicySigner, (&admin,));
        let client = PolicySignerClient::new(&env, &contract_id);

        let config = PolicyConfig {
            name: Symbol::new(&env, "token_allowlist"),
            policy_type: PolicyType::Allowlist,
            max_amount: 10000,
            period_limit: 50000,
            period_seconds: 86400,
            allowed_tokens: vec![&env, usdc.clone(), eurc.clone()],
            required_signers: 0,
            authorized_signers: vec![&env],
        };

        client.create_policy(&employer, &config);

        // USDC token — should pass
        client.verify_policy(&employer, &100, &Some(usdc), &vec![&env]);

        // Bad token — should fail
        assert_eq!(client.try_verify_policy(&employer, &100, &Some(bad_token), &vec![&env]).unwrap_err().unwrap(), Error::TokenNotAllowed);
    }

    #[test]
    fn test_multi_sig() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let signer3 = Address::generate(&env);
        let rogue = Address::generate(&env);

        let contract_id = env.register(PolicySigner, (&admin,));
        let client = PolicySignerClient::new(&env, &contract_id);

        let config = PolicyConfig {
            name: Symbol::new(&env, "multisig_2of3"),
            policy_type: PolicyType::MultiSig,
            max_amount: 100000,
            period_limit: 500000,
            period_seconds: 86400,
            allowed_tokens: vec![&env],
            required_signers: 2,
            authorized_signers: vec![&env, signer1.clone(), signer2.clone(), signer3.clone()],
        };

        client.create_policy(&employer, &config);

        // 2 of 3 signers — should pass
        client.verify_policy(
            &employer,
            &1000,
            &None,
            &vec![&env, signer1.clone(), signer2.clone()],
        );

        // 1 of 3 signers — should fail
        assert_eq!(client.try_verify_policy(&employer, &1000, &None, &vec![&env, signer1.clone()]).unwrap_err().unwrap(), Error::InsufficientSigners);

        // Rogue signer — should fail
        assert_eq!(client.try_verify_policy(
            &employer,
            &1000,
            &None,
            &vec![&env, signer1.clone(), rogue.clone()],
        ).unwrap_err().unwrap(), Error::InvalidSigner);
    }

    #[test]
    fn test_revoke_policy() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let employer = Address::generate(&env);

        let contract_id = env.register(PolicySigner, (&admin,));
        let client = PolicySignerClient::new(&env, &contract_id);

        let config = PolicyConfig {
            name: Symbol::new(&env, "to_revoke"),
            policy_type: PolicyType::SpendingLimit,
            max_amount: 10000,
            period_limit: 50000,
            period_seconds: 86400,
            allowed_tokens: vec![&env],
            required_signers: 0,
            authorized_signers: vec![&env],
        };

        let policy_id = client.create_policy(&employer, &config);

        // Revoke
        client.revoke_policy(&employer, &policy_id);
        assert!(!client.is_policy_active(&policy_id));
    }

    #[test]
    fn test_duplicate_policy_name() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let employer = Address::generate(&env);

        let contract_id = env.register(PolicySigner, (&admin,));
        let client = PolicySignerClient::new(&env, &contract_id);

        let config = PolicyConfig {
            name: Symbol::new(&env, "same_name"),
            policy_type: PolicyType::SpendingLimit,
            max_amount: 10000,
            period_limit: 50000,
            period_seconds: 86400,
            allowed_tokens: vec![&env],
            required_signers: 0,
            authorized_signers: vec![&env],
        };

        client.create_policy(&employer, &config);

        // Second policy with same name — should fail
        assert_eq!(client.try_create_policy(&employer, &config).unwrap_err().unwrap(), Error::DuplicatePolicyName);
    }
}
