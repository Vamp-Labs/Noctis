// ─── Stellar Network ─────────────────────────────────────────────
export const STELLAR_NETWORK = {
  passphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  friendbot: "https://friendbot.stellar.org",
} as const;

// ─── Contract Addresses (testnet) ────────────────────────────────
// Updated after testnet deployment (May 29, 2026 — v2 with Groth16 + Blend)
export const CONTRACT_ADDRESSES = {
  payroll_dispatcher: "CDP36DTJD22K3MHBPS7YF724S4H4ZB6OAX3W4UYXFQ35AE62S4EHR4LF",
  streaming_vault: "CCR6YESUPNGSTDU2JNP5AG5HJ6PZLHC6RUVRHRBK44PDAZO5EUQLE3E3",
  wallet_factory: "CA5KLXL6T2PLD4OVEVVG3QS5B7NQ3S7BGATNNCKD2R6TK2Y724K434SQ",
  yield_router: "CBFWLCN5XTFZHCJGWNIBSMMB3M5SMFAYHTCOGHWBY2SSXSK5XEE5Q7KB",
  policy_signer: "CCQTEQOHLRV4IR5HZ6WXRFSPC2KUUWC3YJOFPABUBN5PY5NZ5HEGM5RI",
  // NOCTIS test token (SAC — Stellar Asset Contract)
  noctis_token: "CDMM3QPRZKQDOXSG3BJMXLBXVYAVAN5NGUJOVVXDEGB4YHNU44V54OYI",
};

// ─── Faucet Config ────────────────────────────────────────────────
export const FAUCET_CONFIG = {
  claimAmount: "100000",          // 100,000 NOCTIS per claim
  friendbotUrl: STELLAR_NETWORK.friendbot,
  apiUrl: "/api/faucet/claim",
} as const;

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
  walletId: number | null;
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
