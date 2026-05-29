// ─── Trustline Helper ─────────────────────────────────────────────
// Creates a trustline for the NOCTIS SAC token via Freighter.
// SAC mint() requires the recipient to have a trustline first.

import {
  Asset,
  Account,
  TransactionBuilder,
  Operation,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { signTransaction, isConnected } from "@stellar/freighter-api";

// ─── NOCTIS Token Details ─────────────────────────────────────────
// The SAC token at CDMM3... wraps a Stellar classic asset with:
const NOCTIS_ASSET_CODE = "NOCTIS";
const NOCTIS_ISSUER = "GDTJ5ITQCKMEI7QZSBCYQA5FMNCKCAFTXTMN44CLJ5BITU5R4T53XQQX";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

/**
 * Check if a wallet already has a trustline for the NOCTIS token.
 * Uses Horizon to query account trustlines.
 */
export async function hasTrustline(walletAddress: string): Promise<boolean> {
  try {
    const resp = await fetch(
      `${HORIZON_URL}/accounts/${walletAddress}`
    );
    if (!resp.ok) return false;
    const data: any = await resp.json();

    // Check if any balance entry matches our asset
    const balances: any[] = data.balances || [];
    return balances.some(
      (b: any) =>
        b.asset_type !== "native" &&
        b.asset_code === NOCTIS_ASSET_CODE &&
        b.asset_issuer === NOCTIS_ISSUER
    );
  } catch {
    return false;
  }
}

/**
 * Fetch account info from Horizon with retry (handles Friendbot delay).
 */
async function fetchAccountWithRetry(
  walletAddress: string,
  maxRetries = 5
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const resp = await fetch(`${HORIZON_URL}/accounts/${walletAddress}`);
    if (resp.ok) {
      return resp.json();
    }
    // Wait before retry (exponential backoff: 1s, 2s, 4s, 8s, 16s)
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
  }
  throw new Error(
    `Account ${walletAddress} not found on testnet after ${maxRetries} retries. ` +
    `Make sure it has been funded with XLM first.`
  );
}

/**
 * Build and sign a changeTrust transaction for NOCTIS via Freighter,
 * then submit to Horizon.
 *
 * Returns the transaction hash on success, or "already_exists" if
 * the trustline was already set up.
 */
export async function createTrustlineViaFreighter(
  walletAddress: string
): Promise<string> {
  // 1. Get current sequence number from Horizon (with retry for Friendbot delay)
  const accountData = await fetchAccountWithRetry(walletAddress);
  const sequenceNum = accountData.sequence;
  const sourceAccount = new Account(walletAddress, sequenceNum);

  // 2. Build the changeTrust transaction
  const asset = new Asset(NOCTIS_ASSET_CODE, NOCTIS_ISSUER);
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({
      asset,
      limit: "922337203685.4775807", // Max int64 as asset amount (7 decimals) — effectively unlimited
    }))
    .setTimeout(30)
    .build();

  // 3. Sign with Freighter via @stellar/freighter-api
  const hasExtension = await isConnected();
  if (!hasExtension) {
    throw new Error(
      "Freighter wallet not detected. Make sure:\n" +
      "1. Freighter extension is installed (freighter.app)\n" +
      "2. You're using HTTPS or localhost\n" +
      "3. Freighter has permission on this site\n" +
      "If it still doesn't work, try refreshing the page."
    );
  }

  const { signedTxXdr } = await signTransaction(tx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // 4. Submit to Horizon
  const submitResp = await fetch(`${HORIZON_URL}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tx: signedTxXdr }),
  });

  const submitResult: any = await submitResp.json();

  if (submitResult.ledger) {
    return submitResult.hash;
  }

  // Check if trustline already exists (not an error)
  const codes = JSON.stringify(submitResult.extras?.result_codes || {});
  if (codes.includes("op_already_exists")) {
    return "already_exists";
  }

  throw new Error(
    `Trustline failed: ${codes}`
  );
}

/**
 * Fetch the NOCTIS token balance for a given wallet address.
 * Queries Horizon to find the NOCTIS trustline balance.
 * Returns the balance as a string, or "0" if no trustline exists.
 */
export async function getNoctisBalance(walletAddress: string): Promise<string> {
  try {
    const resp = await fetch(`${HORIZON_URL}/accounts/${walletAddress}`);
    if (!resp.ok) return "0";
    const data: any = await resp.json();

    const balances: any[] = data.balances || [];
    const noctisBalance = balances.find(
      (b: any) =>
        b.asset_type !== "native" &&
        b.asset_code === NOCTIS_ASSET_CODE &&
        b.asset_issuer === NOCTIS_ISSUER
    );

    return noctisBalance ? noctisBalance.balance : "0";
  } catch {
    return "0";
  }
}
