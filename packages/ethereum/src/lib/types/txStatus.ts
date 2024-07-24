import { TransactionReceipt } from 'viem'

/** @ignore */
export interface EthereumTxStatus {
  status: 'success' | 'failure' | 'pending' | 'unknown'
  receipt: TransactionReceipt | null
}
