import { toHex } from 'viem'
import { NativeStakingConnector } from '../nativeStakingConnector'

export type Queue = {
  length: bigint
  fee: bigint
}

// https://eips.ethereum.org/EIPS/eip-7002#fee-calculation
export const getWithdrawalQueue = async (conn: NativeStakingConnector): Promise<Queue> => {
  const length = await getWithdrawalQueueLength(conn)

  // Add 10 to the length as a buffer to avoid underestimating the fee
  // This accounts for new requests that may be added before ours is processed
  // and helps ensure the transaction goes through without being underpriced
  const excess = length + 10n

  const fee = getRequiredFee(
    conn.config.consolidationRequestFeeAddition,
    excess,
    conn.config.minConsolidationRequestFee
  )

  return { length, fee }
}

export const getWithdrawalQueueLength = async (conn: NativeStakingConnector): Promise<bigint> => {
  let queueLengthHex
  try {
    queueLengthHex = await conn.eth.getStorageAt({
      address: conn.config.withdrawalContractAddress!,
      slot: toHex(conn.config.excessWithdrawalRequestsStorageSlot)
    })

    if (!queueLengthHex) {
      throw new Error('Unable to get withdrawal queue length')
    }
    if (queueLengthHex === conn.config.excessInhibitor) {
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
