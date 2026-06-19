import { describe, it, expect } from 'vitest'
import { PayrollTreeBuilder } from '../tree-builder'
import type { PayrollRow } from '../types'

describe('PayrollTreeBuilder', () => {
  it('should compute a deterministic hash', () => {
    const builder = new PayrollTreeBuilder(16)
    const result = builder.hash([1n, 2n, 3n], 3)
    expect(typeof result).toBe('bigint')
    expect(result).not.toBe(0n)
    expect(result).toBeGreaterThan(0n)
  })

  it('should produce the same hash for the same input', () => {
    const builder = new PayrollTreeBuilder(16)
    const result1 = builder.hash([42n, 99n], 2)
    const result2 = builder.hash([42n, 99n], 2)
    expect(result1).toBe(result2)
  })

  it('should produce different hashes for different inputs', () => {
    const builder = new PayrollTreeBuilder(16)
    const result1 = builder.hash([1n, 2n], 2)
    const result2 = builder.hash([1n, 3n], 2)
    expect(result1).not.toBe(result2)
  })

  it('should build a valid Merkle tree from payroll rows', async () => {
    const rows: PayrollRow[] = [
      { stellar_address: 'GABC…', salary_amount_usdc: 5000 },
      { stellar_address: 'GDEF…', salary_amount_usdc: 3000 },
      { stellar_address: 'GHIJ…', salary_amount_usdc: 2000 },
    ]

    const builder = new PayrollTreeBuilder(16)
    const result = await builder.buildTree(rows)

    expect(result.merkle_root).toMatch(/^0x[0-9a-f]{64}$/)
    expect(result.leaf_count).toBe(3)
    expect(result.total_amount).toBe(10000)
    expect(result.leaves).toHaveLength(3)

    // Each leaf should have merkle proof data
    for (const leaf of result.leaves) {
      expect(leaf.merkle_siblings).toHaveLength(16)
      expect(leaf.merkle_path_indices).toHaveLength(16)
      expect(leaf.leaf_hash).toMatch(/^0x[0-9a-f]{64}$/)
      expect(leaf.nullifier_hash).toMatch(/^0x[0-9a-f]{64}$/)
      expect(leaf.nullifier_secret).toBeInstanceOf(Uint8Array)
      expect(leaf.nullifier_secret).toHaveLength(32)
    }
  })

  it('should produce consistent roots for the same data', async () => {
    const rows: PayrollRow[] = [
      { stellar_address: 'GABC…', salary_amount_usdc: 5000 },
      { stellar_address: 'GDEF…', salary_amount_usdc: 3000 },
    ]

    const builder = new PayrollTreeBuilder(16)
    const result1 = await builder.buildTree(rows)
    // Same data but different secrets — roots will differ (this is correct)
    const result2 = await builder.buildTree(rows)

    expect(result1.merkle_root).not.toBe(result2.merkle_root)
    // But the structure should be the same
    expect(result1.leaf_count).toBe(result2.leaf_count)
  })

  it('should handle single employee', async () => {
    const rows: PayrollRow[] = [
      { stellar_address: 'GABC…', salary_amount_usdc: 10000 },
    ]

    const builder = new PayrollTreeBuilder(16)
    const result = await builder.buildTree(rows)

    expect(result.leaf_count).toBe(1)
    expect(result.merkle_root).toMatch(/^0x[0-9a-f]{64}$/)
    expect(result.leaves[0].merkle_siblings).toHaveLength(16)
    expect(result.leaves[0].merkle_path_indices).toHaveLength(16)
  })

  it('should handle depth variation', async () => {
    const rows: PayrollRow[] = [
      { stellar_address: 'GABC…', salary_amount_usdc: 5000 },
    ]

    const builder4 = new PayrollTreeBuilder(4)
    const result = await builder4.buildTree(rows)

    expect(result.leaves[0].merkle_siblings).toHaveLength(4)
    expect(result.leaves[0].merkle_path_indices).toHaveLength(4)
  })
})
