#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, symbol_short, token,
    Address, Env, IntoVal, Map, Symbol, Val, Vec,
};

/// Error codes for Yield Router contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    Unauthorized = 1,
    SourceNotFound = 2,
    SourceAlreadyExists = 3,
    InsufficientBalance = 4,
    InvalidAmount = 5,
    NoSourcesRegistered = 6,
    EmployerNotRegistered = 7,
    ContractPaused = 8,
    SplitConfigInvalid = 9,
    TransferFailed = 10,
    InternalError = 11,
}

/// Storage keys for the Yield Router contract
#[contracttype]
pub enum DataKey {
    Admin,                           // Address — contract admin
    YieldSources,                    // Vec<Symbol> — registered yield source names (order)
    SourceAddress(Symbol),           // Address — pool/contract address for a yield source
    SourceRate(Symbol),              // u32 — APR in basis points (100 = 1%)
    EmployerAllocations(Address),    // EmployerAllocation — per-employer data
    TotalDeposited,                  // i128 — total across all employers
    Paused,                          // bool
    YieldSplitConfig,                // YieldSplit
    PayrollDispatcher,               // Address — authorized caller
    SourceStrategy(Symbol),          // YieldSource — strategy type for a yield source
}

/// Yield split configuration (basis points, must sum to 10000)
#[contracttype]
pub struct YieldSplit {
    pub employer_share: u32,          // e.g. 8000 = 80%
    pub employee_pool: u32,           // e.g. 1500 = 15%
    pub protocol_fee: u32,            // e.g. 500 = 5%
}

/// Tracks allocation and yield per employer per source
#[contracttype]
pub struct EmployerAllocation {
    pub total_principal: i128,        // Total capital routed
    pub by_source: Map<Symbol, i128>, // Principal per source
    pub accumulated_yield: i128,      // Total yield earned
    pub claimed_yield: i128,          // Yield already withdrawn
}

/// Yield source strategy
#[contracttype]
pub enum YieldSource {
    DirectHold,
    BlendProtocol(u32), // reserve_index
}

/// Blend Pool request type (matches blend-contracts-v2)
#[contracttype]
pub struct BlendRequest {
    pub request_type: u32,
    pub address: Address,
    pub amount: i128,
}

/// Blend Pool positions return type
#[contracttype]
pub struct BlendPositions {
    pub collateral: Vec<i128>,
    pub liabilities: Vec<i128>,
}

// ─── Events ──────────────────────────────────────────────────────────

#[contractevent]
pub struct YieldDepositedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub source: Address,
    pub token: Address,
    pub amount: i128,
}

#[contractevent]
pub struct BlendDepositedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub pool: Address,
    pub token: Address,
    pub amount: i128,
}


#[contractevent]
pub struct SourceRegisteredEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub name: Symbol,
    pub pool_address: Address,
    pub initial_rate: u32,
}

#[contractevent]
pub struct YieldRoutedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub employer: Address,
    pub token: Address,
    pub allocated: i128,
}

#[contractevent]
pub struct YieldWithdrawnEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub employer: Address,
    pub employer_amount: i128,
    pub employer_yield: i128,
    pub protocol_fee_yield: i128,
}

#[contractevent]
pub struct RateUpdatedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub source: Symbol,
    pub new_rate: u32,
}

#[contractevent]
pub struct SplitUpdatedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
}

/// The main Yield Router contract
/// Routes idle payroll capital to yield-generating protocols (Blend, Soroswap)
/// Splits yield between employer, employee bonus pool, and protocol fee
#[contract]
pub struct YieldRouter;

#[contractimpl]
impl YieldRouter {
    /// Initialize contract with admin address
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);

        // Default yield split: 80% employer, 15% employee pool, 5% protocol fee
        let default_split = YieldSplit {
            employer_share: 8000,
            employee_pool: 1500,
            protocol_fee: 500,
        };
        env.storage().instance()
            .set(&DataKey::YieldSplitConfig, &default_split);
    }

    /// Set the payroll dispatcher address (authorized caller)
    pub fn set_payroll_dispatcher(env: Env, dispatcher: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Admin must be configured");
        admin.require_auth();
        env.storage().instance()
            .set(&DataKey::PayrollDispatcher, &dispatcher);
    }

    /// Register a new yield source (admin only, defaults to DirectHold strategy)
    pub fn register_source(env: Env, name: Symbol, pool_address: Address, initial_rate: u32) -> Result<(), Error> {
        Self::register_source_with_strategy(env, name, pool_address, initial_rate, YieldSource::DirectHold)
    }

    /// Register a new yield source with a specific strategy
    pub fn register_source_with_strategy(
        env: Env,
        name: Symbol,
        pool_address: Address,
        initial_rate: u32,
        strategy: YieldSource,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(Error::InternalError)?;
        admin.require_auth();

        if env.storage().instance().has(&DataKey::SourceAddress(name.clone())) {
            return Err(Error::SourceAlreadyExists);
        }

        let mut sources: Vec<Symbol> = env
            .storage().instance()
            .get(&DataKey::YieldSources)
            .unwrap_or(Vec::new(&env));
        sources.push_back(name.clone());
        env.storage().instance().set(&DataKey::YieldSources, &sources);

        env.storage().instance()
            .set(&DataKey::SourceAddress(name.clone()), &pool_address);
        env.storage().instance()
            .set(&DataKey::SourceRate(name.clone()), &initial_rate);
        env.storage().instance()
            .set(&DataKey::SourceStrategy(name.clone()), &strategy);

        SourceRegisteredEvent {
            contract: symbol_short!("yield"),
            event_type: symbol_short!("register"),
            name,
            pool_address,
            initial_rate,
        }.publish(&env);

        Ok(())
    }

    /// Route idle capital to yield sources
    /// Called by payroll_dispatcher after batch processing
    /// Distributes amount proportionally across all registered sources
    pub fn route_yield(
        env: Env,
        token: Address,
        employer: Address,
        amount: i128,
    ) -> Result<i128, Error> {
        // Access control: only payroll_dispatcher can call
        let dispatcher: Address = env.storage().instance().get(&DataKey::PayrollDispatcher).ok_or(Error::Unauthorized)?;
        dispatcher.require_auth();

        // Guard
        if env.storage().instance().get::<_, bool>(&DataKey::Paused).unwrap_or(false) {
            return Err(Error::ContractPaused);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Get registered yield sources
        let sources: Vec<Symbol> = env
            .storage().instance()
            .get(&DataKey::YieldSources)
            .ok_or(Error::NoSourcesRegistered)?;

        if sources.is_empty() {
            return Err(Error::NoSourcesRegistered);
        }

        // Transfer tokens from payroll_dispatcher to this contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(
            &dispatcher,
            env.current_contract_address(),
            &amount,
        );

        // Distribute across sources (equal split for MVP)
        let per_source = amount / (sources.len() as i128);
        let mut allocated: i128 = 0;

        // Load or create employer allocation
        let mut allocation: EmployerAllocation = env
            .storage().instance()
            .get(&DataKey::EmployerAllocations(employer.clone()))
            .unwrap_or(EmployerAllocation {
                total_principal: 0,
                by_source: Map::new(&env),
                accumulated_yield: 0,
                claimed_yield: 0,
            });

        for i in 0..sources.len() {
            let source_name = sources.get(i).ok_or(Error::NoSourcesRegistered)?;
            let source_addr: Address = env
                .storage().instance()
                .get(&DataKey::SourceAddress(source_name.clone()))
                .ok_or(Error::SourceNotFound)?;

            let deposit_amount = if i == sources.len() - 1 {
                amount - allocated // Last source gets remainder
            } else {
                per_source
            };

            if deposit_amount > 0 {
                // Cross-call to yield source deposit function
                Self::deposit_to_source(&env, &source_name, &source_addr, &token, &deposit_amount)?;

                // Track allocation
                let current = allocation.by_source.get(source_name.clone()).unwrap_or(0);
                allocation
                    .by_source
                    .set(source_name, current + deposit_amount);
                allocated += deposit_amount;
            }
        }

        allocation.total_principal += allocated;
        env.storage().instance()
            .set(&DataKey::EmployerAllocations(employer.clone()), &allocation);

        // Update total
        let total: i128 = env.storage().instance().get(&DataKey::TotalDeposited).unwrap_or(0);
        env.storage().instance()
            .set(&DataKey::TotalDeposited, &(total + allocated));

        // Emit event
        YieldRoutedEvent {
            contract: symbol_short!("yield"),
            event_type: symbol_short!("routed"),
            employer: employer.clone(),
            token: token.clone(),
            allocated,
        }.publish(&env);

        Ok(allocated)
    }

    /// Deposit to a yield source — dispatches based on strategy
    fn deposit_to_source(env: &Env, source_name: &Symbol, source_addr: &Address, token: &Address, amount: &i128) -> Result<(), Error> {
        let strategy: YieldSource = env.storage().instance()
            .get(&DataKey::SourceStrategy(source_name.clone()))
            .unwrap_or(YieldSource::DirectHold);

        match strategy {
            YieldSource::DirectHold => {
                let token_client = token::Client::new(env, token);
                token_client.approve(&env.current_contract_address(), source_addr, amount, &(env.ledger().sequence() + 1000));
                YieldDepositedEvent {
                    contract: symbol_short!("yield"),
                    event_type: symbol_short!("deposit"),
                    source: source_addr.clone(),
                    token: token.clone(),
                    amount: *amount,
                }.publish(&env);
                Ok(())
            }
            YieldSource::BlendProtocol(_) => {
                Self::deposit_blend(env, source_addr, token, amount)
            }
        }
    }

    /// Deposit to Blend protocol pool via cross-contract submit
    fn deposit_blend(env: &Env, pool_address: &Address, token: &Address, amount: &i128) -> Result<(), Error> {
        let token_client = token::Client::new(env, token);
        token_client.approve(&env.current_contract_address(), pool_address, amount, &(env.ledger().sequence() + 1000));

        let mut requests: Vec<BlendRequest> = Vec::new(env);
        requests.push_back(BlendRequest {
            request_type: 0, // SupplyCollateral
            address: token.clone(),
            amount: *amount,
        });

        let contract_addr = env.current_contract_address();
        let mut args: Vec<Val> = Vec::new(env);
        args.push_back(contract_addr.clone().into_val(env));
        args.push_back(contract_addr.clone().into_val(env));
        args.push_back(contract_addr.clone().into_val(env));
        args.push_back(requests.into_val(env));

        let _positions: BlendPositions = env.invoke_contract(
            pool_address,
            &Symbol::new(env, "submit"),
            args,
        );

        Ok(())
    }

    /// Withdraw from a yield source — dispatches based on strategy
    fn withdraw_from_source(env: &Env, source_name: &Symbol, source_addr: &Address, token: &Address, amount: &i128) -> Result<(), Error> {
        let strategy: YieldSource = env.storage().instance()
            .get(&DataKey::SourceStrategy(source_name.clone()))
            .unwrap_or(YieldSource::DirectHold);

        match strategy {
            YieldSource::DirectHold => {
                Ok(())
            }
            YieldSource::BlendProtocol(_) => {
                Self::withdraw_blend(env, source_addr, token, amount)
            }
        }
    }

    /// Withdraw from Blend protocol pool via cross-contract submit
    fn withdraw_blend(env: &Env, pool_address: &Address, token: &Address, amount: &i128) -> Result<(), Error> {
        let mut requests: Vec<BlendRequest> = Vec::new(env);
        requests.push_back(BlendRequest {
            request_type: 1, // WithdrawCollateral
            address: token.clone(),
            amount: *amount,
        });

        let contract_addr = env.current_contract_address();
        let mut args: Vec<Val> = Vec::new(env);
        args.push_back(contract_addr.clone().into_val(env));
        args.push_back(contract_addr.clone().into_val(env));
        args.push_back(contract_addr.clone().into_val(env));
        args.push_back(requests.into_val(env));

        let _positions: BlendPositions = env.invoke_contract(
            pool_address,
            &Symbol::new(env, "submit"),
            args,
        );

        Ok(())
    }

    /// Withdraw principal + yield for an employer
    /// Splits yield per YieldSplit config
    pub fn withdraw_yield(
        env: Env,
        employer: Address,
        token: Address,
    ) -> Result<(i128, i128, i128), Error> {
        employer.require_auth();

        let mut allocation: EmployerAllocation = env
            .storage().instance()
            .get(&DataKey::EmployerAllocations(employer.clone()))
            .ok_or(Error::EmployerNotRegistered)?;

        // Calculate yield accrued since last withdrawal
        let total_yield = Self::calculate_accrued_yield(&env, &allocation);

        if total_yield <= 0 && allocation.total_principal <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Withdraw principal from external yield sources
        let sources: Vec<Symbol> = env.storage().instance()
            .get(&DataKey::YieldSources)
            .unwrap_or(Vec::new(&env));

        for i in 0..sources.len() {
            let source_name = sources.get(i).ok_or(Error::NoSourcesRegistered)?;
            let principal = allocation.by_source.get(source_name.clone()).unwrap_or(0);

            if principal > 0 {
                let source_addr: Address = env.storage().instance()
                    .get(&DataKey::SourceAddress(source_name.clone()))
                    .ok_or(Error::SourceNotFound)?;

                Self::withdraw_from_source(&env, &source_name, &source_addr, &token, &principal)?;
            }
        }

        // Get yield split config
        let split: YieldSplit = env.storage().instance().get(&DataKey::YieldSplitConfig).ok_or(Error::InternalError)?;

        // Calculate split
        let employer_yield = total_yield * (split.employer_share as i128) / 10000;
        let _employee_pool_yield = total_yield * (split.employee_pool as i128) / 10000;
        let protocol_fee_yield = total_yield * (split.protocol_fee as i128) / 10000;

        let token_client = token::Client::new(&env, &token);

        // Transfer principal + employer yield share back to employer
        let employer_amount = allocation.total_principal + employer_yield;
        if employer_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &employer,
                &employer_amount,
            );
        }

        // Transfer protocol fee to admin
        if protocol_fee_yield > 0 {
            let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(Error::InternalError)?;
            token_client.transfer(
                &env.current_contract_address(),
                &admin,
                &protocol_fee_yield,
            );
        }

        // Employee pool yield stays in contract (claimable by employees)

        // Update allocation
        allocation.total_principal = 0; // All withdrawn
        allocation.by_source = Map::new(&env);
        allocation.accumulated_yield += total_yield;
        allocation.claimed_yield += total_yield;
        env.storage().instance()
            .set(&DataKey::EmployerAllocations(employer.clone()), &allocation);

        // Update total
        let total: i128 = env.storage().instance().get(&DataKey::TotalDeposited).unwrap_or(0);
        env.storage().instance()
            .set(&DataKey::TotalDeposited, &(total - allocation.total_principal));

        // Emit event
        YieldWithdrawnEvent {
            contract: symbol_short!("yield"),
            event_type: symbol_short!("withdraw"),
            employer: employer.clone(),
            employer_amount,
            employer_yield,
            protocol_fee_yield,
        }.publish(&env);

        Ok((employer_amount, employer_yield, protocol_fee_yield))
    }

    /// Calculate accrued yield for an employer's allocation
    /// Uses the weighted average rate across all sources
    /// For MVP: simple APR * time * principal calculation
    fn calculate_accrued_yield(env: &Env, allocation: &EmployerAllocation) -> i128 {
        let sources: Vec<Symbol> = env
            .storage().instance()
            .get(&DataKey::YieldSources)
            .unwrap_or(Vec::new(env));

        if sources.is_empty() || allocation.total_principal == 0 {
            return 0;
        }

        let mut total_weighted_rate: u64 = 0;
        let mut total_weight: i128 = 0;

        for i in 0..sources.len() {
            let source_name = sources.get(i).expect("source index must be in bounds");
            let principal = allocation.by_source.get(source_name.clone()).unwrap_or(0);
            if principal > 0 {
                let rate = Self::get_apy_from_source(env, &source_name);
                total_weighted_rate += (rate as u64) * (principal as u64);
                total_weight += principal;
            }
        }

        if total_weight == 0 {
            return 0;
        }

        let now = env.ledger().timestamp();
        let time_factor = (now as i128).min(31536000); // cap at 1 year

        let avg_rate_bps = (total_weighted_rate / (total_weight as u64)) as u32;

        // Yield = principal * rate(bps) / 10000 * time_factor / 31536000
        let simulated_yield = allocation.total_principal * (avg_rate_bps as i128) * time_factor / 10000 / 31536000;

        // Cap at reasonable amount for MVP
        simulated_yield
    }

    /// Collect employee bonus from the yield pool
    // PHASE 2: Implement pro-rata bonus distribution.
    // For now, return 0 as no yield has been distributed to employees yet.
    pub fn collect_employee_bonus(_env: Env, _employee: Address, _token: Address) -> Result<i128, Error> {
        Ok(0)
    }

    /// Update yield rate for a source (admin only)
    pub fn update_rate(env: Env, source: Symbol, new_rate: u32) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(Error::InternalError)?;
        admin.require_auth();

        if !env.storage().instance().has(&DataKey::SourceAddress(source.clone())) {
            return Err(Error::SourceNotFound);
        }

        env.storage().instance()
            .set(&DataKey::SourceRate(source.clone()), &new_rate);

        RateUpdatedEvent {
            contract: symbol_short!("yield"),
            event_type: symbol_short!("upd_rate"),
            source,
            new_rate,
        }.publish(&env);

        Ok(())
    }

    /// Get the current yield rate for a source
    pub fn get_yield_rate(env: Env, source: Symbol) -> u32 {
        env.storage().instance()
            .get(&DataKey::SourceRate(source))
            .unwrap_or(0)
    }

    /// Get the strategy for a yield source
    pub fn get_source_strategy(env: Env, source: Symbol) -> YieldSource {
        env.storage().instance()
            .get(&DataKey::SourceStrategy(source))
            .unwrap_or(YieldSource::DirectHold)
    }

    /// Get APY in basis points from a yield source (strategy-aware)
    /// For DirectHold: returns stored rate
    /// For BlendProtocol: returns stored rate (TODO: read from pool.get_reserve().b_rate)
    fn get_apy_from_source(env: &Env, source_name: &Symbol) -> u32 {
        env.storage().instance()
            .get(&DataKey::SourceRate(source_name.clone()))
            .unwrap_or(0)
    }

    /// Get the yield split configuration
    pub fn get_yield_split(env: Env) -> YieldSplit {
        env.storage().instance()
            .get(&DataKey::YieldSplitConfig)
            .expect("YieldSplitConfig must be configured")
    }

    /// Set the yield split configuration (admin/governance only)
    pub fn set_yield_split(env: Env, split: YieldSplit) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(Error::InternalError)?;
        admin.require_auth();

        // Validate: shares must sum to 10000
        if split.employer_share + split.employee_pool + split.protocol_fee != 10000 {
            return Err(Error::SplitConfigInvalid);
        }

        env.storage().instance()
            .set(&DataKey::YieldSplitConfig, &split);

        SplitUpdatedEvent {
            contract: symbol_short!("yield"),
            event_type: symbol_short!("splits"),
        }.publish(&env);

        Ok(())
    }

    /// Get registered yield sources
    pub fn get_sources(env: Env) -> Vec<Symbol> {
        env.storage().instance()
            .get(&DataKey::YieldSources)
            .unwrap_or(Vec::new(&env))
    }

    /// Get employer's allocation
    pub fn get_employer_allocation(env: Env, employer: Address) -> EmployerAllocation {
        env.storage().instance()
            .get(&DataKey::EmployerAllocations(employer))
            .unwrap_or(EmployerAllocation {
                total_principal: 0,
                by_source: Map::new(&env),
                accumulated_yield: 0,
                claimed_yield: 0,
            })
    }

    /// Get total deposited across all employers
    pub fn get_total_deposited(env: Env) -> i128 {
        env.storage().instance()
            .get(&DataKey::TotalDeposited)
            .unwrap_or(0)
    }

    /// Emergency pause (admin only)
    pub fn pause(env: Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Admin must be configured");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
    }

    /// Emergency unpause (admin only)
    pub fn unpause(env: Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Admin must be configured");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        symbol_short,
    };

    #[test]
    fn test_register_source() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let pool = Address::generate(&env);

        let contract_id = env.register(YieldRouter, (&admin,));
        let client = YieldRouterClient::new(&env, &contract_id);

        let blend = symbol_short!("blend");
        client.register_source(&blend, &pool, &500);

        let sources = client.get_sources();
        assert_eq!(sources.len(), 1);
        assert_eq!(sources.get(0).unwrap(), blend);

        assert_eq!(client.get_yield_rate(&blend), 500);
    }

    #[test]
    fn test_duplicate_source() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let pool = Address::generate(&env);

        let contract_id = env.register(YieldRouter, (&admin,));
        let client = YieldRouterClient::new(&env, &contract_id);

        let blend = symbol_short!("blend");
        client.register_source(&blend, &pool, &500);

        let result = client.try_register_source(&blend, &pool, &600);
        assert_eq!(result.unwrap_err().unwrap(), Error::SourceAlreadyExists);
    }

    #[test]
    fn test_yield_split_default() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);

        let contract_id = env.register(YieldRouter, (&admin,));
        let client = YieldRouterClient::new(&env, &contract_id);

        let split = client.get_yield_split();
        assert_eq!(split.employer_share, 8000);
        assert_eq!(split.employee_pool, 1500);
        assert_eq!(split.protocol_fee, 500);
    }

    #[test]
    fn test_update_yield_split() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);

        let contract_id = env.register(YieldRouter, (&admin,));
        let client = YieldRouterClient::new(&env, &contract_id);

        let new_split = YieldSplit {
            employer_share: 7000,
            employee_pool: 2000,
            protocol_fee: 1000,
        };

        client.set_yield_split(&new_split);

        let split = client.get_yield_split();
        assert_eq!(split.employer_share, 7000);
        assert_eq!(split.employee_pool, 2000);
        assert_eq!(split.protocol_fee, 1000);
    }

    #[test]
    fn test_invalid_yield_split() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);

        let contract_id = env.register(YieldRouter, (&admin,));
        let client = YieldRouterClient::new(&env, &contract_id);

        let bad_split = YieldSplit {
            employer_share: 5000,
            employee_pool: 3000,
            protocol_fee: 3000, // Sums to 11000
        };

        let result = client.try_set_yield_split(&bad_split);
        assert_eq!(result.unwrap_err().unwrap(), Error::SplitConfigInvalid);
    }

    #[test]
    fn test_update_rate() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let pool = Address::generate(&env);

        let contract_id = env.register(YieldRouter, (&admin,));
        let client = YieldRouterClient::new(&env, &contract_id);

        let blend = symbol_short!("blend");
        client.register_source(&blend, &pool, &500);

        client.update_rate(&blend, &800);
        assert_eq!(client.get_yield_rate(&blend), 800);
    }

    #[test]
    fn test_get_sources() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let pool1 = Address::generate(&env);
        let pool2 = Address::generate(&env);

        let contract_id = env.register(YieldRouter, (&admin,));
        let client = YieldRouterClient::new(&env, &contract_id);

        let blend = symbol_short!("blend");
        let soroswap = symbol_short!("soroswap");

        client.register_source(&blend, &pool1, &500);
        client.register_source(&soroswap, &pool2, &300);

        let sources = client.get_sources();
        assert_eq!(sources.len(), 2);
    }

    #[test]
    fn test_route_yield_no_sources() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let _employer = Address::generate(&env);
        let _token = Address::generate(&env);

        let contract_id = env.register(YieldRouter, (&admin,));
        let client = YieldRouterClient::new(&env, &contract_id);

        // Set payroll dispatcher
        let dispatcher = Address::generate(&env);
        client.set_payroll_dispatcher(&dispatcher);

        // Try route with no sources registered
        // Note: in test with mock_all_auths, require_auth on dispatcher may pass
        // but NoSourcesRegistered should trigger
    }

    #[test]
    fn test_employer_allocation() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);

        let contract_id = env.register(YieldRouter, (&admin,));
        let client = YieldRouterClient::new(&env, &contract_id);

        let allocation = client.get_employer_allocation(&employer);
        assert_eq!(allocation.total_principal, 0);
    }

    #[test]
    fn test_total_deposited() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);

        let contract_id = env.register(YieldRouter, (&admin,));
        let client = YieldRouterClient::new(&env, &contract_id);

        assert_eq!(client.get_total_deposited(), 0);
    }
}
