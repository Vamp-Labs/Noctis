// ─── Faucet Client ────────────────────────────────────────────────
// Calls POST /api/faucet/claim to get testnet tokens.
// Before calling, the wallet MUST have a trustline for NOCTIS.
// Use createTrustlineViaFreighter() from trustline.ts if needed.

import { hasTrustline, createTrustlineViaFreighter } from "@/lib/trustline";
import { FAUCET_CONFIG } from "@/types";

export interface FaucetClaimResponse {
  success: boolean;
  tx_hash?: string;
  amount?: string;
  token?: string;
  xlm_status?: "funded" | "already_funded" | "failed";
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

/**
 * Full claim flow: check trustline → create if needed → call faucet.
 * XLM funding is handled by the server-side API (Friendbot).
 * Returns the faucet claim response.
 */
export async function claimFaucetWithTrustline(
  wallet: string,
  onProgress?: (step: string) => void
): Promise<FaucetClaimResponse> {
  // Step 1: Check trustline, create if needed
  // (This must happen client-side because it requires Freighter signing)
  onProgress?.("Checking NOCTIS trustline...");
  const hasTrust = await hasTrustline(wallet);

  if (!hasTrust) {
    onProgress?.("Creating trustline for NOCTIS token (sign with Freighter)...");
    const txResult = await createTrustlineViaFreighter(wallet);
    if (txResult !== "already_exists") {
      onProgress?.("Waiting for trustline confirmation...");
      // Wait for the trustline ledger to close before faucet call
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  // Step 2: Claim tokens from faucet (server handles XLM funding + mint)
  onProgress?.("Claiming tokens from faucet...");
  const result = await claimFaucet(wallet);

  markClaimedInSession(wallet);
  return result;
}
