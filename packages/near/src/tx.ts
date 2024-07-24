import { NEAR_NOMINATION_EXP } from 'near-api-js/lib/utils/format'
import { checkMaxDecimalPlaces } from '@chorus-one/utils'
import BigNumber from 'bignumber.js'

export function macroToDenomAmount (
  amount: string, // in macro NEAR
  denomMultiplier?: string
): string {
  const multiplier = getDeomMultiplier(denomMultiplier)

  checkMaxDecimalPlaces(multiplier)

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

  return macroAmount.toString(10)
}

export function denomToMacroAmount (amount: string, denomMultiplier?: string): string {
  const multiplier = getDeomMultiplier(denomMultiplier)

  checkMaxDecimalPlaces(multiplier)

  if (BigInt(multiplier) === BigInt(0)) {
    throw new Error('denomMultiplier cannot be 0')
  }

  if (BigNumber(amount).isNaN()) {
    throw new Error('invalid amount: ' + amount + ' failed to parse to number')
  }

  return BigNumber(amount).dividedBy(multiplier).toString(10)
}

function getDeomMultiplier (denomMultiplier?: string): string {
  if (denomMultiplier) {
    return denomMultiplier
  }
  return BigNumber(10 ** NEAR_NOMINATION_EXP).toString(10)
}
