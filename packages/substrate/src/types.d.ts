import type { ISignerPayload } from '@polkadot/types/types'
import type { SubmittableExtrinsic } from '@polkadot/api/submittable/types'
import type { ISubmittableResult } from '@polkadot/types/types'
import { RewardDestination } from './enums'

/** @ignore */
export type UnsignedTx = SubmittableExtrinsic<'promise', ISubmittableResult>

/** @ignore */
export interface SubstrateSigningData {
  payload: ISignerPayload
}

/** @ignore */
export interface SubstrateNetworkConfig {
  // e.g. wss://rpc.polkadot.io
  rpcUrl: string

  // the input amount of tokens is multiplied by this value to get the amount
  // in the smallest unit of the token. e.g.
  //  * 1000000000000 for testnet
  //  * 10000000000 for mainnet
  //
  // The default value is fetched from the network itself.
  denomMultiplier?: string

  // Transaction fee
  fee?: SubstrateFee

  // Stash or Controller (likely u want Stash)
  rewardDestination: RewardDestination

  // Substrate nodes expose a limited sed of RPC methods which are often
  // insufficient. For instance there is no way you can get the block number where the extrinsic was included.
  //
  // To overcome this limitation you can provide an indexer object. See implementations under indexer/...
  indexer?: Indexer
}

/** @ignore */
export interface SubstrateFee {
  // The tip, additional payment for the transaction
  // to prioritize it in the block
  //
  // Example: 0.001 (e.g in DOT)
  tip?: string
}

/** @ignore */
export interface SubstrateTxStatus {
  status: 'success' | 'failure' | 'pending' | 'unknown'
  receipt: any | null
}

export interface Indexer {
  getTxStatus(txHash: string): Promise<SubstrateTxStatus>
}
