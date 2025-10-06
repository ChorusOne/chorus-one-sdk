import type { PendingActivation } from './types'

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

/**
 * Calculates the number of blocks remaining in the current epoch
 * @param currentBlock - Current block number
 * @param blocksPerEpoch - Number of blocks per epoch
 * @returns Number of blocks remaining until the next epoch
 */
function calculateBlocksRemainingInEpoch (currentBlock: bigint, blocksPerEpoch: number): number {
  const blockPositionInEpoch = Number(currentBlock % BigInt(blocksPerEpoch))
  return blocksPerEpoch - blockPositionInEpoch
}

export function calculateActivationTiming (
  activationEpoch: bigint,
  currentEpoch: bigint,
  currentBlock: bigint,
  amount: bigint,
  blocksPerEpoch: number,
  epochDelayPeriod: number,
  blockTimeSeconds: number
): PendingActivation {
  const epochsRemaining = Number(activationEpoch - currentEpoch)

  let secondsRemaining: number

  if (epochsRemaining === 0) {
    // Already active or activating this epoch
    secondsRemaining = 0
  } else if (epochsRemaining === 1) {
    // Activates next epoch - calculate actual blocks remaining in current epoch
    const blocksRemaining = calculateBlocksRemainingInEpoch(currentBlock, blocksPerEpoch)
    secondsRemaining = blocksRemaining * blockTimeSeconds
  } else {
    // Multiple epochs away
    const blocksRemainingInCurrentEpoch = calculateBlocksRemainingInEpoch(currentBlock, blocksPerEpoch)
    const fullEpochsAway = epochsRemaining - 1

    secondsRemaining =
      blocksRemainingInCurrentEpoch * blockTimeSeconds + fullEpochsAway * blocksPerEpoch * blockTimeSeconds
  }

  return {
    amount,
    activationEpoch,
    epochsRemaining,
    estimatedActivationTime: new Date(Date.now() + secondsRemaining * 1000),
    hoursRemaining: secondsRemaining / 3600
  }
}

export function calculateWithdrawalTiming (
  withdrawEpoch: bigint,
  currentEpoch: bigint,
  currentBlock: bigint,
  blocksPerEpoch: number,
  blockTimeSeconds: number
): {
  isWithdrawable: boolean
  epochsRemaining?: number
  estimatedWithdrawableTime?: Date
  hoursRemaining?: number
} {
  const isWithdrawable = currentEpoch >= withdrawEpoch

  if (isWithdrawable) {
    return { isWithdrawable }
  }

  const epochsRemaining = Number(withdrawEpoch - currentEpoch)
  let secondsRemaining: number

  if (epochsRemaining === 1) {
    // Withdrawable next epoch - calculate actual blocks remaining in current epoch
    const blocksRemaining = calculateBlocksRemainingInEpoch(currentBlock, blocksPerEpoch)
    secondsRemaining = blocksRemaining * blockTimeSeconds
  } else {
    // Multiple epochs away
    const blocksRemainingInCurrentEpoch = calculateBlocksRemainingInEpoch(currentBlock, blocksPerEpoch)
    const fullEpochsAway = epochsRemaining - 1

    secondsRemaining =
      blocksRemainingInCurrentEpoch * blockTimeSeconds + fullEpochsAway * blocksPerEpoch * blockTimeSeconds
  }

  return {
    isWithdrawable,
    epochsRemaining,
    estimatedWithdrawableTime: new Date(Date.now() + secondsRemaining * 1000),
    hoursRemaining: secondsRemaining / 3600
  }
}
