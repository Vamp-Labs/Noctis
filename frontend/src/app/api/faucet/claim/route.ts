import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────
interface ClaimRequest {
  wallet: string;
}

interface ClaimResponse {
  success: boolean;
  tx_hash?: string;
  amount?: string;
  token?: string;
  xlm_funded?: boolean;
  message?: string;
  error?: string;
}

// ─── Configuration ────────────────────────────────────────────────
const FAUCET_AMOUNT = "100000"; // 100,000 NOCTIS
const NOCTIS_TOKEN = "CDMM3QPRZKQDOXSG3BJMXLBXVYAVAN5NGUJOVVXDEGB4YHNU44V54OYI";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const ADMIN_SECRET = process.env.FAUCET_ADMIN_SECRET;
const RPC_URL = "https://soroban-testnet.stellar.org";

// In-memory claim tracker (resets on server restart — acceptable for testnet)
const claimedWallets = new Set<string>();
let claimCount = 0;
const MAX_CLAIMS = 100; // global rate limit

// ─── Stellar SDK helpers (dynamic import to avoid client bundling) ─
async function getStellarSdk() {
  return import("@stellar/stellar-sdk");
}

/**
 * Mint NOCTIS tokens to a wallet via the SAC mint() function.
 * Requires the admin secret key (FAUCET_ADMIN_SECRET env var).
 */
async function mintTokens(wallet: string): Promise<string> {
  const sdk = await getStellarSdk();
  const { rpc, Contract, Keypair, nativeToScVal, TransactionBuilder, Networks, Account } = sdk;
  const { xdr } = sdk;

  if (!ADMIN_SECRET) {
    throw new Error("FAUCET_ADMIN_SECRET not configured");
  }

  // 1. Load admin keypair
  const adminKeypair = Keypair.fromSecret(ADMIN_SECRET);
  const adminPubkey = adminKeypair.publicKey();

  // 2. Connect RPC server
  const server = new rpc.Server(RPC_URL, { allowHttp: false });

  // 3. Get real account sequence number
  const account = await server.getAccount(adminPubkey);

  // 4. Build mint() invocation with real seq number
  const contract = new Contract(NOCTIS_TOKEN);
  const amountScVal = nativeToScVal(BigInt(FAUCET_AMOUNT), { type: "i128" });
  const toScVal = nativeToScVal(wallet, { type: "address" });

  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call("mint", toScVal, amountScVal))
    .setTimeout(30)
    .build();

  // 5. Simulate
  const simResult: any = await server.simulateTransaction(tx);
  if (simResult.error) {
    throw new Error(`Simulate error: ${simResult.error}`);
  }

  // 6. Prepare (assemble with auth)
  const preparedTx = await server.prepareTransaction(tx);

  // 7. Sign
  preparedTx.sign(adminKeypair);

  // 8. Send
  const sendResult = await server.sendTransaction(preparedTx);
  if (sendResult.status === "ERROR") {
    throw new Error(`Mint failed: ${sendResult.errorResult?.result().toString()}`);
  }

  // 9. Poll for completion
  const hash = sendResult.hash;
  let status: string = sendResult.status;
  let attempts = 0;
  while (status === "PENDING") {
    await new Promise((r) => setTimeout(r, 2000));
    const txResult = await server.getTransaction(hash);
    status = txResult.status;
    attempts++;
    if (attempts > 30) throw new Error("Mint timed out after 60s");
  }

  if (status === "FAILED") {
    throw new Error(`Mint FAILED: transaction reverted (hash: ${hash})`);
  }

  return hash;
}

/**
 * Fund a wallet with testnet XLM via Friendbot.
 */
async function fundXlm(wallet: string): Promise<boolean> {
  try {
    const response = await fetch(`${FRIENDBOT_URL}?addr=${wallet}`);
    const json = await response.json();
    return json.checksum !== undefined;
  } catch {
    return false;
  }
}

/**
 * Validate a Stellar public key format (G... 56 chars).
 */
function isValidStellarAddress(addr: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(addr);
}

// ─── POST /api/faucet/claim ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const response: ClaimResponse = { success: false };

  try {
    // 1. Parse body
    const body: ClaimRequest = await req.json();

    if (!body.wallet || !isValidStellarAddress(body.wallet)) {
      return NextResponse.json(
        { ...response, error: "Invalid wallet address. Must be a G-prefixed Stellar address." },
        { status: 400 }
      );
    }

    const wallet = body.wallet;

    // 2. Check if already claimed
    if (claimedWallets.has(wallet)) {
      return NextResponse.json(
        { ...response, error: "Already claimed — each wallet gets one faucet grant." },
        { status: 409 }
      );
    }

    // 3. Global rate limit
    if (claimCount >= MAX_CLAIMS) {
      return NextResponse.json(
        { ...response, error: "Faucet depleted for this session. Try again after server restart." },
        { status: 429 }
      );
    }

    // 4. Check admin key configured
    if (!ADMIN_SECRET) {
      return NextResponse.json(
        { ...response, error: "Faucet not configured (FAUCET_ADMIN_SECRET missing). Contact admin." },
        { status: 500 }
      );
    }

    // 5. Fund XLM first (need XLM for transaction fees)
    const xlmFunded = await fundXlm(wallet);

    // 6. Mint NOCTIS tokens
    const txHash = await mintTokens(wallet);

    // 7. Record claim
    claimedWallets.add(wallet);
    claimCount++;

    return NextResponse.json({
      success: true,
      tx_hash: txHash,
      amount: FAUCET_AMOUNT,
      token: NOCTIS_TOKEN,
      xlm_funded: xlmFunded,
      message: `Successfully claimed ${FAUCET_AMOUNT} NOCTIS + ${xlmFunded ? "10,000 XLM" : "XLM funding skipped (already funded)"}`,
    });

  } catch (err: any) {
    console.error("Faucet error:", err);
    return NextResponse.json(
      { ...response, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET /api/faucet/claim — status check ─────────────────────────
export async function GET() {
  return NextResponse.json({
    available: ADMIN_SECRET !== undefined,
    claims_served: claimCount,
    max_claims: MAX_CLAIMS,
    token: NOCTIS_TOKEN,
    amount: FAUCET_AMOUNT,
    network: "testnet",
  });
}

export const runtime = "nodejs";
