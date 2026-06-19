// Shared type definitions for ZK-SDP
// Used across frontend, backend Edge Functions, and auditor CLI.

export interface PayrollRow {
  employee_index: number
  wallet_address: string
  salary_amount_usdc: number
}

export interface LeafData {
  employee_index: number
  wallet_address: string
  salary_amount: bigint
  nullifier_secret: Uint8Array
  commitment: string
  merkle_siblings: string[]
  merkle_path_indices: number[]
}

export interface TreeBuildResult {
  batch_id: string
  merkle_root: string
  total_amount: number
  leaf_count: number
  leaves: LeafData[]
}

export interface WithdrawalPayload {
  batch_id: string
  contract_address: string
  token_address: string
  employee_index: number
  salary_amount: string
  salary_amount_field: string
  nullifier_secret: string
  merkle_root: string
  merkle_siblings: string[]
  merkle_path_indices: number[]
}

export interface BatchState {
  batch_id: number
  employer: string
  merkle_root: string
  token_address: string
  total_amount: number
  leaf_count: number
  claimed_count: number
  status: 'active' | 'closed'
  created_at: string
}

export interface BatchEvent {
  id: number
  batch_id: number
  event_type: 'BatchCreated' | 'Withdrawn'
  nullifier_hash: string | null
  recipient: string | null
  ledger: number
  timestamp: string
}
