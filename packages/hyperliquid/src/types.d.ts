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
  action: DepositToStakingAction | WithdrawFromStakingAction | DelegateAction | SpotSendAction
  /** Chain ID for EIP-712 domain */
  chainId: string
}

// Exchange Endpoint Request Types
/** @ignore */
export interface ExchangeRequest {
  /** The staking action to perform */
  action: DepositToStakingAction | WithdrawFromStakingAction | DelegateAction | SpotSendAction
  /** Timestamp in milliseconds (used as nonce) */
  nonce: number
  /** EIP-712 signature */
  signature: SignatureData
  /** Optional vault address for vault operations */
  vaultAddress?: string
}

// ===== Bridge Types =====

/** @ignore */
export const BridgeActionType = {
  SPOT_SEND: 'spotSend'
} as const

/**
 * SpotSend action for sending tokens on HyperCore
 * Used for bridging Core → EVM by sending to system addresses
 */
export interface SpotSendAction {
  /** Action type identifier */
  type: typeof BridgeActionType.SPOT_SEND
  /** Hyperliquid chain environment */
  hyperliquidChain: HyperliquidChain
  /** Chain identifier in hexadecimal format */
  signatureChainId: Hex
  /** Token index (-1 for HYPE, 1 for PURR, etc.) */
  token: number
  /** Amount in token's wei decimals (not always 18) */
  amount: string
  /** Destination address */
  destination: Address
  /** Current timestamp in milliseconds */
  nonce: number
}

/**
 * Result from a successful bridge operation
 */
export interface BridgeResult {
  /** Transaction hash from the source chain */
  txHash: string
  /** Amount bridged (in human-readable format) */
  amount: string
  /** Token name (e.g., "HYPE", "PURR") */
  token: string
  /** Direction of the bridge */
  direction: 'Core→EVM' | 'EVM→Core'
  /** Expected amount on destination (may differ due to decimal rounding) */
  expectedDestinationAmount?: string
}

// ===== EVM Staking Types =====

/**
 * CoreWriter action IDs as defined in HyperEVM documentation
 * https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore
 */
export const CoreWriterActionId = {
  TOKEN_DELEGATE: 3,
  STAKING_DEPOSIT: 4,
  STAKING_WITHDRAW: 5,
  SPOT_SEND: 6
} as const

// ===== EVM Precompile Return Types =====

/**
 * Raw return type from spotBalance precompile (0x801)
 * Values are in uint64 wei format
 */
export interface EvmSpotBalance {
  /** Total balance in wei (uint64) */
  total: bigint
  /** Amount on hold in wei (uint64) */
  hold: bigint
  /** Entry notional value in wei (uint64) */
  entryNtl: bigint
}

/**
 * Raw return type from delegatorSummary precompile (0x805)
 * Values are in uint64 wei format
 */
export interface EvmDelegatorSummary {
  /** Total amount delegated to validators in wei (uint64) */
  delegated: bigint
  /** Undelegated staking balance available for withdrawal in wei (uint64) */
  undelegated: bigint
  /** Total amount in pending withdrawal queue in wei (uint64) */
  totalPendingWithdrawal: bigint
  /** Number of pending withdrawals (uint64) */
  nPendingWithdrawals: bigint
}
