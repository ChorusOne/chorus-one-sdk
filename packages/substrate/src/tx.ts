import { checkMaxDecimalPlaces } from '@chorus-one/utils'
import BigNumber from 'bignumber.js'

export function macroToDenomAmount (
  amount: string, // in macro denom (e.g. ATOM)
  denomMultiplier: string
): string {
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

  return macroAmount.toString(10)
}

export function denomToMacroAmount (
  amount: string, // in denom (e.g. uatom, adydx)
  denomMultiplier: string
): string {
  checkMaxDecimalPlaces(denomMultiplier)

  if (BigInt(denomMultiplier) === BigInt(0)) {
    throw new Error('denomMultiplier cannot be 0')
  }

  if (BigNumber(amount).isNaN()) {
    throw new Error('invalid amount: ' + amount + ' failed to parse to number')
  }

  return BigNumber(amount).dividedBy(denomMultiplier).toString(10)
}

export function getDenomMultiplier (denomMultiplier?: string): string {
  if (denomMultiplier === undefined) {
    throw new Error('denomMultiplier is not set')
  }
  return denomMultiplier
}
