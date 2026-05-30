/**
 * Quick Payroll Helpers — lightweight, no snarkjs/circomlibjs dependency.
 *
 * Computes a SHA256 Merkle root matching the contract's compute_merkle_root
 * algorithm, and builds a mock proof for dev/test mode.
 *
 * The contract's algorithm:
 *   leaf = sha256( address_string.to_bytes() ++ amount_as_u128_be )
 *   internal = sha256( left_hash ++ right_hash )
 */

// ─── SHA256 Merkle Root (matches contract) ───────────────────────

/** Compute the SHA256 hash of a Uint8Array using Web Crypto API */
async function sha256Hash(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data as any);
  return new Uint8Array(hashBuffer);
}

/** Convert an i128 amount to 16-byte big-endian (matching contract's (amount as u128).to_be_bytes()) */
function amountToU128BeBytes(amount: string | number | bigint): Uint8Array {
  let val = BigInt(amount);
  const buf = new Uint8Array(16);
  for (let i = 15; i >= 0; i--) {
    buf[i] = Number(val & 0xffn);
    val >>= 8n;
  }
  return buf;
}

/**
 * Compute the SHA256 Merkle root for a payroll batch,
 * exactly matching the contract's compute_merkle_root algorithm.
 *
 * Contract algorithm (Rust):
 *   leaf = sha256( recipient.to_string().to_bytes() ++ (amount as u128).to_be_bytes() )
 *   parent = sha256( left ++ right )
 */
export async function computeSha256MerkleRoot(
  recipients: { address: string; amount: string }[],
): Promise<Uint8Array> {
  const encoder = new TextEncoder();

  // Step 1: Build leaf hashes
  const leaves: Uint8Array[] = [];
  for (const r of recipients) {
    const addrBytes = encoder.encode(r.address);
    const amtBytes = amountToU128BeBytes(r.amount);
    const leafData = new Uint8Array(addrBytes.length + amtBytes.length);
    leafData.set(addrBytes, 0);
    leafData.set(amtBytes, addrBytes.length);

    const leafHash = await sha256Hash(leafData);
    leaves.push(leafHash);
  }

  // Step 2: Build binary Merkle tree bottom-up
  // Matches the contract's compute_merkle_root algorithm exactly:
  //   leaf = SHA256(address_string.to_bytes() ++ (amount as u128).to_be_bytes())
  //   internal = SHA256(left ++ right)
  //   Odd leaves are propagated up, NOT duplicated
  while (leaves.length > 1) {
    const newLevel: Uint8Array[] = [];
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      if (i + 1 < leaves.length) {
        const right = leaves[i + 1];
        const combined = new Uint8Array(left.length + right.length);
        combined.set(left, 0);
        combined.set(right, left.length);
        const parentHash = await sha256Hash(combined);
        newLevel.push(parentHash);
      } else {
        // Odd leaf — propagate up directly (contract behavior)
        newLevel.push(left);
      }
    }
    leaves.length = 0;
    leaves.push(...newLevel);
  }

  return leaves[0];
}

// ─── Mock Proof (384-byte identity points, passes contract format check) ──

/**
 * Build a 384-byte mock Groth16 proof using BLS12-381 identity points.
 * This matches the e2e test's buildMockProof().
 * - G1 identity (96 bytes): 0x40 followed by zeros
 * - G2 identity (192 bytes): 0x40 followed by zeros
 * - G1 identity (96 bytes): 0x40 followed by zeros
 */
export function buildMockProof(): Uint8Array {
  const proof = new Uint8Array(384);

  // π_A — G1 uncompressed identity point: 0x40 prefix + zeros
  proof[0] = 0x40;

  // π_B — G2 uncompressed identity point
  proof[96] = 0x40;

  // π_C — G1 uncompressed identity point
  proof[288] = 0x40;

  return proof;
}

// ─── Nullifier Helpers ───────────────────────────────────────────

/**
 * Compute a simple deterministic nullifier for dev mode.
 * In production this would be a shielded nullifier hash;
 * for dev we use sha256(employer + root + index) as a unique marker.
 */
export async function computeDevNullifiers(
  employerAddress: string,
  merkleRootHex: string,
  count: number,
): Promise<Uint8Array[]> {
  const encoder = new TextEncoder();
  const nullifiers: Uint8Array[] = [];

  for (let i = 0; i < count; i++) {
    const data = encoder.encode(`${employerAddress}:${merkleRootHex}:${i}`);
    const hash = await sha256Hash(data);
    nullifiers.push(hash);
  }

  return nullifiers;
}
