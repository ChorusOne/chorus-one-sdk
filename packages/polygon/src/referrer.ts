import type { AccessList, Address, Hex } from 'viem'
import { keccak256, toHex } from 'viem'

const DEFAULT_REFERRER = 'sdk-chorusone-staking'
const ACCESS_LIST_SENTINEL: Address = '0x000000000000000000000000000000000000dEaD'

const buildDefaultReferrerSlot = (): Hex => {
  const hash = keccak256(toHex(DEFAULT_REFERRER))
  const tag = `c1c1${hash.slice(2, 8)}`
  return `0x${tag.padEnd(64, '0')}`
}

export const buildReferrerTracking = (referrer?: Hex): AccessList => [
  {
    address: ACCESS_LIST_SENTINEL,
    storageKeys: [referrer ?? buildDefaultReferrerSlot()]
  }
]
