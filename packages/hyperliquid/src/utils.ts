import { WEI_PER_TOKEN } from './constants'

/**
 * Validates validator ID range (uint64)
 * @param validatorId - Validator ID to validate
 * @returns True if valid validator ID
 */
export function isValidValidatorId(validatorId: number): boolean {
  return Number.isInteger(validatorId) && validatorId >= 0 && validatorId < 2 ** 64
}

/**
 * Validates withdrawal ID range (uint8: 0-255)
 * @param withdrawalId - Withdrawal ID to validate
 * @returns True if valid withdrawal ID
 */
export function isValidWithdrawalId(withdrawalId: number): boolean {
  return Number.isInteger(withdrawalId) && withdrawalId >= 0 && withdrawalId <= 255
}

/**
 * Converts token amount to wei (8 decimals for Hyperliquid).
 *
 * @param tokens - Amount in tokens (e.g., "1.5" for 1.5 tokens)
 * @returns Amount in wei as a number
 */
export const tokensToWei = (tokens: string): number => {
  const amount = parseFloat(tokens)
  if (isNaN(amount) || amount < 0) {
    throw new Error(`Invalid token amount: ${tokens}`)
  }
  return Math.floor(amount * WEI_PER_TOKEN)
}

/**
 * Converts wei to token amount (8 decimals for Hyperliquid).
 *
 * @param wei - Amount in wei
 * @returns Amount in tokens as a string
 */
export const weiToTokens = (wei: number | string): string => {
  const weiNum = typeof wei === 'string' ? parseFloat(wei) : wei
  return (weiNum / WEI_PER_TOKEN).toFixed(8)
}
