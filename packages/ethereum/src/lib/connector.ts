import { createPublicClient, PublicClient, http, Hex, Chain } from 'viem'
import { hoodi, mainnet } from 'viem/chains'
import { Networks } from './types/networks'

// Represents a single request to a graphql backend
export interface GraphQLRequest {
  type: 'api' | 'graph'
  op: string
  query: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables: any
}

// Connector abstraction, providing on-chain and GraphQL API primitives
export class StakewiseConnector {
  chain: Chain
  /** Base URL for Stakewise main graph API */
  baseAPI: string
  /** Base URL for Stakewise subgraph */
  baseGraph: string
  /** Web3 connector for calling read-only contract methods */
  eth: PublicClient
  /** Stakewise keeper contract address */
  keeper: Hex
  /** Stakewise price oracle contract address */
  priceOracle: Hex
  /** Stakewise mint token config contract address */
  mintTokenConfig: Hex
  /** Stakewise mint token controller contract address */
  mintTokenController: Hex

  constructor (network: Networks, rpcUrl?: string) {
    // These parameters might need to be changed for Gnosis and Mainnet
    const transport = rpcUrl ? http(rpcUrl) : http()
    switch (network) {
      case 'hoodi':
        this.chain = hoodi
        this.eth = createPublicClient({
          chain: hoodi,
          transport
        })

        this.baseAPI = 'https://hoodi-api.stakewise.io/graphql'
        this.baseGraph = 'https://graphs.stakewise.io/hoodi/subgraphs/name/stakewise/prod'
        // Reference: https://docs.stakewise.io/for-developers/networks/hoodi
        this.keeper = '0xA7D1Ac9D6F32B404C75626874BA56f7654c1dC0f'
        this.priceOracle = '0xe8a222D887b468a71Ee8a27df4fa3b886A4B7BA1'
        this.mintTokenConfig = '0x5b817621EBE00622b9a71b53c942b392751c8197'
        this.mintTokenController = '0x140Fc69Eabd77fFF91d9852B612B2323256f7Ac1'
        break
      case 'ethereum':
        this.chain = mainnet
        this.eth = createPublicClient({
          chain: mainnet,
          transport
        })

        this.baseAPI = 'https://mainnet-api.stakewise.io/graphql'
        this.baseGraph = 'https://graphs.stakewise.io/mainnet-b/subgraphs/name/stakewise/prod'
        // Reference: https://docs.stakewise.io/for-developers/networks/mainnet
        this.keeper = '0x6B5815467da09DaA7DC83Db21c9239d98Bb487b5'
        this.priceOracle = '0x8023518b2192FB5384DAdc596765B3dD1cdFe471'
        this.mintTokenConfig = '0xE8822246F8864DA92015813A39ae776087Fb1Cd5'
        this.mintTokenController = '0x2A261e60FB14586B474C208b1B7AC6D0f5000306'
        break
      default:
        throw new Error(`Invalid network passed: ${network}`)
    }
  }

  // Perform graphQL request
  graphqlRequest = async (request: GraphQLRequest): Promise<{ data: any }> => {
    const body: string = JSON.stringify({
      operationName: request.op,
      query: request.query.trim(),
      variables: request.variables
    })

    const params: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: '*/*'
      },
      body
    }
    let uri: string

    switch (request.type) {
      case 'api':
        uri = this.baseAPI
        break
      case 'graph':
        uri = this.baseGraph
        break
      default:
        throw new Error(`Invalid request type: ${request.type}`)
    }

    const endpoint = `${uri}?opName=${request.op}`
    const response = await fetch(endpoint, params)
    if (!response.ok) {
      throw new Error(`Invalid response from Stakewise. Endpoint: ${endpoint}`)
    }
    const responseData = await response.json()
    if (typeof responseData !== 'object' || responseData === null) {
      throw new Error('Invalid response from Stakewise')
    }
    if (
      'errors' in responseData &&
      responseData.errors &&
      Array.isArray(responseData.errors) &&
      responseData.errors.length
    ) {
      throw new Error(responseData.errors[0].message)
    }
    if (!('data' in responseData) || typeof responseData.data !== 'object' || !responseData.data) {
      throw new Error('Response from Stakewise is missing data')
    }
    return responseData
  }
}
