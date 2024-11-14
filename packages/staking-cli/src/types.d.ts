import type { NetworkType } from './enums'
import type { CosmosNetworkConfig } from '@chorus-one/cosmos'
import { EthereumNetworkConfig } from '@chorus-one/ethereum'
import type { NearNetworkConfig } from '@chorus-one/near'
import type { AvalancheNetworkConfig } from '@chorus-one/avalanche'
import type { SubstrateNetworkConfig } from '@chorus-one/substrate'
import type { TonNetworkConfig } from '@chorus-one/ton'
import type { SolanaNetworkConfig } from '@chorus-one/solana'
import type { FireblocksSignerConfig } from '@chorus-one/signer-fireblocks'
import type { LocalSignerConfig } from '@chorus-one/signer-local'

interface FireblocksSignerCliConfig extends Omit<FireblocksSignerConfig, 'apiSecretKey' | 'apiKey'> {
  apiSecretKeyPath: string
  apiKeyPath: string
}

interface LocalSignerCliConfig extends Omit<LocalSignerConfig, 'mnemonic'> {
  mnemonicPath: string
}

export interface Config {
  // define validator address to interact with (delegate, undelegate etc)
  validatorAddress: string

  // second validator address, used only for TON Pool
  validatorAddress2?: string

  // define the expected delegator account
  delegatorAddress: string

  // use fireblocks as signer
  fireblocks: FireblocksSignerCliConfig

  // use local signer (used for testing)
  localsigner: LocalSignerCliConfig

  // the network type to interact with
  networkType: NetworkType

  // network specific configuration
  cosmos?: CosmosNetworkConfig
  near?: NearNetworkConfig
  substrate?: SubstrateNetworkConfig
  avalanche?: AvalancheNetworkConfig
  ton?: TonNetworkConfig
  solana?: SolanaNetworkConfig
  ethereum?: EthereumNetworkConfig
}

export interface Journal {
  entries: JournalEntry[]
}

export interface JournalEntry {
  type: string
  timestamp: number
  data: any
}
