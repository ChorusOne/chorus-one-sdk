import { Hex } from 'viem'

/**
 * Represents a single atomic rewards point for a specific date.
 */
export interface RewardsDataPoint {
  /**
   * The date when the rewards were received.
   */
  when: Date
  /**
   * The amount of rewards received, in wei.
   */
  amount: bigint
  /**
   * The address of the vault that generated the rewards.
   */
  vault: Hex
}
