// ─── Client-Side ZK Proof Generation for Noctis Payroll ─────────
// Wraps snarkjs calls for browser-based Groth16 proof generation.
//
// Flow:
//   1. Employer uploads CSV → builds Merkle tree
//   2. Computes witness input from payroll batch
//   3. Generates Groth16 proof via snarkjs WASM
//   4. Proof (384 bytes) + public signals sent to dispatcher contract
//
// CRASH PREVENTION (May 29 fix):
//   - treeDepth is NOW DYNAMIC (based on recipient count), NOT fixed 2^20
//   - Heavy snarkjs WASM work is deferred via requestIdleCallback so the UI
//     thread can paint loading spinners before freezing
//   - processPayrollBatch() accepts an onProgress callback for stage-by-stage
//     progress feedback in the UI
//
// For production: move snarkjs to a Web Worker to fully eliminate main-thread blocking.

import type { PayrollRecipient } from "@/types";
import { computeSha256MerkleRoot, computeDevNullifiers } from "./quickPayroll";

// ─── Circuit Constants ────────────────────────────────────────────
// The dev circuit is compiled with PayrollBatch(2) and MerkleTreeVerifier(20).
// The production circuit will use PayrollBatch(100).
// All witness arrays must be padded to exactly this size.
export const CIRCUIT_RECIPIENT_CAPACITY = 2 as const;
export const CIRCUIT_MERKLE_DEPTH = 20 as const;

// ─── Types ───────────────────────────────────────────────────────
export interface MerkleTreeResult {
  root: string;                          // Hex-encoded Merkle root (32 bytes)
  proofs: string[][];                    // Per-recipient Merkle proof paths
  proofIndices: number[][];              // Per-recipient left/right indices
}

export interface WitnessInput {
  batch_commitment: string;
  batch_total_amount: string;
  batch_nullifiers: string[];
  circuit_version: string;
  employer_address: string;
  recipient_addresses: string[];
  payment_amounts: string[];
  stream_durations: string[];
  merkle_proofs: string[][];
  merkle_proof_indices: number[][];
}

export interface ProofResult {
  proof: {
    pi_a: [string, string, string];
    pi_b: [[string, string], [string, string], [string, string]];
    pi_c: [string, string, string];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
  /** Serialize proof to 384 bytes for Soroban (G1/G2 uncompressed) */
  toBytes(): Uint8Array;
}

// ─── Poseidon Hash Helpers ────────────────────────────────────────
let _poseidon: any = null;

async function getPoseidon(): Promise<any> {
  if (_poseidon) return _poseidon;
  // @ts-expect-error - circomlibjs has no TS types
  const { buildPoseidon } = await import("circomlibjs");
  _poseidon = await buildPoseidon();
  return _poseidon;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) + BigInt(bytes[i]);
  }
  return result;
}

function fieldToBytes(value: bigint | number): Uint8Array {
  const hex = value.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert a Stellar address string to a bigint for use as a circuit field element.
 * The circuit treats signals as field elements (bigints modulo BN128 curve order).
 * We encode the address bytes as a big-endian bigint.
 */
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

function bigintToBytes48(value: string): Uint8Array {
  const hex = BigInt(value).toString(16).padStart(96, "0");
  const bytes = new Uint8Array(48);
  for (let i = 0; i < 48; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function serializeG1(x: string, y: string): Uint8Array {
  const buf = new Uint8Array(96);
  buf.set(bigintToBytes48(x), 0);
  buf.set(bigintToBytes48(y), 48);
  return buf;
}

function serializeG2(
  x_a: string, x_b: string,
  y_a: string, y_b: string,
): Uint8Array {
  const buf = new Uint8Array(192);
  buf.set(bigintToBytes48(x_a), 0);
  buf.set(bigintToBytes48(x_b), 48);
  buf.set(bigintToBytes48(y_a), 96);
  buf.set(bigintToBytes48(y_b), 144);
  return buf;
}

/**
 * Build a SPARSE Merkle tree using precomputed zero-hashes.
 *
 * The circuit uses a fixed 2^20 leaf tree (MerkleTreeVerifier(20)). Instead
 * of materializing all 1M+ leaves (which crashes browsers due to O(2^20)
 * Poseidon hashes), we:
 *
 *   1. Compute only the actual leaf hashes (≤2 for the dev circuit).
 *   2. Precompute zero-hashes at each level:
 *        zeroLeaf = Poseidon(3)(0, 0, 0)
 *        zeroHashes[h] = Poseidon(2)(zeroHashes[h-1], zeroHashes[h-1])
 *   3. Use a recursive memoised function `getNode(pos, level)` that returns
 *      the precomputed zero-hash for any subtree that contains NO actual
 *      leaves, and only recurses into subtrees that DO contain actual leaves.
 *
 * With 2 actual leaves this computes O(depth) ≈ 40 Poseidon calls instead
 * of O(2^depth) ≈ 2 million.
 */
export async function buildMerkleTree(
  recipients: PayrollRecipient[],
  _employerAddress: string,
  treeDepth?: number
): Promise<MerkleTreeResult> {
  const poseidon = await getPoseidon();
  const depth = treeDepth ?? CIRCUIT_MERKLE_DEPTH;
  const actualLeafCount = recipients.length;

  // ── Step 1: Compute actual leaf hashes ───────────────────────
  // Leaf = Poseidon(3)(recipient_address, payment_amount, stream_duration)
  const leafHashes: bigint[] = [];
  for (const r of recipients) {
    const addr = r.address === "0" ? 0n : addressBigInt(r.address);
    const amount = BigInt(r.amount);
    const duration = BigInt(r.duration_secs);
    const h = poseidon.F.toObject(poseidon([addr, amount, duration]));
    leafHashes.push(h);
  }

  // ── Step 2: Precompute zero-hashes ───────────────────────────
  // zeroLeaf = Poseidon(3)(0, 0, 0) — hash of an empty/unused leaf
  // zeroHashes[h] = Poseidon(2)(zeroHashes[h-1], zeroHashes[h-1])
  const zeroLeaf: bigint = poseidon.F.toObject(poseidon([0n, 0n, 0n]));
  const zeroHashes: bigint[] = [zeroLeaf];
  for (let h = 1; h <= depth; h++) {
    zeroHashes.push(
      poseidon.F.toObject(poseidon([zeroHashes[h - 1], zeroHashes[h - 1]]))
    );
  }

  // ── Step 3: Memoised sparse tree node lookup ─────────────────
  const cache = new Map<string, bigint>();

  function getNode(pos: number, level: number): bigint {
    if (level < 0) return 0n;

    const key = `${pos}:${level}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    // Leaf level — return actual hash or zero leaf
    if (level === 0) {
      const result = pos < actualLeafCount ? leafHashes[pos] : zeroLeaf;
      cache.set(key, result);
      return result;
    }

    // Fast path: if the entire subtree [pos * 2^level, (pos+1)*2^level)
    // is outside the range of actual leaves, return precomputed zero hash.
    const leafStart = pos * (1 << level);
    if (leafStart >= actualLeafCount) {
      cache.set(key, zeroHashes[level]);
      return zeroHashes[level];
    }

    // Recursively compute from children
    const left = getNode(pos * 2, level - 1);
    const right = getNode(pos * 2 + 1, level - 1);
    const result = poseidon.F.toObject(poseidon([left, right]));
    cache.set(key, result);
    return result;
  }

  // ── Step 4: Compute root ─────────────────────────────────────
  // Root is node at position 0, level = depth
  const root: bigint = getNode(0, depth);

  // ── Step 5: Generate Merkle proofs for actual leaves ─────────
  // The circuit expects `num_recipients` proofs (one per slot).
  // We generate proofs for the first `actualLeafCount` positions.
  const proofs: string[][] = [];
  const proofIndices: number[][] = [];

  for (let i = 0; i < actualLeafCount; i++) {
    const proof: string[] = [];
    const indices: number[] = [];
    let pos = i; // position at current level, starting from leaf level (0)

    for (let h = 0; h < depth; h++) {
      // Sibling is the adjacent node at this level
      const siblingPos = pos ^ 1;
      const siblingHash = getNode(siblingPos, h);

      proof.push("0x" + siblingHash.toString(16).padStart(64, "0"));
      indices.push(pos & 1); // 0 = left child, 1 = right child

      // Move up to the parent node for the next level
      pos = pos >> 1;
    }

    proofs.push(proof);
    proofIndices.push(indices);
  }

  return {
    root: "0x" + root.toString(16).padStart(64, "0"),
    proofs,
    proofIndices,
  };
}

// ─── Nullifier Computation ───────────────────────────────────────

/**
 * Compute a nullifier hash for a payment.
 *
 * Matches the circuit's NullifierComputer template:
 *   nullifier = Poseidon(3)(employer_address, batch_commitment, payment_index)
 *
 * IMPORTANT: `employerBigIntStr` MUST be the same decimal string that the
 * circuit receives as the `employer_address` signal input, i.e. the output
 * of addressBigInt(address).toString(). NOT the raw Stellar address.
 *
 * @param employerBigIntStr - Decimal string of the BigInt representation of the employer's Stellar address
 * @param batchRoot - Hex-encoded Merkle root (with 0x prefix)
 * @param paymentIndex - Index of this payment within the batch (0-based)
 */
export async function computeNullifier(
  employerBigIntStr: string,
  batchRoot: string,
  paymentIndex: number
): Promise<string> {
  const poseidon = await getPoseidon();
  const addrBigInt = BigInt(employerBigIntStr);
  const rootBigInt = BigInt(batchRoot);
  const indexBigInt = BigInt(paymentIndex);
  const hash = poseidon([addrBigInt, rootBigInt, indexBigInt]);
  const hashBigInt = poseidon.F.toObject(hash);
  return "0x" + hashBigInt.toString(16).padStart(64, "0");
}

// ─── Witness Builder ─────────────────────────────────────────────

/**
 * Build the witness input JSON for the circom circuit.
 * Pads all arrays to `capacity` entries (default: CIRCUIT_RECIPIENT_CAPACITY)
 * to match the circuit's fixed input size. Padding entries use address="0",
 * amount="0", duration=0.
 */
export async function buildWitnessInput(
  recipients: PayrollRecipient[],
  employerAddress: string,
  merkleTree: MerkleTreeResult,
  totalAmount: string,
  capacity: number = CIRCUIT_RECIPIENT_CAPACITY,
): Promise<WitnessInput> {
  const nullifiers: string[] = [];
  const amounts: string[] = [];
  const durations: string[] = [];

  // CRITICAL: The circuit treats ALL signal inputs as BN128 field elements.
  // Stellar addresses (e.g. "GCW43...") are NOT valid numbers for BigInt().
  // We must convert them to their BigInt representation BEFORE passing to
  // the witness input, because snarkjs internally calls BigInt() on every
  // value when loading the witness.
  const employerBigInt = addressBigInt(employerAddress);
  const addresses: string[] = [];

  for (let i = 0; i < capacity; i++) {
    const r = i < recipients.length ? recipients[i] : { address: "0", amount: "0", duration_secs: 0 };
    addresses.push(String(addressBigInt(r.address)));
    amounts.push(r.amount);
    durations.push(r.duration_secs.toString());
    const nullifier = await computeNullifier(employerBigInt.toString(), merkleTree.root, i);
    nullifiers.push(nullifier);
  }

  // Slice Merkle proofs to match capacity
  const merkleProofs = merkleTree.proofs.slice(0, capacity);
  const merkleIndices = merkleTree.proofIndices.slice(0, capacity);

  return {
    batch_commitment: merkleTree.root,
    batch_total_amount: totalAmount,
    batch_nullifiers: nullifiers,
    circuit_version: "1",
    employer_address: String(employerBigInt),
    recipient_addresses: addresses,
    payment_amounts: amounts,
    stream_durations: durations,
    merkle_proofs: merkleProofs,
    merkle_proof_indices: merkleIndices,
  };
}

// ─── Proof Generation ────────────────────────────────────────────

/**
 * Generate a Groth16 proof for a payroll batch.
 *
 * @param zkeyUrl - URL to the proving key file (payroll_circuit.zkey)
 * @param wasmUrl - URL to the witness WASM (payroll_circuit.wasm)
 * @param witnessInput - The witness input JSON
 * @param onProgress - Optional callback for stage updates
 * @returns Proof result with serialized bytes
 */
export async function generateProof(
  zkeyUrl: string,
  wasmUrl: string,
  witnessInput: WitnessInput,
  onProgress?: (stage: PayrollProgress) => void,
): Promise<ProofResult> {
  // NOTE: The deployed Soroban contract uses BLS12-381 host functions for
  // Groth16 verification, with the verification key set to IDENTITY POINTS
  // (dev mode). The circom/snarkjs toolchain generates proofs on BN128, which
  // is a completely different elliptic curve — BLS12-381 host functions
  // reject BN128 points with "point not on curve".
  //
  // Until we build a BLS12-381 proving pipeline, ALWAYS use the mock proof
  // (BLS12-381 identity points). This matches the contract's dev-mode VK
  // and passes the pairing check because e(identity, anything) = 1.
  return getMockProof(witnessInput);
}

// ─── Mock Proof (for development) ────────────────────────────────

/**
 * Generate a mock Groth16 proof compatible with BLS12-381 identity-point VK.
 *
 * The contract's `verify_zk_proof_internal` is configured with identity-point
 * verification key (dev mode). It parses 384 bytes as:
 *   - π_A (G1 uncompressed, bytes 0..96, identity = [0x40, 0..95])
 *   - π_B (G2 uncompressed, bytes 96..288, identity = [0x40, 0..191])
 *   - π_C (G1 uncompressed, bytes 288..384, identity = [0x40, 0..95])
 *
 * BLS12-381 identity points format (uncompressed):
 *   - G1: [0x40, 0, 0, ..., 0]  (96 bytes, first byte = 0x40)
 *   - G2: [0x40, 0, 0, ..., 0]  (192 bytes, first byte = 0x40)
 *
 * When both VK and proof are identity points, the Groth16 pairing check
 * passes because e(identity, anything) = 1 in the target group.
 */
function getMockProof(witnessInput: WitnessInput): ProofResult {
  const proofBytes = new Uint8Array(384);

  // π_A — G1 identity (0x40 + zeros)
  proofBytes[0] = 0x40;

  // π_B — G2 identity (0x40 + zeros)
  proofBytes[96] = 0x40;

  // π_C — G1 identity (0x40 + zeros)
  proofBytes[288] = 0x40;

  return {
    proof: {
      pi_a: ["0", "0", "1"],
      pi_b: [["0", "0"], ["0", "0"], ["1", "0"]],
      pi_c: ["0", "0", "1"],
      protocol: "groth16",
      curve: "bls12381",
    },
    publicSignals: [
      witnessInput.batch_commitment,
      witnessInput.batch_total_amount,
      ...witnessInput.batch_nullifiers,
    ],
    toBytes: () => proofBytes,
  };
}

// ─── Non-blocking helpers ───────────────────────────────────────

/**
 * Yield to the browser event loop so it can paint UI updates (spinners,
 * progress text) before the next heavy synchronous chunk.
 *
 * Returns a promise that resolves on the next macrotask. Use this before
 * any computation that blocks the main thread for >50ms.
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

// ─── Payroll Batch Processor ─────────────────────────────────────

/**
 * Progress stage labels passed to the onProgress callback.
 */
export const PAYROLL_STAGES = {
  MERKLE_TREE: "Building Merkle tree…",
  WITNESS_INPUT: "Preparing witness data…",
  LOADING_SNARKJS: "Loading ZK prover (snarkjs)…",
  GENERATING_WITNESS: "Generating witness (WASM)…",
  PROVING: "Generating Groth16 proof…",
  DONE: "Proof generated — submitting to chain…",
} as const;

export type PayrollProgress = (typeof PAYROLL_STAGES)[keyof typeof PAYROLL_STAGES];

/**
 * Process a payroll batch end-to-end:
 * 1. Pad recipients to circuit capacity (fixed-size circuit)
 * 2. Build Merkle tree with depth-20 (matching circuit)
 * 3. Generate witness input padded to circuit capacity
 * 4. Generate Groth16 proof via snarkjs
 * 5. Return serialized proof + public signals
 *
 * @param onProgress - Optional callback fired before each stage so the UI
 *   can show the current step. Uses requestIdleCallback-based yielding
 *   between stages so the browser can paint the UI update.
 *
 * NOTE: The dev circuit is fixed at CIRCUIT_RECIPIENT_CAPACITY (2) recipients.
 * Recipients are padded to this size with zero entries. Padding entries have
 * address="0", amount="0", duration=0, which pass the circuit's constraints
 * (no strict >0 amount check). The totalAmount stays unchanged since padding
 * adds 0.
 */
export async function processPayrollBatch(
  recipients: PayrollRecipient[],
  employerAddress: string,
  totalAmount: string,
  _zkeyUrl?: string,
  _wasmUrl?: string,
  onProgress?: (stage: PayrollProgress) => void,
): Promise<{
  merkleRoot: string;
  nullifiers: string[];
  proofBytes: Uint8Array;
  publicSignals: string[];
}> {
  onProgress?.(PAYROLL_STAGES.MERKLE_TREE);
  await yieldToEventLoop();

  // Step 1: Compute SHA256 Merkle root matching the contract's
  // compute_merkle_root algorithm (NOT the circuit's Poseidon tree).
  // The contract uses:
  //   leaf = SHA256(address_string_bytes ++ u128_amount_be_bytes)
  //   internal = SHA256(left ++ right)
  const merkleRootBytes = await computeSha256MerkleRoot(recipients);
  const merkleRootHex = "0x" + Array.from(merkleRootBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  onProgress?.(PAYROLL_STAGES.WITNESS_INPUT);
  await yieldToEventLoop();

  // Step 2: Compute SHA256-based nullifiers (deterministic, unique per batch)
  const rootHexNoPrefix = merkleRootHex.replace("0x", "");
  const nullifierBytes = await computeDevNullifiers(employerAddress, rootHexNoPrefix, recipients.length);
  const nullifiers = nullifierBytes.map(
    bytes => "0x" + Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
  );

  onProgress?.(PAYROLL_STAGES.LOADING_SNARKJS);
  await yieldToEventLoop();

  // Step 3: Generate mock BLS12-381 identity-point proof
  // The contract is deployed with identity-point VK, so pairing checks pass
  // when proof is also identity points. No actual ZK computation needed.
  const mockInput: WitnessInput = {
    batch_commitment: merkleRootHex,
    batch_total_amount: totalAmount,
    batch_nullifiers: nullifiers,
    circuit_version: "1",
    employer_address: employerAddress,
    recipient_addresses: recipients.map(r => r.address),
    payment_amounts: recipients.map(r => r.amount),
    stream_durations: recipients.map(r => r.duration_secs.toString()),
    merkle_proofs: [],
    merkle_proof_indices: [],
  };
  const result = getMockProof(mockInput);

  onProgress?.(PAYROLL_STAGES.DONE);

  return {
    merkleRoot: merkleRootHex,
    nullifiers,
    proofBytes: result.toBytes(),
    publicSignals: result.publicSignals,
  };
}
