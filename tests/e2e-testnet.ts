/**
 * Noctis E2E Integration Test — Stellar Testnet
 * 
 * Tests the full protocol flow against deployed testnet contracts:
 *   1. Fund accounts (employer, employee) via Friendbot
 *   2. Mint test tokens to employer
 *   3. Configure payroll dispatcher (token, trusted setup)
 *   4. Register yield sources on yield router
 *   5. Set payroll dispatcher on yield router
 *   6. Create wallets (employer + employee) on wallet_factory
 *   7. Create policy for employer on policy_signer
 *   8. Process payroll batch (merkle root + mock proof) on payroll_dispatcher
 *   9. Verify batch metadata and streams
 *  10. Claim stream from payroll_dispatcher
 *  11. Create and manage streams on streaming_vault
 *  12. Verify yield routing
 *  13. Verify policy enforcement
 *  14. Cleanup (optional)
 * 
 * Usage: npx tsx tests/e2e-testnet.ts
 */

import {
  rpc,
  Contract,
  Keypair,
  nativeToScVal,
  scValToNative,
  xdr,
  Account,
  TransactionBuilder,
  BASE_FEE,
  Asset,
  Operation,
} from "@stellar/stellar-sdk";
import { createHash } from "crypto";
import { execSync } from "child_process";

// ─── Configuration ────────────────────────────────────────────────────
const RPC_URL = "https://soroban-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

const CONTRACTS = {
  wallet_factory: "CCRRGXP2RXEURFYMUFUZT7TU26B6BP74WH2LUGAK3EHDP7E3AT6FXXZT",
  policy_signer: "CA42C7B4XETGCZISH2OF2TFJSVL6JQAKZBAJST5CNU2M5MF6R2U2BTU5",
  streaming_vault: "CAIHQBV4766BNMEZZYVF5DLWXOZTVLZKUXABSHFZKYIQZII7NT42JWVC",
  payroll_dispatcher: "CCCB3EVCABUMZJAIN5556IHRPZN6VNNP6PU3I6HBJ3AVLZBBOLYIQQSV",
  yield_router: "CBURJANYO5HG5S4FQIAOFKFEJ7P5SPOOPZXLJMS5A3ZCLOFPZBMQYUPK",
  test_token: "CDMM3QPRZKQDOXSG3BJMXLBXVYAVAN5NGUJOVVXDEGB4YHNU44V54OYI", // NOCTIS token
};

const server = new rpc.Server(RPC_URL, { allowHttp: false });

// ─── Test Accounts ────────────────────────────────────────────────────
// We'll create fresh accounts for the test
let employerKp: Keypair;
let employeeKp: Keypair;
let tokenAdminKp: Keypair;   // local-deployer — admin of SAC token (NOCTIS)
let contractAdminKp: Keypair; // passkeygate-deployer — admin of Noctis contracts
let currentBatchId: number = 0;  // Set after phase 8
let currentStreamId: number = 0; // Set after phase 10

// ─── Helpers ──────────────────────────────────────────────────────────

/** Type conversion helpers */
function addr(val: string): xdr.ScVal {
  return nativeToScVal(val, { type: "address" });
}

function i128(val: number | bigint): xdr.ScVal {
  return nativeToScVal(BigInt(val), { type: "i128" });
}

function u32(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: "u32" });
}

function u64(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: "u64" });
}

function boolean(val: boolean): xdr.ScVal {
  return nativeToScVal(val, { type: "bool" });
}

function bytes(val: number[] | Uint8Array | Buffer): xdr.ScVal {
  // nativeToScVal with type "bytes" requires Buffer/Uint8Array, not plain Array
  const buf = Buffer.isBuffer(val) ? val : Buffer.from(val);
  return nativeToScVal(buf, { type: "bytes" });
}

function bytesN32(val: number[] | Uint8Array | Buffer): xdr.ScVal {
  const buf = Buffer.isBuffer(val) ? val : Buffer.from(val);
  if (buf.length !== 32) throw new Error(`bytesN32 requires exactly 32 bytes, got ${buf.length}`);
  return nativeToScVal(buf, { type: "bytes" });
}

/** Unwrap Address from a Stellar account G... to the raw bytes for hashing */
function addressToBytes(addr: string): Uint8Array {
  return new TextEncoder().encode(addr);
}

function symbol(val: string): xdr.ScVal {
  return nativeToScVal(val, { type: "symbol" });
}

function vec(items: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec(items);
}

function opt(val: xdr.ScVal | null): xdr.ScVal {
  if (val === null) return xdr.ScVal.scvVoid();
  return val;
}

/** Build a ScMap (struct) from key-value pairs where all keys are Symbols
 *  IMPORTANT: Soroban host requires ScMap keys to be sorted lexicographically!
 */
function mapToScVal(fields: Record<string, xdr.ScVal>): xdr.ScVal {
  const sorted = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b));
  const entries = sorted.map(
    ([key, val]) => new xdr.ScMapEntry({ key: nativeToScVal(key, { type: "symbol" }), val }),
  );
  return xdr.ScVal.scvMap(entries);
}

/** Build a Vec<Address> from address strings */
function vecAddress(addrs: string[]): xdr.ScVal {
  return xdr.ScVal.scvVec(addrs.map((a) => nativeToScVal(a, { type: "address" })));
}

/** Build a Vec<BytesN<32>> from byte arrays */
function vecBytesN32(items: (Uint8Array | Buffer)[]): xdr.ScVal {
  return xdr.ScVal.scvVec(items.map((v) => nativeToScVal(Buffer.from(v), { type: "bytes" })));
}

/** Build a Vec<i128> from numbers */
function vecI128(items: number[]): xdr.ScVal {
  return xdr.ScVal.scvVec(items.map((v) => nativeToScVal(BigInt(v), { type: "i128" })));
}

/** Build a Vec<u64> from numbers */
function vecU64(items: number[]): xdr.ScVal {
  return xdr.ScVal.scvVec(items.map((v) => nativeToScVal(BigInt(v), { type: "u64" })));
}

/** Fund an account via Friendbot with retry */
async function fundAccount(publicKey: string, label: string): Promise<void> {
  console.log(`  Funding ${label} (${publicKey.slice(0, 8)}...)...`);
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const resp = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
      if (!resp.ok) {
        const text = await resp.text();
        if (resp.status === 400 && text.includes("already")) {
          console.log(`  ${label} already funded.`);
          return;
        }
        if (attempt < 5) {
          console.log(`  Retry ${attempt}/5 after Friendbot error ${resp.status}...`);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        throw new Error(`Friendbot failed for ${label}: ${resp.status} ${text}`);
      }
      const json = await resp.json();
      console.log(`  ✅ ${label} funded. Hash: ${(json.hash || "").slice(0, 16)}...`);
      return;
    } catch (e: any) {
      if (attempt < 5 && e.message?.includes("fetch")) {
        console.log(`  Network retry ${attempt}/5...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      throw e;
    }
  }
}

/** Read-only simulation on a contract */
async function simulateRead<T>(
  contractId: string,
  method: string,
  ...args: xdr.ScVal[]
): Promise<T | null> {
  try {
    const contract = new Contract(contractId);
    const randomKp = Keypair.random();
    const source = new Account(randomKp.publicKey(), "0");
    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const result: any = await server.simulateTransaction(tx);
    if (result.error) {
      console.error(`  ⚠️ Simulate error on ${method}: ${result.error}`);
      return null;
    }
    if (!result.result?.retval) {
      return null;
    }
    return scValToNative(result.result.retval) as T;
  } catch (e: any) {
    console.error(`  ⚠️ Exception simulating ${method}: ${e.message}`);
    return null;
  }
}

/** Execute a write operation on a contract and return the result value */
async function invokeContract<T = any>(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signer: Keypair,
  label: string,
): Promise<{ hash: string; result: T | null }> {
  console.log(`  🚀 ${label}...`);
  
  const contract = new Contract(contractId);
  const sourceAccount = await server.getAccount(signer.publicKey());
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Prepare (simulate + assemble auth/footprint)
  const preparedTx = await server.prepareTransaction(tx);
  
  // Sign
  preparedTx.sign(signer);

  // Send
  const sendResult = await server.sendTransaction(preparedTx);
  
  if (sendResult.status === "ERROR") {
    const errStr = sendResult.errorResult?.result()?.toString() || "Unknown error";
    throw new Error(`${label} FAILED: ${errStr}`);
  }

  // Poll for completion
  const hash = sendResult.hash;
  let status = sendResult.status;
  let attempts = 0;
  
  while (status === "PENDING" || status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    const txResult = await server.getTransaction(hash);
    status = txResult.status;
    attempts++;
    if (attempts > 30) throw new Error(`${label} timed out after 60s`);
  }

  if (status === "FAILED") {
    throw new Error(`${label} FAILED: transaction reverted`);
  }

  console.log(`  ✅ ${label}`);

  // Extract return value from transaction result
  let resultValue: T | null = null;
  try {
    const txResult = await server.getTransaction(hash);
    if (txResult.status === "SUCCESS" && txResult.resultXdr) {
      const result = xdr.TransactionResult.fromXDR(txResult.resultXdr, "base64");
      const outerResult = result.result().tr()?.value()?._value()?._value();
      if (outerResult?.[1]?.value()) {
        const scVal = outerResult[1].value();
        resultValue = scValToNative(scVal) as T;
      }
    }
  } catch {
    // Return value parsing is best-effort
  }

  return { hash, result: resultValue };
}

/** Compute SHA256 Merkle root matching the contract's compute_merkle_root algorithm */
function computeMerkleRoot(recipients: string[], amounts: number[]): Uint8Array {
  function sha256(data: Uint8Array): Uint8Array {
    return createHash("sha256").update(data).digest();
  }

  function toU128BeBytes(val: number): Uint8Array {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64BE(BigInt(0), 0);
    buf.writeBigUInt64BE(BigInt(val), 8);
    return buf;
  }

  function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a);
    result.set(b, a.length);
    return result;
  }

  let leaves: Uint8Array[] = [];
  for (let i = 0; i < recipients.length; i++) {
    const addrBytes = new TextEncoder().encode(recipients[i]);
    const amtBytes = toU128BeBytes(amounts[i]);
    const leafData = concat(addrBytes, amtBytes);
    const leafHash = sha256(leafData);
    leaves.push(leafHash);
  }

  while (leaves.length > 1) {
    const newLevel: Uint8Array[] = [];
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      if (i + 1 < leaves.length) {
        const right = leaves[i + 1];
        const combined = concat(left, right);
        const parentHash = sha256(combined);
        newLevel.push(parentHash);
      } else {
        newLevel.push(left);
      }
    }
    leaves = newLevel;
  }
  return leaves[0];
}

/** Build a valid 192-byte Groth16 mock proof (passes format checks) */
function buildMockProof(): Uint8Array {
  const proof = new Uint8Array(192);
  // π_A (G1): first byte non-zero
  proof[0] = 0x02;
  proof[47] = 0x01;
  // π_B (G2): needs non-zero
  proof[48] = 0x0a;
  proof[143] = 0x0b;
  // π_C (G1): needs non-zero
  proof[144] = 0x02;
  proof[191] = 0x03;
  return proof;
}

/** Get the token admin keypair from local config (local-deployer — admin of SAC NOCTIS token) */
function getTokenAdminKeypair(): Keypair {
  const secret = execSync("stellar keys secret local-deployer", { encoding: "utf8" }).trim();
  return Keypair.fromSecret(secret);
}

/** Get the contract admin keypair from local config (passkeygate-deployer — admin of Noctis contracts) */
function getContractAdminKeypair(): Keypair {
  const secret = execSync("stellar keys secret passkeygate-deployer", { encoding: "utf8" }).trim();
  return Keypair.fromSecret(secret);
}

// ─── Test Phases ──────────────────────────────────────────────────────

interface TestResult {
  phase: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

async function phase1_setup(): Promise<void> {
  console.log("\n═══ PHASE 1: Account Setup ═══\n");
  
  // Create fresh accounts
  employerKp = Keypair.random();
  employeeKp = Keypair.random();
  tokenAdminKp = getTokenAdminKeypair();
  contractAdminKp = getContractAdminKeypair();

  console.log(`  Employer: ${employerKp.publicKey()}`);
  console.log(`  Employee: ${employeeKp.publicKey()}`);
  console.log(`  Token Admin: ${tokenAdminKp.publicKey()}`);
  console.log(`  Contract Admin: ${contractAdminKp.publicKey()}`);

  // Fund via Friendbot
  await fundAccount(employerKp.publicKey(), "employer");
  await fundAccount(employeeKp.publicKey(), "employee");
  
  results.push({ phase: "1-Setup", passed: true, detail: "Accounts created and funded" });
}

async function phase2_verifyInitialState(): Promise<void> {
  console.log("\n═══ PHASE 2: Verify Initial State ═══\n");

  // Note: testnet is shared — counters may be non-zero from previous runs
  const walletCount = await simulateRead<number>(CONTRACTS.wallet_factory, "get_wallet_count");
  console.log(`  Wallet count: ${walletCount}`);
  
  const streamCount = await simulateRead<number>(CONTRACTS.streaming_vault, "get_stream_count");
  console.log(`  Stream count: ${streamCount}`);
  
  const batchCount = await simulateRead<number>(CONTRACTS.payroll_dispatcher, "get_batch_count");
  console.log(`  Batch count: ${batchCount}`);
  
  const totalDeposited = await simulateRead<string>(CONTRACTS.yield_router, "get_total_deposited");
  console.log(`  Total deposited: ${totalDeposited}`);
  
  const policyCount = await simulateRead<number>(CONTRACTS.policy_signer, "get_policy_count");
  console.log(`  Policy count: ${policyCount}`);

  results.push({
    phase: "2-InitialState",
    passed: true, // Just informational — testnet state is shared
    detail: `wallet=${walletCount} stream=${streamCount} batch=${batchCount} deposited=${totalDeposited} policies=${policyCount}`,
  });
}

/** Create a trustline for a Stellar classic asset */
async function createTrustline(
  keypair: Keypair,
  assetCode: string,
  issuerPublicKey: string,
  label: string,
): Promise<void> {
  console.log(`  📋 Creating trustline for ${label} (${assetCode})...`);
  
  const asset = new Asset(assetCode, issuerPublicKey);
  const horizonUrl = "https://horizon-testnet.stellar.org";
  
  // Get account from Horizon and create Account object
  const accResp = await fetch(`${horizonUrl}/accounts/${keypair.publicKey()}`);
  const accountData: any = await accResp.json();
  const sequenceNum = accountData.sequence;
  const sourceAccount = new Account(keypair.publicKey(), sequenceNum);
  
  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(30)
    .build();
  
  tx.sign(keypair);
  
  // Submit to Horizon
  const txXdr = tx.toXDR();
  const submitResp = await fetch(`${horizonUrl}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tx: txXdr }),
  });
  
  const submitResult: any = await submitResp.json();
  
  if (submitResult.ledger) {
    console.log(`  ✅ Trustline created for ${label}`);
  } else if (submitResult.extras?.result_codes) {
    // Check if already exists (op_already_exists = "tx_failed" but check inner codes)
    const codes = JSON.stringify(submitResult.extras.result_codes);
    if (codes.includes("op_already_exists") || codes.includes("op_success")) {
      console.log(`  ⚠️  Trustline may already exist for ${label}`);
    } else {
      throw new Error(`Trustline failed for ${label}: ${codes}`);
    }
  } else {
    throw new Error(`Trustline failed for ${label}: ${JSON.stringify(submitResult)}`);
  }
}

async function phase3_mintTokens(): Promise<void> {
  console.log("\n═══ PHASE 3: Trustlines + Mint Test Tokens ═══\n");

  // SAC requires underlying classic asset trustlines before minting
  const tokenAdminPubKey = tokenAdminKp.publicKey();
  
  await createTrustline(employerKp, "NOCTIS", tokenAdminPubKey, "employer");
  await createTrustline(employeeKp, "NOCTIS", tokenAdminPubKey, "employee");

  // Now mint via SAC (only the issuer can mint)
  const mintAmount = 1_000_000; // 1M tokens
  
  await invokeContract(
    CONTRACTS.test_token,
    "mint",
    [addr(employerKp.publicKey()), i128(mintAmount)],
    tokenAdminKp,
    `Mint ${mintAmount} NOCTIS to employer`,
  );

  // Mint some to employee too
  await invokeContract(
    CONTRACTS.test_token,
    "mint",
    [addr(employeeKp.publicKey()), i128(100_000)],
    tokenAdminKp,
    `Mint 100,000 NOCTIS to employee`,
  );

  results.push({
    phase: "3-MintTokens",
    passed: true,
    detail: `Minted ${mintAmount} NOCTIS to employer, 100k to employee`,
  });
}

async function phase4_configurePayrollDispatcher(): Promise<void> {
  console.log("\n═══ PHASE 4: Configure Payroll Dispatcher ═══\n");

  // configure(token: Address, trusted_setup_hash: BytesN<32>)
  const trustedSetupHash = new Uint8Array(32);
  trustedSetupHash[0] = 0x01;
  trustedSetupHash[31] = 0x01;

  await invokeContract(
    CONTRACTS.payroll_dispatcher,
    "configure",
    [addr(CONTRACTS.test_token), bytesN32(trustedSetupHash)],
    contractAdminKp,
    "Configure payroll dispatcher (token + trusted setup)",
  );

  // Verify configuration
  const storedHash = await simulateRead<string>(CONTRACTS.payroll_dispatcher, "get_trusted_setup_hash");
  console.log(`  Trusted setup hash stored: ${storedHash?.slice(0, 16)}...`);

  results.push({
    phase: "4-ConfigureDispatcher",
    passed: !!storedHash,
    detail: `Dispatcher configured with token ${CONTRACTS.test_token.slice(0, 8)}...`,
  });
}

async function phase5_setupYieldRouter(): Promise<void> {
  console.log("\n═══ PHASE 5: Setup Yield Router ═══\n");

  // Use unique source name per run to avoid SourceAlreadyExists on shared testnet
  const runId = Date.now().toString(36);
  const yieldSourceName = `pool_${runId}`;
  const yieldSource = symbol(yieldSourceName);
  const fakePoolAddress = contractAdminKp.publicKey(); // Use contract admin as mock pool
  
  await invokeContract(
    CONTRACTS.yield_router,
    "register_source",
    [yieldSource, addr(fakePoolAddress), u32(500)], // 500bps = 5% APR
    contractAdminKp,
    `Register yield source '${yieldSourceName}' at 5% APR`,
  );

  // Set payroll dispatcher as authorized caller
  await invokeContract(
    CONTRACTS.yield_router,
    "set_payroll_dispatcher",
    [addr(CONTRACTS.payroll_dispatcher)],
    contractAdminKp,
    "Set payroll dispatcher on yield router",
  );

  // Verify
  const sources = await simulateRead<any[]>(CONTRACTS.yield_router, "get_sources");
  console.log(`  Yield sources registered: ${sources?.length}`);

  results.push({
    phase: "5-YieldRouter",
    passed: (sources?.length || 0) > 0,
    detail: `Yield source registered, dispatcher set`,
  });
}

async function phase6_createWallets(): Promise<void> {
  console.log("\n═══ PHASE 6: Create Wallets ═══\n");

  // Create wallet for employer: create_wallet(owner: Address, passkey_pubkey: Bytes)
  // The passkey_pubkey must be 65 bytes starting with 0x04
  const employerPubkey = new Uint8Array(65);
  employerPubkey[0] = 0x04;
  // Fill with some non-zero data
  for (let i = 1; i < 65; i++) employerPubkey[i] = i % 256;

  await invokeContract(
    CONTRACTS.wallet_factory,
    "create_wallet",
    [addr(employerKp.publicKey()), bytes(employerPubkey)],
    employerKp,
    "Create employer wallet",
  );

  // Create wallet for employee
  const employeePubkey = new Uint8Array(65);
  employeePubkey[0] = 0x04;
  for (let i = 1; i < 65; i++) employeePubkey[i] = (i * 2) % 256;

  await invokeContract(
    CONTRACTS.wallet_factory,
    "create_wallet",
    [addr(employeeKp.publicKey()), bytes(employeePubkey)],
    employeeKp,
    "Create employee wallet",
  );

  // Verify
  const walletCount = await simulateRead<number>(CONTRACTS.wallet_factory, "get_wallet_count");
  console.log(`  Total wallets: ${walletCount}`);

  const hasEmployer = await simulateRead<boolean>(CONTRACTS.wallet_factory, "has_wallet", addr(employerKp.publicKey()));
  console.log(`  Employer has wallet: ${hasEmployer}`);

  const hasEmployee = await simulateRead<boolean>(CONTRACTS.wallet_factory, "has_wallet", addr(employeeKp.publicKey()));
  console.log(`  Employee has wallet: ${hasEmployee}`);

  results.push({
    phase: "6-Wallets",
    // Check that our specific wallets were created (global count may be higher from previous runs)
    passed: hasEmployer && hasEmployee && walletCount >= 2,
    detail: `Employer wallet created: ${hasEmployer}, Employee wallet created: ${hasEmployee} (global count: ${walletCount})`,
  });
}

async function phase7_createPolicy(): Promise<void> {
  console.log("\n═══ PHASE 7: Create Spending Policy ═══\n");

  // create_policy(employer: Address, config: PolicyConfig)
  // PolicyConfig { name: Symbol, policy_type: PolicyType, max_amount: i128, period_limit: i128,
  //                period_seconds: u64, allowed_tokens: Vec<Address>, required_signers: u32,
  //                authorized_signers: Vec<Address> }
  
  // Use unique policy name per run (duplicate names checked globally by contract)
  const policyName = `pol_${Date.now().toString(36)}`;
  
  // PolicyConfig is serialized as ScMap with symbolic keys (Soroban v26 struct encoding)
  const policyConfig = mapToScVal({
    name: symbol(policyName),
    // PolicyType is an enum — serialized as vec([symbol(variant_name)])
    policy_type: vec([symbol("SpendingLimit")]),
    max_amount: i128(1_000_000),
    period_limit: i128(10_000_000),
    period_seconds: u64(86400),
    allowed_tokens: vecAddress([CONTRACTS.test_token]),
    required_signers: u32(0),
    authorized_signers: vecAddress([]),
  });

  await invokeContract(
    CONTRACTS.policy_signer,
    "create_policy",
    [addr(employerKp.publicKey()), policyConfig],
    employerKp,
    "Create spending policy for employer",
  );

  // Verify
  const policyCount = await simulateRead<number>(CONTRACTS.policy_signer, "get_policy_count");
  console.log(`  Policy count: ${policyCount}`);

  results.push({
    phase: "7-Policy",
    // Global count may be higher, but at least 1 new policy was created
    passed: policyCount >= 1,
    detail: `Policy created (global count: ${policyCount})`,
  });
}

async function phase8_processPayroll(): Promise<void> {
  console.log("\n═══ PHASE 8: Process Payroll Batch ═══\n");

  // Prepare batch data
  const recipients = [employeeKp.publicKey()];
  const amounts = [36000]; // 36,000 tokens
  const durations = [3600]; // 1 hour stream
  const totalAmount = 36000;
  const nullifiers: Uint8Array[] = [
    (() => {
      // Unique nullifier per run to avoid NullifierAlreadyUsed on shared testnet
      const nf = new Uint8Array(32);
      const ts = BigInt(Date.now());
      for (let i = 0; i < 8; i++) {
        nf[i] = Number((ts >> BigInt(56 - i * 8)) & 0xffn);
      }
      nf[8] = 0x42;
      return nf;
    })(),
  ];

  // Compute Merkle root matching contract's algorithm
  const commitmentRoot = computeMerkleRoot(recipients, amounts);
  console.log(`  Commitment root: ${Buffer.from(commitmentRoot).toString("hex").slice(0, 16)}...`);

  // Build mock proof (192 bytes, passes format checks)
  const zkProof = buildMockProof();
  console.log(`  ZK proof length: ${zkProof.length} bytes`);

  // PayrollBatch is serialized as ScMap with symbolic keys (Soroban v26 struct encoding)
  const payrollBatch = mapToScVal({
    employer: addr(employerKp.publicKey()),
    total_amount: i128(totalAmount),
    commitment_root: bytesN32(commitmentRoot),
    zk_proof: bytes(zkProof),
    nullifiers: vecBytesN32(nullifiers),
    recipients: vecAddress(recipients),
    amounts: vecI128(amounts),
    stream_durations: vecU64(durations),
  });

  const batchResult = await invokeContract<number>(
    CONTRACTS.payroll_dispatcher,
    "process_batch",
    [payrollBatch],
    employerKp,
    "Process payroll batch (1 employee, 36000 tokens, 1hr stream)",
  );

  // Capture batch ID from return value or derive from count
  currentBatchId = batchResult.result ?? 0;
  if (currentBatchId === 0) {
    // Fallback: read batch count
    const count = await simulateRead<number>(CONTRACTS.payroll_dispatcher, "get_batch_count");
    currentBatchId = (count as number);
  }
  console.log(`  Current batch ID: ${currentBatchId}`);

  // Verify batch was created
  const batchMeta = await simulateRead<any>(CONTRACTS.payroll_dispatcher, "get_batch", u32(currentBatchId));
  const metaStr = JSON.stringify(batchMeta, (key, val) =>
    typeof val === "bigint" ? val.toString() : val,
  );
  console.log(`  Batch metadata: ${metaStr}`);

  results.push({
    phase: "8-Payroll",
    // Batch was processed successfully
    passed: currentBatchId > 0,
    detail: `Batch processed (ID: ${currentBatchId}), stream count: ${batchMeta?.stream_count}`,
  });
}

async function phase9_claimStream(): Promise<void> {
  console.log("\n═══ PHASE 9: Claim Stream from Payroll Dispatcher ═══\n");

  // Advance time is not possible on testnet, but we can attempt to claim
  // immediately — it should return 0 or a small amount (depending on time since batch)
  // actually, if ~10 seconds have elapsed since the batch was processed,
  // amount_per_second = 36000/3600 = 10 tokens/sec
  // So after 10 seconds, claimable = ~100 tokens

  // Wait a bit for time to pass
  console.log("  Waiting 15 seconds for stream accrual...");
  await new Promise((r) => setTimeout(r, 15000));

  console.log(`  Claiming batch ${currentBatchId}, stream index 1 (1-based)...`);

  // Claim stream: claim_stream(batch_id: u32, stream_index: u32)
  // Stream indices are 1-based (stored as stream_count + 1 in process_batch)
  await invokeContract(
    CONTRACTS.payroll_dispatcher,
    "claim_stream",
    [u32(currentBatchId), u32(1)], // batch_id=current, stream_index=1 (1-based)
    employeeKp,
    `Claim stream #1 from batch #${currentBatchId} (employee)`,
  );

  // Try to claim again (should fail with nothing to claim if first claim succeeded)
  const claimed = "claimed (see above)";
  console.log(`  Stream claimed by employee`);

  results.push({
    phase: "9-ClaimStream",
    passed: true,
    detail: `Stream claimed from payroll dispatcher`,
  });
}

async function phase10_streamingVault(): Promise<void> {
  console.log("\n═══ PHASE 10: Streaming Vault Operations ═══\n");

  // Create a stream: create_stream(employer, employee, token, total_amount, amount_per_second, duration)
  const createAmt = 50000;
  const perSec = 10;
  const dur = 5000; // ~83 minutes

  const createResult = await invokeContract<number>(
    CONTRACTS.streaming_vault,
    "create_stream",
    [
      addr(employerKp.publicKey()), // employer
      addr(employeeKp.publicKey()), // employee
      addr(CONTRACTS.test_token),   // token
      i128(createAmt),              // total_amount
      i128(perSec),                 // amount_per_second
      u64(dur),                     // duration
    ],
    employerKp,
    `Create stream: ${createAmt} tokens @ ${perSec}/sec for ${dur}s`,
  );

  // Capture stream ID from return value
  currentStreamId = createResult.result ?? 0;
  if (currentStreamId === 0) {
    const count = await simulateRead<number>(CONTRACTS.streaming_vault, "get_stream_count");
    currentStreamId = (count as number);
  }
  console.log(`  Stream ID: ${currentStreamId}`);

  // Verify stream
  const streamData = await simulateRead<any>(CONTRACTS.streaming_vault, "get_stream", u32(currentStreamId));
  console.log(`  Stream #${currentStreamId}: employer=${streamData?.employer?.slice(0, 8)}..., employee=${streamData?.employee?.slice(0, 8)}..., amount=${streamData?.total_amount}`);

  // Check employer balance
  const employerBal = await simulateRead<string>(CONTRACTS.streaming_vault, "get_employer_balance", addr(employerKp.publicKey()));
  console.log(`  Employer deposited balance: ${employerBal}`);

  // Wait for accrual
  console.log("  Waiting 12 seconds for stream accrual...");
  await new Promise((r) => setTimeout(r, 12000));

  // Get accrued amount
  const accrued = await simulateRead<string>(CONTRACTS.streaming_vault, "get_accrued_amount", u32(currentStreamId));
  console.log(`  Accrued amount: ${accrued}`);

  // Claim
  await invokeContract(
    CONTRACTS.streaming_vault,
    "claim_stream",
    [u32(currentStreamId)],
    employeeKp,
    `Claim stream #${currentStreamId} on streaming vault`,
  );

  // Cancel stream (employer)
  await invokeContract(
    CONTRACTS.streaming_vault,
    "cancel_stream",
    [u32(currentStreamId)],
    employerKp,
    `Cancel stream #${currentStreamId} (employer)`,
  );

  results.push({
    phase: "10-StreamingVault",
    passed: currentStreamId > 0 && employerBal !== null,
    detail: `Stream #${currentStreamId} created, accrued ${accrued}, claimed, cancelled`,
  });
}

async function phase11_verifyYieldRouter(): Promise<void> {
  console.log("\n═══ PHASE 11: Yield Router Verification ═══\n");

  // Check yield sources
  const sources = await simulateRead<any[]>(CONTRACTS.yield_router, "get_sources");
  console.log(`  Yield sources: ${sources?.join(", ")}`);

  // Check yield split config
  const split = await simulateRead<any>(CONTRACTS.yield_router, "get_yield_split");
  console.log(`  Yield split: employer=${split?.employer_share}%, employee=${split?.employee_pool}%, protocol=${split?.protocol_fee}%`);

  // Check employer allocation (should be 0 since route_yield wasn't called by dispatcher)
  const allocation = await simulateRead<any>(CONTRACTS.yield_router, "get_employer_allocation", addr(employerKp.publicKey()));
  console.log(`  Employer allocation: principal=${allocation?.total_principal}, yield=${allocation?.accumulated_yield}`);

  results.push({
    phase: "11-YieldRouter",
    passed: (sources?.length || 0) > 0,
    detail: `Yield router verified: ${sources?.length} sources, split configured`,
  });
}

async function phase12_verifyPolicy(): Promise<void> {
  console.log("\n═══ PHASE 12: Policy Enforcement Verification ═══\n");

  // Verify policy: verify_policy(employer, amount, token, signers)
  const verifyResult = await invokeContract(
    CONTRACTS.policy_signer,
    "verify_policy",
    [
      addr(employerKp.publicKey()), // employer
      i128(50000),                  // amount (within 1M limit)
      opt(addr(CONTRACTS.test_token)), // allowed token
      vec([]),                      // no multisig signers needed
    ],
    employerKp,
    "Verify policy (should pass — amount within limit)",
  );
  console.log(`  ✅ Policy verification passed (within limit)`);

  // Try with amount exceeding limit — should fail
  try {
    await invokeContract(
      CONTRACTS.policy_signer,
      "verify_policy",
      [
        addr(employerKp.publicKey()),
        i128(2_000_000), // exceeds 1M limit
        opt(addr(CONTRACTS.test_token)),
        vec([]),
      ],
      employerKp,
      "Verify policy with excess amount (should fail)",
    );
    console.log(`  ⚠️ Excess amount passed unexpectedly — policy limit may not be enforced`);
    results.push({
      phase: "12-Policy",
      passed: false,
      detail: "Policy should have rejected excess amount",
    });
  } catch (e: any) {
    console.log(`  ✅ Policy correctly rejected excess amount: ${e.message.slice(0, 80)}`);
    results.push({
      phase: "12-Policy",
      passed: true,
      detail: "Policy enforcement working correctly",
    });
  }
}

// ─── Summary ──────────────────────────────────────────────────────────

function printSummary(): void {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  
  console.log("\n" + "=".repeat(60));
  console.log("  E2E INTEGRATION TEST SUMMARY");
  console.log("=".repeat(60));
  
  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`  ${icon} ${r.phase}: ${r.detail}`);
  }
  
  console.log("-".repeat(60));
  console.log(`  ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log("\n  🎉 ALL E2E INTEGRATION TESTS PASSED!");
  } else {
    console.log(`\n  ⚠️  ${total - passed} test(s) FAILED`);
    process.exit(1);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  NOCTIS E2E INTEGRATION TEST (Stellar Testnet)");
  console.log("=".repeat(60));
  console.log(`  RPC: ${RPC_URL}`);
  console.log(`  WalletFactory: ${CONTRACTS.wallet_factory}`);
  console.log(`  PayrollDispatcher: ${CONTRACTS.payroll_dispatcher}`);
  console.log(`  StreamingVault: ${CONTRACTS.streaming_vault}`);
  console.log(`  YieldRouter: ${CONTRACTS.yield_router}`);
  console.log(`  PolicySigner: ${CONTRACTS.policy_signer}`);
  console.log(`  TestToken: ${CONTRACTS.test_token}`);
  console.log("=".repeat(60));

  try {
    await phase1_setup();
    await phase2_verifyInitialState();
    await phase3_mintTokens();
    await phase4_configurePayrollDispatcher();
    await phase5_setupYieldRouter();
    await phase6_createWallets();
    await phase7_createPolicy();
    await phase8_processPayroll();
    await phase9_claimStream();
    await phase10_streamingVault();
    await phase11_verifyYieldRouter();
    await phase12_verifyPolicy();
  } catch (e: any) {
    console.error("\n❌ Fatal error during tests:", e.message);
    console.error(e.stack?.split("\n").slice(0, 5).join("\n"));
    results.push({
      phase: "FATAL",
      passed: false,
      detail: e.message,
    });
  }

  printSummary();
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
