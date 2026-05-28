// ─── Stellar Network ─────────────────────────────────────────────
export const STELLAR_NETWORK = {
  passphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  friendbot: "https://friendbot.stellar.org",
} as const;

// ─── Contract Addresses (testnet) ────────────────────────────────
// Updated after testnet deployment (May 28, 2026)
export const CONTRACT_ADDRESSES = {
  payroll_dispatcher: "CCCB3EVCABUMZJAIN5556IHRPZN6VNNP6PU3I6HBJ3AVLZBBOLYIQQSV",
  streaming_vault: "CAIHQBV4766BNMEZZYVF5DLWXOZTVLZKUXABSHFZKYIQZII7NT42JWVC",
  wallet_factory: "CCRRGXP2RXEURFYMUFUZT7TU26B6BP74WH2LUGAK3EHDP7E3AT6FXXZT",
  yield_router: "CBURJANYO5HG5S4FQIAOFKFEJ7P5SPOOPZXLJMS5A3ZCLOFPZBMQYUPK",
  policy_signer: "CA42C7B4XETGCZISH2OF2TFJSVL6JQAKZBAJST5CNU2M5MF6R2U2BTU5",
};

// ─── User Types ──────────────────────────────────────────────────
export type UserRole = "employer" | "employee";

export interface UserProfile {
  address: string;
  role: UserRole;
  passkeyPubkey?: string;
}

// ─── Stream Types ────────────────────────────────────────────────
export interface StreamData {
  id: number;
  employer: string;
  employee: string;
  token: string;
  total_amount: string;
  amount_per_second: string;
  start_time: number;
  stop_time: number;
  paused: boolean;
  paused_at: number;
  total_paused_duration: number;
  total_claimed: string;
  refunded: boolean;
}

export interface BatchMetadata {
  id: number;
  employer: string;
  total_amount: string;
  token: string;
  recipient_count: number;
  timestamp: number;
  status: "Pending" | "Verified" | "Processing" | "Completed" | "Failed";
  stream_count: number;
  nullifier_count: number;
}

// ─── Payroll Batch (for CSV upload) ──────────────────────────────
export interface PayrollRecipient {
  address: string;
  amount: string;
  duration_secs: number;
}

export interface PayrollBatchSubmission {
  employer: string;
  total_amount: string;
  recipients: PayrollRecipient[];
}

// ─── Wallet State ────────────────────────────────────────────────
export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isPasskey: boolean;
  error: string | null;
}

// ─── Yield Types ─────────────────────────────────────────────────
export interface YieldSplit {
  employer_share: number;
  employee_pool: number;
  protocol_fee: number;
}

export interface EmployerAllocation {
  total_principal: string;
  accumulated_yield: string;
  claimed_yield: string;
}

// ─── Policy Types ────────────────────────────────────────────────
export interface PolicyConfig {
  name: string;
  spending_limit: string;
  period_seconds: number;
  allowed_tokens: string[];
  required_signers: number;
  authorized_signers: string[];
}
