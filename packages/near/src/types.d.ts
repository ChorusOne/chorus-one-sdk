import { transactions } from 'near-api-js'
import type { FinalExecutionOutcome } from '@near-js/types'

/** @ignore */
export interface NearSigningData {
  tx: transactions.Transaction
}

/** @ignore */
export interface NearNetworkConfig {
  // e.g https://rpc.testnet.near.org
  rpcUrl: string

  // The targeted network (e.g., `mainnet`, `testnet, `betanet`, etc.)
  networkId: string

  // Amount of gas to be sent with the function calls. Used to pay for the fees
  // incurred while running the contract execution
  //
  // If undefined the gas defaults to library default ("30000000000000" yoctoNEAR).
  gas?: string

  // Multiplier to convert the base coin unit to its smallest
  // subunit (e.g., `10^24` for 1 NEAR = 1000000000000000000000000 yoctoNear)
  //
  // If undefined, the default value is `10^24` (yoctoNear)
  denomMultiplier?: string

  // NEAR accounts are either human readable names (e.g. `alice.near`)
  // or hexadecimal public keys.
  //
  // Some wallets may not support the human readable names and require
  // prior resolution to the public key. For instance:
  // 1. @chorus-one/local-signer requires the public key
  // 2. @chorus-one/fireblocks-signer requires public key
  // 3. WebWallet may require the human readable name
  //
  // You should enable this option if your signer requires
  // the public key but you only have the human readable name.
  //
  // @default true
  resolveAddress?: boolean
}

export interface NearAccessKey {
  public_key: string
  access_key: {
    nonce: number
    permission:
      | 'FullAccess'
      | {
          FunctionCall: {
            receiver_id: string
          }
        }
  }
}

export interface NearAccessKeysResponse {
  keys: NearAccessKey[]
}

/** @ignore */
export interface NearTxStatus {
  status: 'success' | 'failure' | 'pending' | 'unknown'
  receipt: FinalExecutionOutcome | null
}
