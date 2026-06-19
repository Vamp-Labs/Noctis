import { describe, it, expect } from 'vitest'
import { encodePayload, decodePayload } from '../payload'
import type { WithdrawalPayload } from '../types'

const mockPayload: WithdrawalPayload = {
  batch_id: '1',
  contract_address: 'CCYFABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
  token_address: 'CBIELTK6YBZJU5UP2WWQEQ4YkSB1C3ED7JOMDLIN7YNKPOTFPJVULQH',
  employee_index: 0,
  salary_amount: '5000.00',
  salary_amount_field: '0x1234567890abcdef',
  nullifier_secret: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
  merkle_root: '0xdeadbeefcafebabedeadbeefcafebabedeadbeefcafebabedeadbeefcafebabe',
  merkle_siblings: Array(16).fill('0x0000000000000000000000000000000000000000000000000000000000000000'),
  merkle_path_indices: Array(16).fill(0),
}

describe('WithdrawalPayload encode/decode', () => {
  it('should round-trip a payload', () => {
    const encoded = encodePayload(mockPayload)
    const decoded = decodePayload(encoded)
    expect(decoded.batch_id).toBe('1')
    expect(decoded.salary_amount).toBe('5000.00')
    expect(decoded.merkle_siblings).toHaveLength(16)
    expect(decoded.merkle_path_indices).toHaveLength(16)
  })

  it('should produce URL-safe base64', () => {
    const encoded = encodePayload(mockPayload)
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
  })

  it('should be under 2000 characters', () => {
    const encoded = encodePayload(mockPayload)
    expect(encoded.length).toBeLessThan(2000)
  })

  it('should throw on invalid input', () => {
    expect(() => decodePayload('not-base64!')).toThrow()
    expect(() => decodePayload('')).toThrow()
  })

  it('should throw on missing fields', () => {
    const incomplete = { ...mockPayload, batch_id: undefined }
    const encoded = encodePayload(incomplete as any)
    // This should fail because validation catches it
    expect(() => decodePayload(encoded)).toThrow()
  })
})
