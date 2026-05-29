// ─── Faucet Client ────────────────────────────────────────────────
// Calls POST /api/faucet/claim to get testnet tokens

export interface FaucetClaimResponse {
  success: boolean;
  tx_hash?: string;
  amount?: string;
  token?: string;
  xlm_funded?: boolean;
  message?: string;
  error?: string;
}

export interface FaucetStatus {
  available: boolean;
  claims_served: number;
  max_claims: number;
  token: string;
  amount: string;
  network: string;
}

/**
 * Claim test tokens from the faucet.
 * @param wallet - Stellar public key (G...)
 * @returns FaucetClaimResponse
 */
export async function claimFaucet(wallet: string): Promise<FaucetClaimResponse> {
  const response = await fetch("/api/faucet/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet }),
  });

  const data: FaucetClaimResponse = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Faucet returned ${response.status}`);
  }

  return data;
}

/**
 * Check faucet status (no auth needed).
 */
export async function getFaucetStatus(): Promise<FaucetStatus> {
  const response = await fetch("/api/faucet/claim");
  return response.json();
}

/**
 * Check if a wallet has already claimed (from local cache).
 * Uses sessionStorage so it persists during a session but resets on new tab.
 */
export function hasClaimedInSession(wallet: string): boolean {
  return sessionStorage.getItem(`faucet_claimed_${wallet}`) === "true";
}

export function markClaimedInSession(wallet: string) {
  sessionStorage.setItem(`faucet_claimed_${wallet}`, "true");
}
