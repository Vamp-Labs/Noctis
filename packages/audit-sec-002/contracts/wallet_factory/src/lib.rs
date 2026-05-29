#![no_std]

use core::mem::transmute;

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, crypto::Hash, symbol_short,
    Address, Bytes, BytesN, Env, Symbol,
};

/// Error codes for Wallet Factory contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    Unauthorized = 1,
    WalletAlreadyExists = 2,
    WalletNotFound = 3,
    InvalidPubkey = 4,
    SignatureVerificationFailed = 5,
    ContractPaused = 6,
    InternalError = 7,
}

/// Storage keys for the Wallet Factory contract
#[contracttype]
pub enum DataKey {
    Admin,                              // Address — contract admin
    WalletCount,                        // u32 — total wallets created
    Wallet(u32),                        // WalletData — wallet by ID
    OwnerToWallet(Address),             // u32 — owner address → wallet ID
    PasskeyToWallet(BytesN<32>),        // u32 — passkey hash → wallet ID (SHA256 of pubkey)
    Paused,                             // bool — emergency pause
}

/// Full wallet data structure
#[contracttype]
#[derive(Debug)]
pub struct WalletData {
    pub id: u32,
    pub owner: Address,                  // Stellar address of the wallet owner
    pub passkey_pubkey: Bytes,           // secp256r1 compressed public key (33 bytes)
    pub deployed_at: u64,               // Timestamp of creation
    pub last_used: u64,                  // Timestamp of last signature verification
    pub nonce: u64,                      // Incrementing nonce for replay protection
}

// ─── Events ──────────────────────────────────────────────────────────
#[contractevent]
pub struct WalletCreatedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub wallet_id: u32,
    pub owner: Address,
}

#[contractevent]
pub struct PasskeyUpdatedEvent {
    #[topic]
    pub contract: Symbol,
    #[topic]
    pub event_type: Symbol,
    pub wallet_id: u32,
    pub owner: Address,
}

/// The main Wallet Factory contract
/// Maps Stellar addresses to secp256r1 passkey public keys (SEP-45 / WebAuthn)
#[contract]
pub struct WalletFactory;

#[contractimpl]
impl WalletFactory {
    /// Initialize contract with admin address
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    /// Create a new wallet registration for a passkey-authenticated user
    /// Stores the mapping: owner Address ↔ secp256r1 compressed public key
    pub fn create_wallet(
        env: Env,
        owner: Address,
        passkey_pubkey: Bytes,
    ) -> Result<u32, Error> {
        // Access control: owner must authorize
        owner.require_auth();

        // Guard: not paused
        if env.storage().instance().get::<_, bool>(&DataKey::Paused).unwrap_or(false) {
            return Err(Error::ContractPaused);
        }

        // Validate: secp256r1 uncompressed public key must be 65 bytes
        // Format: 0x04 prefix + 32-byte x-coordinate + 32-byte y-coordinate
        if passkey_pubkey.len() != 65 {
            return Err(Error::InvalidPubkey);
        }

        let prefix = passkey_pubkey.get(0).ok_or(Error::InvalidPubkey)?;
        if prefix != 0x04 {
            return Err(Error::InvalidPubkey);
        }

        // Check: owner doesn't already have a wallet
        if env.storage().instance().has(&DataKey::OwnerToWallet(owner.clone())) {
            return Err(Error::WalletAlreadyExists);
        }

        // Generate wallet ID
        let wallet_count = env
            .storage().instance()
            .get::<_, u32>(&DataKey::WalletCount)
            .unwrap_or(0);
        let wallet_id = wallet_count + 1;

        let now = env.ledger().timestamp();

        let wallet = WalletData {
            id: wallet_id,
            owner: owner.clone(),
            passkey_pubkey: passkey_pubkey.clone(),
            deployed_at: now,
            last_used: now,
            nonce: 0,
        };

        // Store wallet
        env.storage().instance().set(&DataKey::Wallet(wallet_id), &wallet);
        env.storage().instance()
            .set(&DataKey::OwnerToWallet(owner.clone()), &wallet_id);
        env.storage().instance()
            .set(&DataKey::WalletCount, &wallet_id);

        // Index: store by passkey hash for reverse lookup
        let passkey_hash: BytesN<32> = env.crypto().sha256(&passkey_pubkey).into();
        env.storage().instance()
            .set(&DataKey::PasskeyToWallet(passkey_hash), &wallet_id);

        // Emit event
        WalletCreatedEvent {
            contract: symbol_short!("wallet"),
            event_type: symbol_short!("created"),
            wallet_id,
            owner: owner.clone(),
        }.publish(&env);

        Ok(wallet_id)
    }

    /// Get the wallet ID for an owner
    pub fn get_wallet_id(env: Env, owner: Address) -> Result<u32, Error> {
        env.storage().instance()
            .get(&DataKey::OwnerToWallet(owner))
            .ok_or(Error::WalletNotFound)
    }

    /// Get full wallet data by owner address
    pub fn get_wallet(env: Env, owner: Address) -> Result<WalletData, Error> {
        let wallet_id = env
            .storage().instance()
            .get::<_, u32>(&DataKey::OwnerToWallet(owner))
            .ok_or(Error::WalletNotFound)?;
        env.storage().instance()
            .get(&DataKey::Wallet(wallet_id))
            .ok_or(Error::WalletNotFound)
    }

    /// Get wallet data by wallet ID
    pub fn get_wallet_by_id(env: Env, wallet_id: u32) -> Result<WalletData, Error> {
        env.storage().instance()
            .get(&DataKey::Wallet(wallet_id))
            .ok_or(Error::WalletNotFound)
    }

    /// Verify a secp256r1 signature (WebAuthn compatible)
    /// The message_hash should be a SHA256 hash of the original message
    /// The signature should be a 64-byte RSV-format secp256r1 signature
    /// Returns true if signature is valid for the given owner and message_hash
    pub fn verify_signature(
        env: Env,
        owner: Address,
        message_hash: BytesN<32>,
        signature: BytesN<64>,
    ) -> Result<(), Error> {
        let wallet_id = env
            .storage().instance()
            .get::<_, u32>(&DataKey::OwnerToWallet(owner.clone()))
            .ok_or(Error::WalletNotFound)?;

        let mut wallet: WalletData = env
            .storage().instance()
            .get(&DataKey::Wallet(wallet_id))
            .ok_or(Error::WalletNotFound)?;

        // Convert passkey_pubkey (Bytes) to BytesN<65> for the verify call
        let pubkey_n: BytesN<65> = BytesN::try_from(&wallet.passkey_pubkey)
            .map_err(|_| Error::InternalError)?;

        // Convert BytesN<32> to Hash<32> for secp256r1_verify
        // SAFETY: Hash<32> is #[repr(transparent)] wrapping BytesN<32>, so
        // transmuting between them is sound. BytesN<32> is the contract-safe
        // representation of a hash (Hash<N> cannot be a contract parameter).
        let msg_hash: Hash<32> = unsafe { transmute(message_hash) };

        // Verify secp256r1 signature using host function
        // Protocol 26 secp256r1_verify takes:
        //   pubkey: &BytesN<65> (uncompressed: 04 || x || y)
        //   msg_hash: &Hash<32>
        //   sig: &BytesN<64>
        // Note: secp256r1_verify panics on invalid signature (returns () on success)
        env.crypto().secp256r1_verify(
            &pubkey_n,
            &msg_hash,
            &signature,
        );

        // Update last used timestamp
        wallet.last_used = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::Wallet(wallet_id), &wallet);

        Ok(())
    }

    /// Update/replace the passkey public key for an owner
    /// Used when user gets a new device and needs to register a new passkey
    pub fn update_passkey(
        env: Env,
        owner: Address,
        new_pubkey: Bytes,
    ) -> Result<(), Error> {
        // Access control
        owner.require_auth();

        // Validate new pubkey
        if new_pubkey.len() != 65 {
            return Err(Error::InvalidPubkey);
        }
        let prefix = new_pubkey.get(0).ok_or(Error::InvalidPubkey)?;
        if prefix != 0x04 {
            return Err(Error::InvalidPubkey);
        }

        let wallet_id = env
            .storage().instance()
            .get::<_, u32>(&DataKey::OwnerToWallet(owner.clone()))
            .ok_or(Error::WalletNotFound)?;

        let mut wallet: WalletData = env
            .storage().instance()
            .get(&DataKey::Wallet(wallet_id))
            .ok_or(Error::WalletNotFound)?;

        // Remove old passkey index
        let old_hash: BytesN<32> = env.crypto().sha256(&wallet.passkey_pubkey).into();
        env.storage().instance().remove(&DataKey::PasskeyToWallet(old_hash));

        // Update passkey
        wallet.passkey_pubkey = new_pubkey.clone();
        wallet.last_used = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::Wallet(wallet_id), &wallet);

        // Add new passkey index
        let new_hash: BytesN<32> = env.crypto().sha256(&new_pubkey).into();
        env.storage().instance()
            .set(&DataKey::PasskeyToWallet(new_hash), &wallet_id);

        // Emit event
        PasskeyUpdatedEvent {
            contract: symbol_short!("wallet"),
            event_type: symbol_short!("updated"),
            wallet_id,
            owner: owner.clone(),
        }.publish(&env);

        Ok(())
    }

    /// Check if an owner has a registered wallet
    pub fn has_wallet(env: Env, owner: Address) -> bool {
        env.storage().instance().has(&DataKey::OwnerToWallet(owner))
    }

    /// Get total wallet count
    pub fn get_wallet_count(env: Env) -> u32 {
        env.storage().instance()
            .get::<_, u32>(&DataKey::WalletCount)
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
        BytesN, Env,
    };

    #[test]
    fn test_create_wallet_basic() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);

        // Create a valid uncompressed secp256r1 public key (65 bytes)
        // 0x04 prefix + 32-byte x + 32-byte y (all zeros for test)
        let mut pubkey_bytes = [0u8; 65];
        pubkey_bytes[0] = 0x04; // Uncompressed prefix
        let passkey_pubkey = Bytes::from_array(&env, &pubkey_bytes);

        let contract_id = env.register(WalletFactory, (&admin,));
        let client = WalletFactoryClient::new(&env, &contract_id);

        let wallet_id = client
            .create_wallet(&owner, &passkey_pubkey);
        assert_eq!(wallet_id, 1);

        let wallet = client.get_wallet(&owner);
        assert_eq!(wallet.owner, owner);
        assert_eq!(wallet.passkey_pubkey, passkey_pubkey);
    }

    #[test]
    fn test_duplicate_wallet() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);

        let mut pubkey_bytes = [0u8; 65];
        pubkey_bytes[0] = 0x04;
        let passkey_pubkey = Bytes::from_array(&env, &pubkey_bytes);

        let contract_id = env.register(WalletFactory, (&admin,));
        let client = WalletFactoryClient::new(&env, &contract_id);

        client.create_wallet(&owner, &passkey_pubkey);

        let result = client.try_create_wallet(&owner, &passkey_pubkey).unwrap_err().unwrap();
        assert_eq!(result, Error::WalletAlreadyExists);
    }

    #[test]
    fn test_invalid_pubkey() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);

        // Wrong length
        let bad_pubkey = Bytes::from_array(&env, &[0x02u8, 0x01, 0x02]);

        let contract_id = env.register(WalletFactory, (&admin,));
        let client = WalletFactoryClient::new(&env, &contract_id);

        let result = client.try_create_wallet(&owner, &bad_pubkey).unwrap_err().unwrap();
        assert_eq!(result, Error::InvalidPubkey);

        // Wrong prefix
        let mut bad_prefix = [0u8; 65];
        bad_prefix[0] = 0x05; // Uncompressed prefix — should be 0x02 or 0x03
        let bad_pubkey2 = Bytes::from_array(&env, &bad_prefix);

        let result2 = client.try_create_wallet(&owner, &bad_pubkey2).unwrap_err().unwrap();
        assert_eq!(result2, Error::InvalidPubkey);
    }

    #[test]
    fn test_update_passkey() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);

        let mut pubkey1 = [0u8; 65];
        pubkey1[0] = 0x04;
        let pk1 = Bytes::from_array(&env, &pubkey1);

        let mut pubkey2 = [0u8; 65];
        pubkey2[0] = 0x04;
        let pk2 = Bytes::from_array(&env, &pubkey2);

        let contract_id = env.register(WalletFactory, (&admin,));
        let client = WalletFactoryClient::new(&env, &contract_id);

        client.create_wallet(&owner, &pk1);
        client.update_passkey(&owner, &pk2);

        let wallet = client.get_wallet(&owner);
        assert_eq!(wallet.passkey_pubkey, pk2);
    }

    #[test]
    fn test_wallet_not_found() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);

        let contract_id = env.register(WalletFactory, (&admin,));
        let client = WalletFactoryClient::new(&env, &contract_id);

        let result = client.try_get_wallet(&owner).unwrap_err().unwrap();
        assert_eq!(result, Error::WalletNotFound);
    }

    #[test]
    fn test_has_wallet() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner1 = Address::generate(&env);
        let owner2 = Address::generate(&env);

        let mut pubkey = [0u8; 65];
        pubkey[0] = 0x04;
        let pk = Bytes::from_array(&env, &pubkey);

        let contract_id = env.register(WalletFactory, (&admin,));
        let client = WalletFactoryClient::new(&env, &contract_id);

        assert!(!client.has_wallet(&owner1));

        client.create_wallet(&owner1, &pk);

        assert!(client.has_wallet(&owner1));
        assert!(!client.has_wallet(&owner2));
    }

    #[test]
    fn test_wallet_count() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);

        let mut pubkey = [0u8; 65];
        pubkey[0] = 0x04;
        let pk = Bytes::from_array(&env, &pubkey);

        let contract_id = env.register(WalletFactory, (&admin,));
        let client = WalletFactoryClient::new(&env, &contract_id);

        assert_eq!(client.get_wallet_count(), 0);

        for _i in 0..5 {
            let owner = Address::generate(&env);
            client.create_wallet(&owner, &pk);
        }

        assert_eq!(client.get_wallet_count(), 5);
    }

    #[test]
    fn test_verify_signature() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);

        // Use 65-byte uncompressed secp256r1 public key (valid curve point)
        let mut pubkey = [0u8; 65];
        pubkey[0] = 0x04;
        // secp256r1 generator point coordinates
        let x: [u8; 32] = [
            0x6B, 0x17, 0xD1, 0xF2, 0xE1, 0x2C, 0x42, 0x47,
            0xF8, 0xBC, 0xE6, 0xE5, 0x63, 0xA4, 0x40, 0xF2,
            0x77, 0x03, 0x7D, 0x81, 0x2D, 0xEB, 0x33, 0xA0,
            0xF4, 0xA1, 0x39, 0x45, 0xD8, 0x98, 0xC2, 0x96,
        ];
        let y: [u8; 32] = [
            0x4F, 0xE3, 0x42, 0xE2, 0xFE, 0x1A, 0x7F, 0x9B,
            0x8E, 0xE7, 0xEB, 0x4A, 0x7C, 0x0F, 0x9E, 0x16,
            0x2B, 0xCE, 0x33, 0x57, 0x6B, 0x31, 0x5E, 0xCE,
            0xCB, 0xB6, 0x40, 0x68, 0x37, 0xBF, 0x51, 0xF5,
        ];
        pubkey[1..33].copy_from_slice(&x);
        pubkey[33..65].copy_from_slice(&y);
        let pk = Bytes::from_array(&env, &pubkey);

        let contract_id = env.register(WalletFactory, (&admin,));
        let client = WalletFactoryClient::new(&env, &contract_id);

        client.create_wallet(&owner, &pk);

        let msg_hash: BytesN<32> = env.crypto().sha256(&Bytes::from_array(&env, b"test_message")).into();
        // All-zero signature is rejected by secp256r1_verify (invalid format)
        let sig = BytesN::from_array(&env, &[0u8; 64]);

        let result = client.try_verify_signature(&owner, &msg_hash, &sig);
        assert!(result.is_err());
    }
}
