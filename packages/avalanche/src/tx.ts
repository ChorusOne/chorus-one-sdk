import { secp256k1 as avalancheSecp256k1, utils } from '@avalabs/avalanchejs'
import { checkMaxDecimalPlaces } from '@chorus-one/utils'
import { Context } from '@avalabs/avalanchejs'
import { secp256k1 } from '@noble/curves/secp256k1'
import { AvalancheAddressSet } from './types.d'
import { BigNumber } from 'bignumber.js'

/** @ignore */
export function publicKeyToAddress (pk: Uint8Array, hrp: string): AvalancheAddressSet {
  // Convert public key using @noble/curves
  const point = secp256k1.Point.fromHex(pk)

  // NOTE: avalanchejs publicKeyBytesToAddress expects compressed public key!!! (otherwise you get wrong address)
  const pkCompressed = point.toBytes(true)

  // generate C-Chain and P-Chain addresses
  const addrBytes = avalancheSecp256k1.publicKeyBytesToAddress(pkCompressed)

  return {
    cAddr: '0x' + Buffer.from(avalancheSecp256k1.publicKeyToEthAddress(pk)).toString('hex').toLowerCase(),
    pAddr: utils.format('P', hrp, addrBytes),
    xAddr: utils.format('X', hrp, addrBytes),
    coreEthAddr: utils.format('C', hrp, addrBytes)
  }
}

export function validateSrcAndDstChain (sourceChain: string, dstChain: string): void {
  sourceChain = sourceChain.toLowerCase()
  dstChain = dstChain.toLowerCase()

  // TODO: support X-Chain
  if (!['c', 'p'].includes(sourceChain)) {
    throw new Error('source chain must be either C or P')
  }

  if (!['c', 'p'].includes(dstChain)) {
    throw new Error('destnation chain must be either C or P')
  }

  if (sourceChain === dstChain) {
    throw new Error('source chain and destination chain must be different')
  }
}

export function getChainIdFromContext (sourceChain: string, context: Context.Context): string {
  switch (sourceChain.toLowerCase()) {
    case 'c':
      return context.cBlockchainID
    case 'p':
      return context.pBlockchainID
    case 'x':
      return context.xBlockchainID
    default:
      throw new Error('invalid source chain')
  }
}

export function getChainFromAddr (addr: string): string {
  addr = addr.toLowerCase()

  if (addr.startsWith('0x')) {
    return 'C'
  }
  if (addr.startsWith('c-')) {
    return 'C'
  }
  if (addr.startsWith('p-')) {
    return 'P'
  }
  if (addr.startsWith('x-')) {
    return 'X'
  }
  throw new Error('invalid address')
}

export function macroToDenomAmount (amount: string, denomMultiplier?: string): bigint {
  const multiplier = getDenomMultiplier(denomMultiplier)

  checkMaxDecimalPlaces(multiplier.toString())

  if (BigInt(multiplier) === BigInt(0)) {
    throw new Error('denomMultiplier cannot be 0')
  }

  if (BigNumber(amount).isNaN()) {
    throw new Error('invalid amount: ' + amount + ' failed to parse to number')
  }

  const macroAmount = BigNumber(multiplier).multipliedBy(amount)
  if (macroAmount.isNegative()) {
    throw new Error('amount cannot be negative')
  }

  const decimalPlaces = macroAmount.decimalPlaces()
  if (decimalPlaces !== null && decimalPlaces > 0) {
    throw new Error(
      `exceeded maximum denominator precision, amount: ${macroAmount.toString()}, precision: .${macroAmount.precision()}`
    )
  }

  return BigInt(macroAmount.toString(10))
}

export function denomToMacroAmount (amount: bigint, denomMultiplier?: string): string {
  const multiplier = getDenomMultiplier(denomMultiplier)

  checkMaxDecimalPlaces(multiplier.toString())

  if (BigInt(multiplier) === BigInt(0)) {
    throw new Error('denomMultiplier cannot be 0')
  }

  if (amount < BigInt(0)) {
    throw new Error('amount cannot be negative')
  }

  const amnt = new BigNumber(amount.toString())
  return amnt.div(multiplier).toString(10)
}

export function getDenomMultiplier (denomMultiplier?: string): number {
  // Avalanche default denomMultiplier is 1e9 (nAVAX) therefore it is safe
  // to store multiplier as a number type
  if (denomMultiplier !== undefined) {
    return Number(denomMultiplier)
  }
  return Number(1e9)
}
