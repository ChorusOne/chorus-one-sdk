import { Hex, keccak256, toHex } from 'viem'
import { DEFAULT_TRACKING_REF_CODE } from '@chorus-one/utils'

export const getDefaultTrackingAddress = (): Hex => {
  return `0x${keccak256(toHex(DEFAULT_TRACKING_REF_CODE)).slice(-40)}` as Hex
}
