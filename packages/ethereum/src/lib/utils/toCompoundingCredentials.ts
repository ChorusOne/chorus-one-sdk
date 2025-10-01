import { Hex } from 'viem'
import { isStandardAddress } from './addressValidation'

/**
 * Converts a standard Ethereum address to 0x02 compounding withdrawal credentials.
 *
 * The 0x02 withdrawal credentials format enables validators to use compounding rewards
 * with a maximum effective balance of 2048 ETH (compared to 32 ETH for standard validators).
 *
 * The credential format follows the same structure as 0x01 credentials, with the prefix changed to 0x02:
 * - 0x02 (1 byte prefix) + 0x00 (11 zero bytes) + wallet address (20 bytes) = 32 bytes total
 *
 * @param address - A standard 20-byte Ethereum address (e.g., 0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30)
 * @returns The 32-byte 0x02 withdrawal credential
 *
 * @example
 * ```typescript
 * const credentials = toCompoundingCredentials('0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30')
 * // Returns: '0x02000000000000000000000070aEe8a9099ebADB186C2D530F72CF5dC7FE6B30'
 * ```
 *
 * @see {@link https://eips.ethereum.org/EIPS/eip-7251|EIP-7251: Increase the MAX_EFFECTIVE_BALANCE}
 */
export function toCompoundingCredentials (address: Hex): `0x02${string}` {
  // Validate it's a standard Ethereum address
  if (!isStandardAddress(address)) {
    throw new Error('Invalid Ethereum address format')
  }

  const addressWithoutPrefix = address.slice(2).toLowerCase()

  // Construct: 0x02 (1 byte) + 00000000000000000000 (11 zero bytes) + address (20 bytes)
  const credentials = `0x02${'0'.repeat(22)}${addressWithoutPrefix}` as `0x02${string}`

  return credentials
}
