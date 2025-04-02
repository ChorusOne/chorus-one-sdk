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
import { connectComet, CometClient } from '@cosmjs/tendermint-rpc'

/** @ignore */
export class CosmosClient extends StargateClient {
  static async create (tmClient: CometClient, options: StargateClientOptions): Promise<CosmosClient> {
    return new CosmosClient(tmClient, options)
  }

  // source: @cosmjs/stargate/build/stargateclient.js
  static async connect (endpoint: string, options: StargateClientOptions): Promise<CosmosClient> {
    const tmClient = await connectComet(endpoint)
    return CosmosClient.create(tmClient, options)
  }

  // extended with distribution extension
  getCosmosQueryClient (): QueryClient &
    AuthExtension &
    BankExtension &
    StakingExtension &
    TxExtension &
    DistributionExtension {
    const tmClient = this.getCometClient()
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
