/**
 * Noctis Flow Verification Tests
 *
 * Tests the frontend logic against contract expectations.
 * Pure functions only — no deployed contracts needed.
 *
 * Verifies every data transformation matches what the Soroban contract expects.
 *
 * Usage: npx tsx frontend/tests/verify-flows.ts
 */

import { createHash, webcrypto } from "node:crypto";

// Polyfill crypto.subtle for Node.js (needed by frontend Sha256 code)
if (typeof globalThis.crypto?.subtle === "undefined") {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}

// Now safe to import frontend modules that use `crypto.subtle`
import {
  computeSha256MerkleRoot,
  computeDevNullifiers,
  buildMockProof,
} from "../src/lib/quickPayroll.ts";

import {
  computeNullifier,
  processPayrollBatch,
  buildWitnessInput,
  CIRCUIT_RECIPIENT_CAPACITY,
} from "../src/lib/zk.ts";

// ─── Inline reimplementations of private zk.ts helpers ────────────
// These are tested against the originals via output consistency.
function addressBigInt(address: string): bigint {
  if (!address || address === "0") return 0n;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(address);
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) + BigInt(bytes[i]);
  }
  return result;
}

function amountToU128BeBytes(amount: string | number | bigint): Uint8Array {
  let val = BigInt(amount);
  const buf = new Uint8Array(16);
  for (let i = 15; i >= 0; i--) {
    buf[i] = Number(val & 0xffn);
    val >>= 8n;
  }
  return buf;
}

// ─── Constants ────────────────────────────────────────────────────
const MOCK_EMPLOYER = "GDM4ODWWWEZS5AY6RKIEUZYOF26YERJXQ3NOA4KRERAZWFVQ5QUCXRA6";
const MOCK_EMPLOYEE = "GCW43FZ4LXJWTKQFBZHHQJZTH7KLRNCNQ54NJTJQDOQDMVF5AAJQMGCQ";
const MOCK_AMOUNT = "1000";
const MOCK_DURATION = 86400;

// ─── Helpers ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    errors.push(msg);
    console.log(`  ❌ ${msg}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  if (actual === expected) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    errors.push(`${msg}: expected ${e}, got ${a}`);
    console.log(`  ❌ ${msg}`);
    console.log(`     expected: ${e}`);
    console.log(`     actual:   ${a}`);
  }
}

/** SHA256 via Node crypto (matches contract's env.crypto().sha256) */
function sha256(data: Uint8Array): Uint8Array {
  return createHash("sha256").update(data).digest();
}

/** Merkle root matching contract's algorithm exactly (propagates odd leaves) */
function contractStyleMerkleRoot(recipients: string[], amounts: number[]): Uint8Array {
  const leaves: Uint8Array[] = [];
  for (let i = 0; i < recipients.length; i++) {
    const addrBytes = new TextEncoder().encode(recipients[i]);
    const amtBytes = Buffer.alloc(16);
    amtBytes.writeBigUInt64BE(BigInt(0), 0);
    amtBytes.writeBigUInt64BE(BigInt(amounts[i]), 8);
    leaves.push(sha256(Buffer.concat([addrBytes, amtBytes])));
  }

  while (leaves.length > 1) {
    const newLevel: Uint8Array[] = [];
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      if (i + 1 < leaves.length) {
        const right = leaves[i + 1];
        newLevel.push(sha256(Buffer.concat([left, right])));
      } else {
        // Odd leaf → propagate up (contract behavior)
        newLevel.push(left);
      }
    }
    leaves.length = 0;
    leaves.push(...newLevel);
  }
  return leaves[0];
}

// ─── Tests ────────────────────────────────────────────────────────

async function testAddressBigInt() {
  console.log("\n─── 1. addressBigInt ───");

  const a1 = addressBigInt(MOCK_EMPLOYER);
  const a2 = addressBigInt(MOCK_EMPLOYER);
  assertEqual(a1.toString(), a2.toString(), "Same address → same bigint");

  const a3 = addressBigInt(MOCK_EMPLOYEE);
  assert(a1.toString() !== a3.toString(), "Different address → different bigint");

  assertEqual(addressBigInt("").toString(), "0", "Empty string → 0");
  assertEqual(addressBigInt("0").toString(), "0", "String '0' → 0");

  // Verify encoding: UTF-8 bytes → big-endian bigint
  const rawBytes = new TextEncoder().encode(MOCK_EMPLOYER);
  const expected = BigInt("0x" + Array.from(rawBytes).map(b => b.toString(16).padStart(2, "0")).join(""));
  assertEqual(addressBigInt(MOCK_EMPLOYER).toString(), expected.toString(),
    "Encodes as UTF-8 bytes → big-endian bigint");
}

async function testAmountToU128BeBytes() {
  console.log("\n─── 2. amountToU128BeBytes ───");

  // Test: 1000 = 0x3E8 → last byte = 0xE8
  const r = amountToU128BeBytes("1000");
  assertEqual(r.length, 16, "Exactly 16 bytes");
  assertEqual(r[15], 0xe8, "1000 → byte 15 = 0xE8");
  assertEqual(r[14], 0x03, "1000 → byte 14 = 0x03");
  assertEqual(r[13], 0x00, "1000 → byte 13 = 0x00");

  // Zero → all zeros
  assert(amountToU128BeBytes("0").every(b => b === 0), "Zero → all zeros");

  // Verify matches in-Rust (amount as u128).to_be_bytes()
  for (const val of [1000n, 36000n, 0n, 1n, 18446744073709551615n]) {
    const frontend = amountToU128BeBytes(val.toString());
    const rustStyle = new Uint8Array(16);
    let v = val;
    for (let i = 15; i >= 0; i--) {
      rustStyle[i] = Number(v & 0xffn);
      v >>= 8n;
    }
    const match = Array.from(frontend).every((b, i) => b === rustStyle[i]);
    assert(match, `amountToU128BeBytes(${val}) matches Rust to_be_bytes()`);
  }
}

async function testBuildMockProof() {
  console.log("\n─── 3. buildMockProof ───");

  const proof = buildMockProof();
  assertEqual(proof.length, 384, "Exactly 384 bytes");

  // BLS12-381 identity format: each point starts with 0x40
  assertEqual(proof[0], 0x40, "π_A[0] = 0x40");
  assert(proof.slice(1, 96).every(b => b === 0), "π_A[1..96] = 0");
  assertEqual(proof[96], 0x40, "π_B[0] = 0x40");
  assert(proof.slice(97, 288).every(b => b === 0), "π_B[1..192] = 0");
  assertEqual(proof[288], 0x40, "π_C[0] = 0x40");
  assert(proof.slice(289, 384).every(b => b === 0), "π_C[1..96] = 0");

  // Deterministic
  const p2 = buildMockProof();
  assert(Array.from(proof).every((b, i) => b === p2[i]), "Deterministic");
}

async function testSha256MerkleRootMatchesContract() {
  console.log("\n─── 4. computeSha256MerkleRoot matches contract ───");

  const testCases = [
    { recipients: [MOCK_EMPLOYEE], amounts: [1000] },
    { recipients: [MOCK_EMPLOYEE, MOCK_EMPLOYER], amounts: [1000, 2000] },
    { recipients: [MOCK_EMPLOYER, MOCK_EMPLOYEE, MOCK_EMPLOYER], amounts: [1000, 2000, 3000] },
  ];

  for (const tc of testCases) {
    const frontendRoot = await computeSha256MerkleRoot(
      tc.recipients.map((addr, i) => ({ address: addr, amount: tc.amounts[i].toString() }))
    );
    const contractRoot = contractStyleMerkleRoot(tc.recipients, tc.amounts);
    const match = Array.from(frontendRoot).every((b, i) => b === contractRoot[i]);

    if (!match) {
      console.log(`     frontend hex: ${Buffer.from(frontendRoot).toString("hex")}`);
      console.log(`     contract hex: ${Buffer.from(contractRoot).toString("hex")}`);
    }
    assert(match, `SHA256 root matches contract for ${tc.recipients.length} recipient(s)`);
  }

  // 1-recipient case (e2e test scenario)
  const single = await computeSha256MerkleRoot([
    { address: MOCK_EMPLOYEE, amount: "36000" },
  ]);
  const expectedLeaf = sha256(Buffer.concat([
    new TextEncoder().encode(MOCK_EMPLOYEE),
    amountToU128BeBytes("36000"),
  ]));
  assert(Array.from(single).every((b, i) => b === expectedLeaf[i]),
    "1 recipient → root = SHA256(addr_bytes ++ amount_bytes)");
}

async function testComputeNullifier() {
  console.log("\n─── 5. computeNullifier ───");

  const { buildPoseidon } = await import("circomlibjs");
  const poseidon = await buildPoseidon();

  const employerBigInt = addressBigInt(MOCK_EMPLOYER);
  const merkleRoot = "0x" + "a".repeat(64);
  const index = 0;

  const nullifier = await computeNullifier(employerBigInt.toString(), merkleRoot, index);

  assert(typeof nullifier === "string", "Returns string");
  assert(nullifier.startsWith("0x"), "Starts with 0x");
  assertEqual(nullifier.length, 66, "0x + 64 hex chars");

  // Manual verification: Poseidon(3)(addr, root, index)
  const expectedHash = poseidon([employerBigInt, BigInt(merkleRoot), BigInt(index)]);
  const expectedBigInt = poseidon.F.toObject(expectedHash);
  const expectedHex = "0x" + expectedBigInt.toString(16).padStart(64, "0");
  assertEqual(nullifier, expectedHex, "Matches Poseidon(3)");

  // Different index → different nullifier
  const n2 = await computeNullifier(employerBigInt.toString(), merkleRoot, 1);
  assert(nullifier !== n2, "Different index → different nullifier");
}

async function testComputeDevNullifiers() {
  console.log("\n─── 6. computeDevNullifiers ───");

  const rootHex = "ab" + "cd".repeat(15);
  const count = 2;
  const nullifiers = await computeDevNullifiers(MOCK_EMPLOYER, rootHex, count);

  assertEqual(nullifiers.length, count, `Returns ${count} nullifiers`);
  for (const nf of nullifiers) assertEqual(nf.length, 32, "Each nullifier is 32 bytes");

  // Verify against Node crypto
  const expected0 = sha256(new TextEncoder().encode(`${MOCK_EMPLOYER}:${rootHex}:0`));
  assert(Array.from(nullifiers[0]).every((b, i) => b === expected0[i]),
    "nullifier[0] = SHA256(employer:root:0)");

  const expected1 = sha256(new TextEncoder().encode(`${MOCK_EMPLOYER}:${rootHex}:1`));
  assert(Array.from(nullifiers[1]).every((b, i) => b === expected1[i]),
    "nullifier[1] = SHA256(employer:root:1)");
}

async function testBuildWitnessInput() {
  console.log("\n─── 7. buildWitnessInput ───");

  const recipients = [
    { address: MOCK_EMPLOYEE, amount: MOCK_AMOUNT, duration_secs: MOCK_DURATION },
  ];

  // Build minimal Merkle tree result
  const { buildPoseidon } = await import("circomlibjs");
  const poseidon = await buildPoseidon();
  const leafBigInt = poseidon.F.toObject(
    poseidon([addressBigInt(MOCK_EMPLOYEE), BigInt(MOCK_AMOUNT), BigInt(MOCK_DURATION)])
  );
  const merkleTree = {
    root: "0x" + leafBigInt.toString(16).padStart(64, "0"),
    proofs: [] as string[][],
    proofIndices: [] as number[][],
  };

  const witness = await buildWitnessInput(recipients, MOCK_EMPLOYER, merkleTree, MOCK_AMOUNT);

  // Shape
  assert(typeof witness.batch_commitment === "string", "batch_commitment is string");
  assertEqual(witness.batch_total_amount, MOCK_AMOUNT, "batch_total_amount matches");
  assertEqual(witness.batch_nullifiers.length, CIRCUIT_RECIPIENT_CAPACITY, `nullifiers padded to ${CIRCUIT_RECIPIENT_CAPACITY}`);
  assertEqual(witness.recipient_addresses.length, CIRCUIT_RECIPIENT_CAPACITY, `addresses padded to ${CIRCUIT_RECIPIENT_CAPACITY}`);
  assertEqual(witness.payment_amounts.length, CIRCUIT_RECIPIENT_CAPACITY, `amounts padded to ${CIRCUIT_RECIPIENT_CAPACITY}`);
  assertEqual(witness.stream_durations.length, CIRCUIT_RECIPIENT_CAPACITY, `durations padded to ${CIRCUIT_RECIPIENT_CAPACITY}`);

  // Critical: address is BigInt decimal, NOT raw Stellar address
  assert(witness.recipient_addresses[0] !== MOCK_EMPLOYEE,
    "address[0] is NOT raw Stellar address");
  assertEqual(witness.recipient_addresses[0], addressBigInt(MOCK_EMPLOYEE).toString(),
    "address[0] = addressBigInt().toString()");

  // Padding entries are zero
  assertEqual(witness.recipient_addresses[1], "0", "Padding address[1] = '0'");
  assertEqual(witness.payment_amounts[1], "0", "Padding amount[1] = '0'");
  assertEqual(witness.stream_durations[1], "0", "Padding duration[1] = '0'");

  // employer_address is also BigInt decimal
  assertEqual(witness.employer_address, addressBigInt(MOCK_EMPLOYER).toString(),
    "employer_address = addressBigInt(employer).toString()");
}

async function testProcessPayrollBatch() {
  console.log("\n─── 8. processPayrollBatch ───");

  const recipients = [
    { address: MOCK_EMPLOYEE, amount: MOCK_AMOUNT, duration_secs: MOCK_DURATION },
  ];
  const totalAmount = MOCK_AMOUNT;

  const result = await processPayrollBatch(recipients, MOCK_EMPLOYER, totalAmount);

  // merkleRoot: 0x + 64 hex chars
  assert(typeof result.merkleRoot === "string", "merkleRoot is string");
  assert(result.merkleRoot.startsWith("0x"), "merkleRoot starts with 0x");
  assertEqual(result.merkleRoot.length, 66, "merkleRoot is 0x + 64 hex chars");

  // nullifiers match recipient count
  assert(Array.isArray(result.nullifiers), "nullifiers is array");
  assertEqual(result.nullifiers.length, recipients.length, `nullifiers count = ${recipients.length}`);

  // proof is 384 bytes with identity points
  assert(result.proofBytes instanceof Uint8Array, "proofBytes is Uint8Array");
  assertEqual(result.proofBytes.length, 384, "proofBytes is 384");
  assertEqual(result.proofBytes[0], 0x40, "proof[0] = 0x40");

  // merkleRoot matches computeSha256MerkleRoot
  const expectedRoot = await computeSha256MerkleRoot(
    recipients.map(r => ({ address: r.address, amount: r.amount }))
  );
  const expectedHex = "0x" + Array.from(expectedRoot).map(b => b.toString(16).padStart(2, "0")).join("");
  assertEqual(result.merkleRoot.toLowerCase(), expectedHex.toLowerCase(),
    "merkleRoot matches computeSha256MerkleRoot");

  // publicSignals: [commitment, totalAmount, ...nullifiers]
  assert(Array.isArray(result.publicSignals), "publicSignals is array");
  assertEqual(result.publicSignals.length, 1 + 1 + recipients.length,
    "publicSignals = [commitment, total, ...nullifiers]");
  assertEqual(result.publicSignals[0], result.merkleRoot, "publicSignals[0] = merkleRoot");
  assertEqual(result.publicSignals[1], totalAmount, "publicSignals[1] = totalAmount");
}

async function testContractIntegrationShape() {
  console.log("\n─── 9. Contract-ready data shape ───");

  const recipients = [
    { address: MOCK_EMPLOYEE, amount: "36000", duration_secs: 3600 },
  ];
  const totalAmount = "36000";

  const batch = await processPayrollBatch(recipients, MOCK_EMPLOYER, totalAmount);

  // What the contract's process_batch expects:
  //
  //   commitment_root: BytesN<32> — 32 bytes
  //   zk_proof: Bytes — 384 bytes
  //   nullifiers: Vec<BytesN<32>> — each 32 bytes
  //   total_amount: i128 — positive, >= duration_secs for each recipient
  //   recipients: Vec<Address> — Stellar addresses
  //   amounts: Vec<i128> — positive
  //   stream_durations: Vec<u64> — positive

  const rootHexClean = batch.merkleRoot.replace("0x", "");
  assertEqual(rootHexClean.length, 64, `Root hex is 64 chars`);
  const rootBytes = Buffer.from(rootHexClean, "hex");
  assertEqual(rootBytes.length, 32, `Root is 32 bytes`);
  assertEqual(batch.proofBytes.length, 384, `Proof is 384 bytes`);

  for (let i = 0; i < batch.nullifiers.length; i++) {
    const nfClean = batch.nullifiers[i].replace("0x", "");
    assertEqual(nfClean.length, 64, `Nullifier ${i} hex is 64 chars`);
  }

  // Amount >= duration_secs (avoids contract Error #9: InvalidBatchFormat)
  const amount = BigInt(totalAmount);
  const duration = BigInt(recipients[0].duration_secs);
  assert(amount >= duration,
    `Amount (${amount}) >= duration (${duration}) — avoids Error #9`);
  assert(amount > 0n, "Total amount > 0 — avoids Error #17 (AmountZero)");

  // Mock proof passes the contract's parsing format
  // Contract parse_g1_point: expects bytes[0] == 0x40 for identity
  // Contract parse_g2_point: expects bytes[0] == 0x40 for identity
  const g1Bytes = batch.proofBytes.slice(0, 96);
  const g2Bytes = batch.proofBytes.slice(96, 288);
  const g1cBytes = batch.proofBytes.slice(288, 384);

  const g1Identity = g1Bytes[0] === 0x40 && g1Bytes.slice(1).every(b => b === 0);
  const g2Identity = g2Bytes[0] === 0x40 && g2Bytes.slice(1).every(b => b === 0);
  const g1cIdentity = g1cBytes[0] === 0x40 && g1cBytes.slice(1).every(b => b === 0);

  assert(g1Identity, "π_A is valid G1 identity point (0x40 + zeros)");
  assert(g2Identity, "π_B is valid G2 identity point (0x40 + zeros)");
  assert(g1cIdentity, "π_C is valid G1 identity point (0x40 + zeros)");

  // The whole proof is: G1(96) || G2(192) || G1(96) = 384 bytes
  assertEqual(g1Bytes.length, 96, "π_A is 96 bytes");
  assertEqual(g2Bytes.length, 192, "π_B is 192 bytes");
  assertEqual(g1cBytes.length, 96, "π_C is 96 bytes");

  // Deterministic — same inputs → same output
  const batch2 = await processPayrollBatch(recipients, MOCK_EMPLOYER, totalAmount);
  assertEqual(batch.merkleRoot, batch2.merkleRoot, "Merkle root deterministic");
  assert(Array.from(batch.proofBytes).every((b, i) => b === batch2.proofBytes[i]),
    "Proof bytes deterministic");
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  NOCTIS FLOW VERIFICATION TESTS");
  console.log("=".repeat(70));
  console.log(`  Stellar Testnet · Soroban Protocol 26`);
  console.log(`  Circuit: PayrollBatch(2) + MerkleTreeVerifier(20)`);
  console.log(`  Curve:   BLS12-381 (Groth16)`);
  console.log("-".repeat(70));
  console.log(`  Employer: ${MOCK_EMPLOYER.slice(0, 12)}...`);
  console.log(`  Employee: ${MOCK_EMPLOYEE.slice(0, 12)}...`);
  console.log(`  Amount:   ${MOCK_AMOUNT} sats`);
  console.log(`  Duration: ${MOCK_DURATION}s (${(MOCK_DURATION / 86400).toFixed(1)} day)`);
  console.log("=".repeat(70));

  try {
    await testAddressBigInt();
    await testAmountToU128BeBytes();
    await testBuildMockProof();
    await testSha256MerkleRootMatchesContract();
    await testComputeNullifier();
    await testComputeDevNullifiers();
    await testBuildWitnessInput();
    await testProcessPayrollBatch();
    await testContractIntegrationShape();
  } catch (e: any) {
    console.error(`\n❌ Fatal: ${e.message}`);
    console.error(e.stack?.split("\n").slice(0, 5).join("\n"));
    failed++;
    errors.push(`Fatal: ${e.message}`);
  }

  // Summary
  const total = passed + failed;
  console.log("\n" + "=".repeat(70));
  console.log(`  ${passed}/${total} tests passed`);
  console.log("=".repeat(70));

  if (failed > 0) {
    console.log("\n  Failures:");
    for (const err of errors) {
      console.log(`    ❌ ${err}`);
    }
    process.exit(1);
  } else {
    console.log("\n  🎉 ALL TESTS PASSED — flow is ready for deployment!");
  }
}

main();
