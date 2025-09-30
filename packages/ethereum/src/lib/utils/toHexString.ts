import { Hex } from 'viem'

export const toHexString = (value: string): Hex => {
  if (value.startsWith('0x')) {
    return value as Hex
  }
  return ('0x' + value) as Hex
}
