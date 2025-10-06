import type { Address } from 'viem'

/**
 * Network configuration for connecting to Monad blockchain
 */
export interface MonadNetworkConfig {
  /** RPC endpoint URL */
  rpcUrl: string
  /** Staking contract address */
  contractAddress: Address
}

/**
 * Delegator information for a specific validator
 */
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

/**
 * Withdrawal request information
 */
export interface WithdrawalRequestInfo {
  /** Amount in wei that will be returned when you call withdraw (0 if no request exists) */
  withdrawalAmount: bigint
  /** Validator's accumulator value when undelegate was called (used for reward calculations) */
  accRewardPerToken: bigint
  /** Epoch number when funds become withdrawable. Compare with current epoch to check if ready. */
  withdrawEpoch: bigint
}

/**
 * Current epoch information
 */
export interface EpochInfo {
  /** Current consensus epoch number. An epoch is ~5.5 hours on mainnet during which validator set remains unchanged. */
  epoch: bigint
  /** Whether past the boundary block (last 10% of epoch). false = changes activate epoch n+1, true = epoch n+2 */
  inEpochDelayPeriod: boolean
}

/**
 * Options for building delegate transaction
 */
export interface DelegateOptions {
  /** Unique identifier (uint64) for the validator to delegate to */
  validatorId: number
  /** Amount to delegate in MON (not wei) */
  amount: string
}

/**
 * Options for building compound transaction
 */
export interface CompoundOptions {
  /** Address of the delegator compounding rewards */
  delegatorAddress: Address
  /** Unique identifier for the validator to compound rewards for */
  validatorId: number
}

/**
 * Options for building withdraw transaction
 */
export interface WithdrawOptions {
  /** Address that will receive the withdrawn funds */
  delegatorAddress: Address
  /** Unique identifier for the validator you undelegated from */
  validatorId: number
  /** ID (0-255) assigned when calling undelegate */
  withdrawalId: number
}

/**
 * Options for building claim rewards transaction
 */
export interface ClaimRewardsOptions {
  /** Address that will receive the claimed rewards */
  delegatorAddress: Address
  /** Unique identifier for the validator to claim rewards from */
  validatorId: number
}

/**
 * Options for building undelegate transaction
 */
export interface UndelegateOptions {
  /** Address that will receive funds after withdrawal delay */
  delegatorAddress: Address
  /** Unique identifier for the validator to undelegate from */
  validatorId: number
  /** Amount to undelegate in MON (not wei) */
  amount: string
  /** User-chosen ID (0-255) to track this withdrawal request. Can be reused after calling withdraw(). */
  withdrawalId: number
}
