/**
 * Validates validator ID range (uint64)
 * @param validatorId - Validator ID to validate
 * @returns True if valid validator ID
 */
export function isValidValidatorId (validatorId: number): boolean {
  return Number.isInteger(validatorId) && validatorId >= 0 && validatorId < 2 ** 64
}

/**
 * Validates withdrawal ID range (uint8: 0-255)
 * @param withdrawalId - Withdrawal ID to validate
 * @returns True if valid withdrawal ID
 */
export function isValidWithdrawalId (withdrawalId: number): boolean {
  return Number.isInteger(withdrawalId) && withdrawalId >= 0 && withdrawalId <= 255
}
