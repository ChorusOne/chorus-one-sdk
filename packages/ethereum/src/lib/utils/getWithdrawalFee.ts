import { PublicClient, toHex } from 'viem'
import { NetworkConfig } from './getNetworkConfig'

export type Queue = {
  length: bigint
  fee: bigint
}

// https://eips.ethereum.org/EIPS/eip-7002#fee-calculation
export const getWithdrawalQueue = async (ethPublicClient: PublicClient, config: NetworkConfig): Promise<Queue> => {
  const length = await getWithdrawalQueueLength(ethPublicClient, config)

  // Add 10 to the length as a buffer to avoid underestimating the fee
  // This accounts for new requests that may be added before ours is processed
  // and helps ensure the transaction goes through without being underpriced
  const excess = length + 10n

  const fee = getRequiredFee(config.consolidationRequestFeeAddition, excess, config.minConsolidationRequestFee)

  return { length, fee }
}

export const getWithdrawalQueueLength = async (
  ethPublicClient: PublicClient,
  config: NetworkConfig
): Promise<bigint> => {
  let queueLengthHex: string | undefined
  try {
    queueLengthHex = await ethPublicClient.getStorageAt({
      address: config.withdrawalContractAddress!,
      slot: toHex(config.excessWithdrawalRequestsStorageSlot)
    })

    if (!queueLengthHex) {
      throw new Error('Unable to get withdrawal queue length')
    }
    if (queueLengthHex === config.excessInhibitor) {
      throw new Error('Withdrawal queue is disabled')
    }
  } catch (error) {
    console.error(error)
    queueLengthHex = '0x0'
  }

  return BigInt(queueLengthHex)
}

const getRequiredFee = (factor: bigint, queueLength: bigint, denominator: bigint): bigint => {
  let i = 1n
  let output = 0n
  let numeratorAccum = factor * denominator

  while (numeratorAccum > 0n) {
    output = output + numeratorAccum
    numeratorAccum = (numeratorAccum * queueLength) / (i * denominator)
    i = i + 1n
  }

  return output / denominator
}
