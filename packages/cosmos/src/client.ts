import {
  StargateClient,
  StargateClientOptions,
  QueryClient,
  setupAuthExtension,
  setupBankExtension,
  setupStakingExtension,
  setupTxExtension,
  setupDistributionExtension,
  AuthExtension,
  BankExtension,
  StakingExtension,
  TxExtension,
  DistributionExtension
} from '@cosmjs/stargate'
import { accountFromAny, Account } from '@cosmjs/stargate'
import { Any } from 'cosmjs-types/google/protobuf/any'
import { TendermintClient, Tendermint37Client, Tendermint34Client } from '@cosmjs/tendermint-rpc'

/** @ignore */
export class CosmosClient extends StargateClient {
  static async create (tmClient: TendermintClient, options: StargateClientOptions): Promise<CosmosClient> {
    return new CosmosClient(tmClient, options)
  }

  // source: @cosmjs/stargate/build/stargateclient.js
  static async connect (endpoint: string, options: StargateClientOptions): Promise<CosmosClient> {
    // Tendermint/CometBFT 0.34/0.37 auto-detection. Starting with 0.37 we seem to get reliable versions again 🎉
    // Using 0.34 as the fallback.
    let tmClient: TendermintClient
    const tm37Client = await Tendermint37Client.connect(endpoint)
    const version = (await tm37Client.status()).nodeInfo.version
    if (version.startsWith('0.37.')) {
      tmClient = tm37Client
    } else {
      tm37Client.disconnect()
      tmClient = await Tendermint34Client.connect(endpoint)
    }
    return CosmosClient.create(tmClient, options)
  }

  // extended with distribution extension
  getCosmosQueryClient (): QueryClient &
    AuthExtension &
    BankExtension &
    StakingExtension &
    TxExtension &
    DistributionExtension {
    const tmClient = this.getTmClient()
    if (!tmClient) {
      throw new Error('Tendermint client not available')
    }

    return QueryClient.withExtensions(
      tmClient,
      setupAuthExtension,
      setupBankExtension,
      setupStakingExtension,
      setupTxExtension,
      setupDistributionExtension
    )
  }
}

export async function newCosmosClient (rpcUrl: string): Promise<CosmosClient> {
  return await CosmosClient.connect(rpcUrl, {
    accountParser: (input: Any): Account => {
      const { typeUrl } = input
      switch (typeUrl) {
        // due to lack of common proto codec that would cover all the types
        // of ethermint/evmos accounts, we pass the info to the caller
        // to resolve the account in custom way
        case '/injective.types.v1beta1.EthAccount':
        case '/ethermint.types.v1.EthAccount': {
          return {
            address: 'ethermint_account',
            pubkey: null,
            accountNumber: 0,
            sequence: 0
          }
        }
        default: {
          return accountFromAny(input)
        }
      }
    }
  })
}
