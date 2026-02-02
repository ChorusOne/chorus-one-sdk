import type { AccessList, Hex, TransactionReceipt } from 'viem'
import type { PolygonNetworks } from './constants'

export interface PolygonNetworkConfig {
  /** Network to use: 'mainnet' (Ethereum L1) or 'testnet' (Sepolia L1) */
  network: PolygonNetworks
  /** Optional RPC endpoint URL override. If not provided, uses viem's default for the network. */
  rpcUrl?: string
}

export interface Transaction {
  /** The recipient (contract) address in hexadecimal format */
  to: Hex
  /** The data to be included in the transaction in hexadecimal format */
  data: Hex
  /** The amount of ETH (in wei) to be sent with the transaction */
  value?: bigint
  /** Optional EIP-2930 access list for referrer tracking */
  accessList?: AccessList
}

export interface PolygonTxStatus {
  /** Status of the transaction */
  status: 'success' | 'failure' | 'unknown'
  /** Transaction receipt (null if unknown) */
  receipt: TransactionReceipt | null
}

export interface StakeInfo {
  /** Total staked amount formatted in POL */
  balance: string
  /** Total shares held by the delegator */
  shares: bigint
}

export interface UnbondInfo {
  /** Shares amount pending unbonding */
  shares: bigint
  /** Epoch number when the unbond becomes claimable */
  withdrawEpoch: bigint
}
