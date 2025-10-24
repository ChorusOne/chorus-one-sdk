import type { Address, Hex } from 'viem'

/** @ignore */
export type HyperliquidChain = 'Mainnet' | 'Testnet'

/** @ignore */
export interface SignatureData {
  /** EIP-712 signature r component */
  r: Hex
  /** EIP-712 signature s component */
  s: Hex
  /** EIP-712 signature v component */
  v: number
}

/** @ignore */
export interface DepositToStakingAction {
  /** Action type identifier */
  type: 'cDeposit'
  /** Hyperliquid chain environment */
  hyperliquidChain: HyperliquidChain
  /** Chain identifier in hexadecimal format */
  signatureChainId: Hex
  /** Amount of native token in wei to transfer to staking */
  wei: number
  /** Current timestamp in milliseconds (must match outer nonce) */
  nonce: number
}

/** @ignore */
export interface WithdrawFromStakingAction {
  /** Action type identifier */
  type: 'cWithdraw'
  /** Hyperliquid chain environment */
  hyperliquidChain: HyperliquidChain
  /** Chain identifier in hexadecimal format */
  signatureChainId: Hex
  /** Amount of native token in wei to transfer from staking (goes through 7 day unstaking queue) */
  wei: number
  /** Current timestamp in milliseconds (must match outer nonce) */
  nonce: number
}

/** @ignore */
export interface DelegateAction {
  /** Action type identifier */
  type: 'tokenDelegate'
  /** Hyperliquid chain environment */
  hyperliquidChain: HyperliquidChain
  /** Chain identifier in hexadecimal format */
  signatureChainId: Hex
  /** Validator address in 42-character hexadecimal format */
  validator: Address
  /** Whether this is an undelegation (true) or delegation (false) */
  isUndelegate: boolean
  /** Amount of native token in wei to delegate/undelegate. Note: delegations have 1 day lockup */
  wei: number
  /** Current timestamp in milliseconds (must match outer nonce) */
  nonce: number
}

/** @ignore */
export type StakingAction = DepositToStakingAction | WithdrawFromStakingAction | DelegateAction

/** @ignore */
export interface StakingRequest {
  /** The staking action to perform */
  action: StakingAction
  /** Timestamp in milliseconds (recommended to use current time) */
  nonce: number
  /** EIP-712 signature data */
  signature: SignatureData
}

/** @ignore */
export interface StakingResponse {
  /** Response status */
  status: 'ok' | 'error'
  /** Response data */
  response: {
    /** Response type */
    type: 'default'
  }
}

/** @ignore */
export interface DelegationInfo {
  /** Validator address delegated to */
  validator: Address
  /** Amount of native token delegated (in wei) */
  amount: bigint
  /** Timestamp when delegation becomes active or can be withdrawn */
  lockupEnd: bigint
}

/** @ignore */
export interface StakingInfo {
  /** Total amount in staking balance (in wei) */
  stakingBalance: bigint
  /** List of active delegations */
  delegations: DelegationInfo[]
  /** Amount currently in unstaking queue (in wei) */
  unstakingAmount: bigint
  /** Timestamp when unstaking completes (7 days from unstake request) */
  unstakingCompleteAt: bigint
}

// Info Endpoint Request Types
/** @ignore */
export interface DelegatorSummaryRequest {
  type: 'delegatorSummary'
  user: string
}

/** @ignore */
export interface DelegationsRequest {
  type: 'delegations'
  user: string
}

/** @ignore */
export interface DelegatorRewardsRequest {
  type: 'delegatorRewards'
  user: string
}

/** @ignore */
export interface DelegatorHistoryRequest {
  type: 'delegatorHistory'
  user: string
}

/** @ignore */
export interface SpotBalancesRequest {
  type: 'spotClearinghouseState'
  user: string
}

// Info Endpoint Response Types
/** @ignore */
export interface DelegatorSummary {
  /** Total amount delegated to validators (as string with 8 decimals) */
  delegated: string
  /** Amount available for delegation (as string with 8 decimals) */
  undelegated: string
  /** Total amount in pending withdrawals (as string with 8 decimals) */
  totalPendingWithdrawal: string
  /** Number of pending withdrawal requests */
  nPendingWithdrawals: number
}

/** @ignore */
export interface Delegation {
  /** Validator address */
  validator: string
  /** Delegated amount (as string with 8 decimals) */
  amount: string
  /** Unix timestamp when delegation lock expires */
  lockedUntilTimestamp: number
}

/** @ignore */
export interface StakingReward {
  /** Unix timestamp of reward */
  time: number
  /** Source of reward (delegation rewards or commission) */
  source: 'delegation' | 'commission'
  /** Total reward amount (as string with 8 decimals) */
  totalAmount: string
}

/** @ignore */
export type DelegatorHistoryDelta =
  | {
      delegate: {
        validator: `0x${string}`
        amount: string
        isUndelegate: boolean
      }
    }
  | { cDeposit: { amount: string } }
  | { withdrawal: { amount: string; phase: string } }

/** @ignore */
export interface DelegationHistoryEvent {
  /** Unix timestamp of event */
  time: number
  /** Transaction hash */
  hash: string
  /** Changes made by this event */
  delta: DelegationHistoryDelta
}

/** @ignore */
export interface SpotBalance {
  /** Asset identifier (e.g., "USDC", "HYPE") */
  coin: string
  /** Token index */
  token: number
  /** Total balance available (as string with decimals) */
  total: string
  /** Amount reserved for open orders (as string with decimals) */
  hold: string
  /** Entry notional value (as string with decimals) */
  entryNtl: string
}

// Unsigned Transaction Type
/** @ignore */
export interface UnsignedTx {
  /** The action to be signed */
  action: DepositToStakingAction | WithdrawFromStakingAction | DelegateAction
  /** Chain ID for EIP-712 domain */
  chainId: string
}

// Exchange Endpoint Request Types
/** @ignore */
export interface ExchangeRequest {
  /** The staking action to perform */
  action: DepositToStakingAction | WithdrawFromStakingAction | DelegateAction
  /** Timestamp in milliseconds (used as nonce) */
  nonce: number
  /** EIP-712 signature */
  signature: SignatureData
  /** Optional vault address for vault operations */
  vaultAddress?: string
}
