import type { Hex } from 'viem'
import { keccak256, toHex } from 'viem'

const DEFAULT_REFERRER = 'sdk-chorusone-staking'
const REFERRER_MARKER = 'c1c1'

const encodeReferrer = (referrer: string): Hex => {
  const hash = keccak256(toHex(referrer))
  return `0x${REFERRER_MARKER}${hash.slice(2, 8)}`
}

export const appendReferrerTracking = (data: Hex, referrer?: string): Hex => {
  const encoded = encodeReferrer(referrer ?? DEFAULT_REFERRER)
  return `${data}${encoded.slice(2)}` as Hex
}
