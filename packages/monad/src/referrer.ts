import type { AccessList, Address, Hex } from 'viem'
import { keccak256, toHex } from 'viem'

const DEFAULT_REFERRER = 'chorusone-staking'
const ACCESS_LIST_SENTINEL: Address = '0x000000000000000000000000000000000000dEaD'

/**
 * Builds the default referrer tag using Chorus One encoding
 * Format: c1c1 + first 3 bytes of keccak256 hash (5 bytes total), padded to 32 bytes
 */
const buildDefaultReferrerSlot = (): Hex => {
  const hash = keccak256(toHex(DEFAULT_REFERRER))
  const tag = `c1c1${hash.slice(2, 8)}`
  return `0x${tag.padEnd(64, '0')}`
}

/**
 * Builds an EIP-2930 access list for referrer tracking.
 *
 * This embeds a referrer identifier into the transaction using access lists,
 * enabling on-chain attribution without modifying smart contract logic.
 *
 * @param referrer - Optional custom 32-byte hex string. If not provided, uses default Chorus One encoding (c1c1 + hash).
 * @returns An access list array to be included in the transaction
 */
export const buildReferrerTracking = (referrer?: Hex): AccessList => [
  {
    address: ACCESS_LIST_SENTINEL,
    storageKeys: [referrer ?? buildDefaultReferrerSlot()]
  }
]
