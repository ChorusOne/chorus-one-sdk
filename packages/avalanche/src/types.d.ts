import type { UnsignedTx } from '@avalabs/avalanchejs'
import { pvm, evm } from '@avalabs/avalanchejs'

/** @ignore */
export interface AvalancheSigningData {
  tx: UnsignedTx
}

/** @ignore */
export interface AvalancheNetworkConfig {
  // e.g https://api.avax.network"
  rpcUrl: string

  // HRP - A Human-Readable Part also known as the Bech32 prefix for addresses on the network (default: "avax")
  hrp?: string

  // asset ID used for transactions (e.g staking)
  //
  // If empty, the value is resolved from network
  asset?: AvalancheAsset

  // The fee used to pay for the transaction processing
  // expressed in lowest denominator e.g. nAVAX (1e9 nAVAX = 1 AVAX)
  //
  // For more information see: https://docs.avax.network/reference/standards/guides/txn-fees#c-chain-fees
  //
  // If empty, the value is fetched from the network
  fee?: AvalancheFee

  // the input amount of tokens is multiplied by this value to get the amount
  // in the smallest unit of the token. e.g. nAVAX
  //
  // If empty, the default value is "1000000000" nAVAX (equivalent of 1 AVAX)
  denomMultiplier?: string
}

/** @ignore */
export type AvalancheAddressSet = {
  // C-Chain address e.g. 0x1234...
  cAddr: string

  // P-Chain address e.g. P-avax1...
  pAddr: string

  // X-Chain address e.g. X-avax1...
  xAddr: string

  // C-Chain address in native formatting e.g. C-avax1...
  coreEthAddr: string
}

export interface AvalancheFee {
  // base fee for X and P chains
  // e.g. "1000000" nAVAX (equivalent of 0.001 AVAX)
  //
  // If empty, the value is fetched from the network
  baseTxFee?: string

  // base fee for C chain
  //
  // Avalanche C-Chain uses a dynamic fee structure based on the congestion,
  // however this enables you to override the network established base fee
  //
  // e.g "25000000000" is equivalent to 25 nAVAX (Gwei)
  //
  // If empty, the value is fetched from the network
  evmBaseTxFee?: string
}

/** @ignore */
export interface AvalancheAsset {
  // Asset ID e.g. "2QYXtJnueb7v7k5jYv3JhKk7Z9f5z1nZb7v7k5jYv3JhKk7Z9f5z1nZ" for mainnet AVAX
  assetId: string

  // Asset symbol e.g. AVAX
  assetDescription: string
}

/** @ignore */
export interface AvalancheTxStatus {
  status: 'success' | 'failure' | 'pending' | 'unknown'
  receipt: pvm.GetTxStatusResponse | evm.GetAtomicTxStatusResponse | string | null
}
