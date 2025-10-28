import type { Address, Hex } from 'viem'

/** @ignore */
export type HyperliquidChain = 'Mainnet' | 'Testnet'

/** @ignore */
export const ActionType = {
  C_DEPOSIT: 'cDeposit',
  C_WITHDRAW: 'cWithdraw',
  TOKEN_DELEGATE: 'tokenDelegate'
} as const

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
  type: typeof ActionType.C_DEPOSIT
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
  type: typeof ActionType.C_WITHDRAW
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
  type: typeof ActionType.TOKEN_DELEGATE
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
