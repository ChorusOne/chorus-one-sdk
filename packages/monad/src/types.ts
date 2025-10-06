import type { Address, Hex } from 'viem'

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
 * Validator information from contract (complete view across all contexts)
 */
export interface ValidatorInfo {
  /** Authorized address for validator operations */
  authAddress: Address
  /** Validator flags (status bits) */
  flags: bigint
  /** Execution stake (upcoming stake pool balance) */
  stake: bigint
  /** Accumulator value for rewards calculation */
  accRewardPerToken: bigint
  /** Commission rate (in 1e18 units, e.g. 10% = 1e17) */
  commission: bigint
  /** Unclaimed rewards */
  unclaimedRewards: bigint
  /** Consensus stake (current active stake) */
  consensusStake: bigint
  /** Consensus commission rate */
  consensusCommission: bigint
  /** Snapshot stake */
  snapshotStake: bigint
  /** Snapshot commission rate */
  snapshotCommission: bigint
  /** SECP256k1 public key used by consensus */
  secpPubKey: Hex
  /** BLS public key used by consensus */
  blsPubKey: Hex
}

/**
 * Delegator information for a specific validator
 */
export interface DelegatorInfo {
  /** Current active stake in wei */
  stake: bigint
  /** Accumulator value (last checked) */
  accRewardPerToken: bigint
  /** Unclaimed rewards in wei */
  unclaimedRewards: bigint
  /** Stake to be activated next epoch */
  deltaStake: bigint
  /** Stake to be activated in 2 epochs */
  nextDeltaStake: bigint
  /** Epoch when deltaStake becomes active */
  deltaEpoch: bigint
  /** Epoch when nextDeltaStake becomes active */
  nextDeltaEpoch: bigint
}

/**
 * Withdrawal request information
 */
export interface WithdrawalRequestInfo {
  /** Amount requested for withdrawal in wei */
  withdrawalAmount: bigint
  /** Validator accumulator when undelegate was called */
  accRewardPerToken: bigint
  /** Epoch when withdrawal becomes available */
  withdrawEpoch: bigint
}

/**
 * Current epoch information
 */
export interface EpochInfo {
  /** Current epoch number */
  epoch: bigint
  /** Whether in epoch delay period (after boundary block) */
  inEpochDelayPeriod: boolean
}

/**
 * Options for building delegate transaction
 */
export interface DelegateOptions {
  /** Validator ID to delegate to */
  validatorId: number
  /** Amount to delegate in MON */
  amount: string
}

/**
 * Options for building compound transaction
 */
export interface CompoundOptions {
  /** Delegator address */
  delegatorAddress: Address
  /** Validator ID to compound rewards for */
  validatorId: number
}

/**
 * Options for building withdraw transaction
 */
export interface WithdrawOptions {
  /** Delegator address */
  delegatorAddress: Address
  /** Validator ID */
  validatorId: number
  /** Withdrawal request ID */
  withdrawalId: number
}

/**
 * Options for building claim rewards transaction
 */
export interface ClaimRewardsOptions {
  /** Delegator address */
  delegatorAddress: Address
  /** Validator ID to claim rewards from */
  validatorId: number
}

/**
 * Options for building undelegate transaction
 */
export interface UndelegateOptions {
  /** Delegator address */
  delegatorAddress: Address
  /** Validator ID to undelegate from */
  validatorId: number
  /** Amount to undelegate in MON */
  amount: string
  /** Withdrawal request ID (1-255, cannot be 0) */
  withdrawalId: number
}
