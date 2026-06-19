import type { WithdrawalPayload } from './types'

/**
 * Encode a withdrawal payload into a URL-safe base64 string.
 * Used to create employee withdrawal links.
 */
export function encodePayload(payload: WithdrawalPayload): string {
  const json = JSON.stringify(payload)
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
    const payload = JSON.parse(json) as WithdrawalPayload

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

    return payload
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error('Invalid payload format')
  }
}
