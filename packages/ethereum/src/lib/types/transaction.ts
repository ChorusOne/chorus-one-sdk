import { Hex } from 'viem'

/**
 * Represents an Ethereum transaction.
 */
export interface Transaction {
  /**
   * The account (sender) address in hexadecimal format.
   */
  account: Hex

  /**
   * The recipient (receiver) address in hexadecimal format.
   */
  to: Hex

  /**
   * The amount of Wei to be sent with the transaction.
   */
  value?: bigint

  /**
   * The data to be included in the transaction in hexadecimal format.
   */
  data: Hex
}
