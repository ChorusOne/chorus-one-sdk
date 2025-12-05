import type { AccessList, Address, Hex, TransactionReceipt } from 'viem'

/** @ignore */
export interface MonadNetworkConfig {
  /** RPC endpoint URL */
  rpcUrl: string
}

/** @ignore */
export interface Transaction {
  /** The recipient (contract) address in hexadecimal format */
  to: Address
  /** The data to be included in the transaction in hexadecimal format */
  data: Hex
  /** The amount of MON (in wei) to be sent with the transaction */
  value: bigint
  /** Optional EIP-2930 access list for referrer tracking */
  accessList?: AccessList
}

/** @ignore */
export interface MonadTxStatus {
  /** Status of the transaction */
  status: 'success' | 'failure' | 'unknown'
  /** Transaction receipt (null if unknown) */
  receipt: TransactionReceipt | null
}

/** @ignore */
export interface DelegatorInfo {
  /** Current active stake earning rewards right now (in wei). Does NOT include pending activations. */
  stake: bigint
  /** Last checked accumulator value (internal accounting for reward distribution, multiplied by 1e36) */
  accRewardPerToken: bigint
  /** Rewards earned but not yet claimed or compounded (in wei) */
  unclaimedRewards: bigint
  /** Pending stake activating at deltaEpoch (submitted before boundary block, in wei) */
  deltaStake: bigint
  /** Pending stake activating at nextDeltaEpoch (submitted after boundary block, in wei) */
  nextDeltaStake: bigint
  /** Epoch number when deltaStake becomes active */
  deltaEpoch: bigint
  /** Epoch number when nextDeltaStake becomes active */
  nextDeltaEpoch: bigint
}

/** @ignore */
export interface WithdrawalRequestInfo {
  /** Amount in wei that will be returned when you call withdraw (0 if no request exists) */
  withdrawalAmount: bigint
  /** Validator's accumulator value when unstake was called (used for reward calculations) */
  accRewardPerToken: bigint
  /** Epoch number when funds become withdrawable. Compare with current epoch to check if ready. */
  withdrawEpoch: bigint
}

/** @ignore */
export interface EpochInfo {
  /** Current consensus epoch number. An epoch is ~5.5 hours on mainnet during which validator set remains unchanged. */
  epoch: bigint
  /** Whether past the boundary block (last 10% of epoch). false = changes activate epoch n+1, true = epoch n+2 */
  inEpochDelayPeriod: boolean
}
