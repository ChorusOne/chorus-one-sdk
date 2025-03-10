import { Cell, StateInit, Transaction, MessageRelaxed } from '@ton/ton'

/** @ignore */
export interface TonSigningData {
  // unsigned transaction in human readable format
  tx: UnsignedTx

  // unsigned transaction as a Cell
  txCell: Cell

  // unsigned transaction arguments
  txArgs: {
    seqno: number
    sendMode: number
    walletId: number
    messages: MessageRelaxed[]
    stateInit?: StateInit
    timeout?: number
  }
}

/** @ignore */
export interface TonNetworkConfig {
  // e.g "https://testnet.toncenter.com/api/v2/jsonRPC"
  rpcUrl: string

  // If enabled, the wallet contract is deployed automatically if it does not exist
  // The wallet initialization is appended to any transaction that user broadcasts to the network
  //
  // For explicit behavior, set this flag to false and deploy the wallet contract manually via `TonStaker.buildDeployWalletTx` method
  allowSeamlessWalletDeployment?: boolean

  // DANGEROUS: The staker (by default) allows transfers up to 5 TON to inactive accounts
  // in non-bounceable mode, to allow the walllet contract deployment
  //
  // Enable this flag to allow transfers of ANY amount to inactive accounts
  allowTransferToInactiveAccount?: boolean

  // The amount of TON to keep in the wallet. If the transaction would reduce the balance below this value, it is rejected
  // This is TonStaker feature (not onchain) to prevent the wallet from being depleted
  minimumExistentialBalance?: string

  // TON addresses derivation configuration
  addressDerivationConfig?: AddressDerivationConfig
}

// reference https://github.com/ton-blockchain/nominator-pool/blob/main/func/pool.fc#L692
export interface NominatorInfo {
  address: string
  amount: string
  pending_deposit_amount: string
  withdraw_requested: string
}

// reference https://github.com/ton-blockchain/nominator-pool/blob/main/func/pool.fc#L180
export interface PoolData {
  nominators_count: number
  max_nominators_count: number
  min_nominator_stake: bigint
}

// reference: https://github.com/ton-core/ton/blob/55c576dfc5976e1881180ee271ba8ec62d3f13d4/src/elector/ElectorContract.ts#L70C11-L70C27
export interface Election {
  id: number
  unfreezeAt: number
  stakeHeld: number
  validatorSetHash: bigint
  totalStake: bigint
  bonuses: bigint
  frozen: Map<string, FrozenSet>
}

export interface FrozenSet {
  address: Address
  weight: bigint
  stake: bigint
}

export interface PoolStatus {
  balance: bigint
  balanceSent: bigint
  balancePendingDeposits: bigint
  balancePendingWithdrawals: bigint
  balanceWithdraw: bigint
}

export interface GetPoolAddressForStakeResponse {
  selectedPoolAddress: string
  minStake: bigint
  poolStakes: [biginy, bigint]
}

export interface AddressDerivationConfig {
  walletContractVersion: number
  workchain: number
  bounceable: boolean
  testOnly: boolean
  urlSafe: boolean
  isBIP39: boolean
}

export interface Message {
  // destination address
  address: string

  // amount in nano tokens
  amount: bigint

  // bounce flag
  bounceable: boolean

  // contract specific data to be included in the transaction
  stateInit?: StateInit

  // contract specific data to be included in the transaction
  payload?: Cell | string
}

export declare interface UnsignedTx {
  // messages to send
  messages?: Message[]

  // transaction deadline in unix epoch seconds
  validUntil?: number
}

export declare interface SignedTx {
  // signed transaction
  tx: Cell

  // transaction hash in hex (from BOC)
  txHash: string

  // signer address
  address: string

  // contract specific data to be included in the external message
  stateInit?: StateInit
}

/** @ignore */
export interface TonTxStatus {
  status: 'success' | 'failure' | 'pending' | 'unknown'
  receipt: Transaction | null
  reason?:
    | 'out_of_storage'
    | 'aborted'
    | 'compute_phase'
    | 'action_phase'
    | 'bounce_phase'
    | 'withdraw_below_minimum_stake'
}
