import type { WithdrawalPayload } from './types'

/**
 * Compact JSON keys to keep URLs short.
 * Keys use single letters to minimize base64 payload size.
 * ~40% smaller than full-key JSON.
 */
const KEY_MAP: Record<string, keyof WithdrawalPayload> = {
  b: 'batch_id',
  c: 'contract_address',
  t: 'token_address',
  i: 'employee_index',
  a: 'salary_amount',
  f: 'salary_amount_field',
  s: 'nullifier_secret',
  r: 'merkle_root',
  h: 'merkle_siblings',
  p: 'merkle_path_indices',
}

const REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k])
)

/**
 * Encode a withdrawal payload into a URL-safe base64 string.
 * Uses compact single-letter keys for minimal URL length.
 */
export function encodePayload(payload: WithdrawalPayload): string {
  // Compact: map full keys to single letters
  const compact: Record<string, unknown> = {}
  for (const [fullKey, shortKey] of Object.entries(REVERSE_MAP)) {
    compact[shortKey] = payload[fullKey as keyof WithdrawalPayload]
  }
  const json = JSON.stringify(compact)
  return btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Decode a URL-safe base64 string back into a withdrawal payload.
 * Throws if the payload is invalid or malformed.
 */
export function decodePayload(b64: string): WithdrawalPayload {
  try {
    const json = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
    const compact = JSON.parse(json) as Record<string, unknown>

    // Expand: map short keys to full keys
    const payload: Partial<WithdrawalPayload> = {}
    for (const [shortKey, value] of Object.entries(compact)) {
      const fullKey = KEY_MAP[shortKey]
      if (fullKey) {
        (payload as any)[fullKey] = value
      }
    }

    // Validate required fields
    const required: (keyof WithdrawalPayload)[] = [
      'batch_id',
      'contract_address',
      'salary_amount',
      'nullifier_secret',
      'merkle_root',
      'merkle_siblings',
      'merkle_path_indices',
    ]
    for (const field of required) {
      if (!payload[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    return payload as WithdrawalPayload
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error('Invalid payload format')
  }
}
