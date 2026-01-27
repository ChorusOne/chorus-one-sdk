import type { AccessList, Address, Hex, TransactionReceipt } from 'viem'

export interface PolygonNetworkConfig {
  /** Ethereum RPC endpoint URL (Polygon staking contracts live on Ethereum L1) */
  rpcUrl: string
}

export interface Transaction {
  /** The recipient (contract) address in hexadecimal format */
  to: Address
  /** The data to be included in the transaction in hexadecimal format */
  data: Hex
  /** The amount of ETH (in wei) to be sent with the transaction */
  value: bigint
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
  /** Total staked amount in wei */
  totalStaked: bigint
  /** Total shares held by the delegator */
  shares: bigint
}

export interface UnbondInfo {
  /** Shares amount pending unbonding */
  shares: bigint
  /** Epoch number when the unbond becomes claimable */
  withdrawEpoch: bigint
}
