import type { PayrollRow, TreeBuildResult, LeafData } from './types'
import { bn254 } from '@taceo/poseidon2'

/**
 * Poseidon2 sponge hash over BN254 (state size t=4, rate=3).
 *
 * Matches the Noir `poseidon::poseidon2::Poseidon2::hash()`:
 *   - IV = in_len * 2^64 placed in capacity (state[3])
 *   - Absorb in chunks of 3, permute after each full chunk
 *   - Squeeze first element (state[0])
 *
 * The underlying t4 permutation comes from @taceo/poseidon2 which
 * uses the standard HorizenLabs parameters (d=5, RF=8, RP=56),
 * matching Barretenberg/UltraHonk's native Poseidon2.
 */
const RATE = 3
const TWO_POW_64 = 18446744073709551616n

function poseidon2Hash(input: bigint[], inLen: number): bigint {
  // IV = in_len * 2^64  (capacity element)
  const iv = BigInt(inLen) * TWO_POW_64
  const state: bigint[] = [0n, 0n, 0n, iv]

  // Absorb full chunks
  const fullChunks = Math.floor(inLen / RATE)
  for (let chunk = 0; chunk < fullChunks; chunk++) {
    for (let i = 0; i < RATE; i++) {
      state[i] = (state[i] + input[chunk * RATE + i]) % bn254Modulus
    }
    // Permute state size 4
    const permuted = bn254.t4.permutation(state)
    for (let i = 0; i < 4; i++) state[i] = permuted[i]
  }

  // Absorb remaining partial chunk
  const remaining = inLen % RATE
  if (remaining > 0) {
    const start = fullChunks * RATE
    for (let j = 0; j < remaining; j++) {
      state[j] = (state[j] + input[start + j]) % bn254Modulus
    }
  }

  // Final permutation if input was empty or partial chunk
  if (inLen === 0 || remaining !== 0) {
    const permuted = bn254.t4.permutation(state)
    for (let i = 0; i < 4; i++) state[i] = permuted[i]
  }

  return state[0]
}

// BN254 (alt_bn128) scalar field modulus
const bn254Modulus = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

/**
 * Convert a bigint field element to a 32-byte hex string.
 */
function fieldToHex(f: bigint): string {
  const hex = f.toString(16).padStart(64, '0')
  return '0x' + hex
}

/**
 * Convert a Uint8Array to a field element (bigint) by treating it as
 * a big-endian integer and reducing modulo the BN254 field.
 */
function bytesToField(bytes: Uint8Array): bigint {
  let result = 0n
  for (const b of bytes) {
    result = (result << 8n) + BigInt(b)
  }
  return result % bn254Modulus
}

/**
 * Poseidon2 Merkle Tree Builder for ZK payroll commitments.
 *
 * Builds an incremental Merkle tree from employer CSV data.
 * Each leaf = Poseidon2(salary_amount || nullifier_secret || employee_index)
 *
 * CRITICAL: Must produce EXACTLY the same Merkle root as the Noir circuit
 * for the same inputs.
 */
export class PayrollTreeBuilder {
  private depth: number

  constructor(depth: number = 16) {
    this.depth = depth
  }

  /**
   * Build a complete Merkle tree from payroll CSV rows.
   * Returns the Merkle root, all leaves with proof data (siblings + path indices).
   */
  async buildTree(rows: PayrollRow[]): Promise<TreeBuildResult> {
    const batchId = `batch_${Date.now()}`
    const totalAmount = rows.reduce((sum, r) => sum + r.salary_amount_usdc, 0)

    // Step 1: Generate secrets and compute leaves
    const leaves: LeafData[] = []
    const leafFieldValues: bigint[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const secret = this.generateSecret()
      const secretField = bytesToField(secret)

      // Leaf = Poseidon2(salary_amount, secret, index)
      const leaf = poseidon2Hash(
        [BigInt(row.salary_amount_usdc), secretField, BigInt(i)],
        3
      )

      // Compute nullifier = Poseidon2(secret)
      const nullifier = poseidon2Hash([secretField], 1)

      leafFieldValues.push(leaf)

      leaves.push({
        employee_index: i,
        salary_amount_usdc: row.salary_amount_usdc,
        stellar_address: row.stellar_address,
        nullifier_secret: secret,
        nullifier_hash: fieldToHex(nullifier),
        leaf_hash: fieldToHex(leaf),
        merkle_siblings: [],
        merkle_path_indices: [],
      })
    }

    // Step 2: Build Merkle tree
    // Pad leaves to power of 2 if needed
    const treeSize = Math.max(1, Math.pow(2, this.depth))
    const tree: bigint[][] = []
    tree.push([...leafFieldValues])

    // Fill remaining leaves with zero
    while (tree[0].length < treeSize) {
      tree[0].push(0n)
    }

    // Build levels bottom-up
    for (let level = 0; level < this.depth; level++) {
      const currentLevel = tree[level]
      const nextLevel: bigint[] = []

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]
        const right = currentLevel[i + 1] ?? left
        const parent = poseidon2Hash([left, right], 2)
        nextLevel.push(parent)
      }

      tree.push(nextLevel)
    }

    // Step 3: Extract Merkle proofs for each leaf
    const merkleRoot = tree[this.depth][0]

    for (let i = 0; i < leaves.length; i++) {
      const siblings: bigint[] = []
      const pathIndices: boolean[] = []
      let index = i

      for (let level = 0; level < this.depth; level++) {
        const levelNodes = tree[level]
        const siblingIndex = index % 2 === 0 ? index + 1 : index - 1
        const sibling = levelNodes[siblingIndex] ?? 0n
        siblings.push(sibling)
        pathIndices.push(index % 2 === 1)
        index = Math.floor(index / 2)
      }

      leaves[i].merkle_siblings = siblings.map(fieldToHex)
      leaves[i].merkle_path_indices = pathIndices
    }

    return {
      batch_id: batchId,
      merkle_root: fieldToHex(merkleRoot),
      total_amount: totalAmount,
      leaf_count: rows.length,
      leaves,
    }
  }

  /**
   * Compute the Poseidon2 hash for a list of field elements.
   * Exposed for external use and testing.
   */
  hash(input: bigint[], inLen: number): bigint {
    return poseidon2Hash(input, inLen)
  }

  /**
   * Generate a cryptographically secure 32-byte secret.
   */
  private generateSecret(): Uint8Array {
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
      return globalThis.crypto.getRandomValues(new Uint8Array(32))
    }
    // Fallback for older environments
    const bytes = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
    return bytes
  }
}
