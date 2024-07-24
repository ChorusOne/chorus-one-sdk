import { Keypair, Transaction, TransactionResponse, Commitment } from '@solana/web3.js'

/** @ignore */
export interface SolanaSigningData {
  tx: SolanaTransaction
}

/** @ignore */
export interface SolanaNetworkConfig {
  // e.g. https://api.testnet.solana.com
  rpcUrl: string

  // The level of commitment desired when querying state (default: 'confirmed')
  // For example when waiting for a transaction status after broadcasting.
  //
  // Options (see [the Solana docs](https://docs.solanalabs.com/consensus/commitments) for more details):
  // * confirmed: Query the most recent block which has reached 1 confirmation by the cluster
  // * finalized: Query the most recent block which has been finalized by the cluster
  // * ... and more
  commitment?: Commitment
}

/** @ignore */
export interface SolanaTransaction {
  tx: Transaction
  additionalKeys?: Keypair[]
}

/** @ignore */
export interface StakeAccount {
  address: string
  amount: number
  state?: 'delegated' | 'undelegated' | 'deactivating'
  validatorAddress?: string
}

/** @ignore */
export interface SolanaTxStatus {
  status: 'success' | 'failure' | 'pending' | 'unknown'
  receipt: TransactionResponse | null
}
