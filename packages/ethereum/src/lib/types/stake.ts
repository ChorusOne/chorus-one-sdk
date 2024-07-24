import { Hex } from 'viem'

/**
 * A transaction for staking ETH.
 */
export interface StakeTransactionData {
  /**
   * Hex-encoded transaction call data.
   */
  transaction: Hex
  vault: Hex

  /**
   * Gas estimation for the transaction.
   */
  gasEstimation: bigint

  /**
   * Amount of the ETH staked in the transaction.
   */
  amount: bigint

  /**
   * Max priority fee per gas to use for the network.
   */
  maxPriorityFeePerGas: bigint

  /**
   * Max fee per gas to use for the network.
   */
  maxFeePerGas: bigint
}
