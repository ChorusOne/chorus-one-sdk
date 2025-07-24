import BigNumber from 'bignumber.js'
import { checkMaxDecimalPlaces } from '@chorus-one/utils'
import { LAMPORTS_PER_SOL, PublicKey, TransactionInstruction } from '@solana/web3.js'
import { createHash } from 'crypto'

export function macroToDenomAmount (
  amount: string, // in macro denom (e.g. ATOM)
  denomMultiplier: string
): number {
  checkMaxDecimalPlaces(denomMultiplier)

  if (BigInt(denomMultiplier) === BigInt(0)) {
    throw new Error('denomMultiplier cannot be 0')
  }

  if (BigNumber(amount).isNaN()) {
    throw new Error('invalid amount: ' + amount + ' failed to parse to number')
  }

  const macroAmount = BigNumber(denomMultiplier).multipliedBy(amount)
  if (macroAmount.isNegative()) {
    throw new Error('amount cannot be negative')
  }

  const decimalPlaces = macroAmount.decimalPlaces()
  if (decimalPlaces !== null && decimalPlaces > 0) {
    throw new Error(
      `exceeded maximum denominator precision, amount: ${macroAmount.toString()}, precision: .${macroAmount.precision()}`
    )
  }

  // solana web3.js uses number for amount
  return macroAmount.toNumber()
}

export function denomToMacroAmount (
  amount: string, // in denom (e.g. uatom, adydx)
  denomMultiplier: string
): number {
  checkMaxDecimalPlaces(denomMultiplier)

  if (BigInt(denomMultiplier) === BigInt(0)) {
    throw new Error('denomMultiplier cannot be 0')
  }

  if (BigNumber(amount).isNaN()) {
    throw new Error('invalid amount: ' + amount + ' failed to parse to number')
  }

  // solana web3.js uses number for amount
  return BigNumber(amount).dividedBy(denomMultiplier).toNumber()
}

export function getDenomMultiplier (denomMultiplier?: string): string {
  if (denomMultiplier) {
    return denomMultiplier
  }
  return BigNumber(LAMPORTS_PER_SOL).toString(10)
}

export function trackingStringToPubkey (inputString: string): PublicKey {
  const inputBytes = new Uint8Array(new TextEncoder().encode(inputString))
  const hashed = createHash('sha256').update(inputBytes).digest()

  return new PublicKey(hashed)
}

const NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV')

export const getTrackingInstruction = (referrer: string): TransactionInstruction => {
  const trackingPublicKey = trackingStringToPubkey(referrer)

  return new TransactionInstruction({
    keys: [{ pubkey: trackingPublicKey, isSigner: false, isWritable: false }],
    programId: NOOP_PROGRAM_ID,
    data: Buffer.alloc(0)
  })
}

const safepal = trackingStringToPubkey('d716b5a3-chorusone-staking')
console.log('safepal', safepal.toBase58())
