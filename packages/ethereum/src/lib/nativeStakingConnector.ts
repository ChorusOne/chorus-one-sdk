import { Networks } from './types/networks'
import {
  CreateBatchRequest,
  CreateBatchResponse,
  BatchDetailsResponse,
  ListBatchesResponse
} from './types/nativeStaking'
import { isCompoundingAddress, isStandardAddress } from './utils/addressValidation'
import { http, PublicClient, createPublicClient } from 'viem'
import { hoodi, mainnet } from 'viem/chains'
import { getNetworkConfig, NetworkConfig } from './utils/getNetworkConfig'

/**
 * Connector for interacting with the Native Staking API
 * API documentation: https://native-staking.chorus.one/docs
 * Used for creating and managing validator batches
 * Requires an API token from Chorus One
 * Supports Ethereum mainnet and Hoodi testnet
 */

export class NativeStakingConnector {
  /** Base URL for Native Staking API */
  baseURL: string
  /** API token for authentication */
  apiToken: string
  /** Network name for API endpoints */
  network: 'mainnet' | 'hoodi'
  /** Web3 connector for calling read-only contract methods */
  eth: PublicClient
  /** Configuration parameters */
  config: NetworkConfig

  constructor (network: Networks, apiToken: string, rpcUrl?: string) {
    this.apiToken = apiToken
    this.baseURL = 'https://native-staking.chorus.one'

    const transport = rpcUrl ? http(rpcUrl) : http()

    switch (network) {
      case 'ethereum':
        this.network = 'mainnet'
        this.eth = createPublicClient({
          chain: mainnet,
          transport
        })
        break
      case 'hoodi':
        this.network = 'hoodi'
        this.eth = createPublicClient({
          chain: hoodi,
          transport
        })
        break
      default:
        throw new Error(`Invalid network passed: ${network}`)
    }

    this.config = getNetworkConfig(network)
  }

  /**
   * Makes an authenticated API request to the Native Staking API
   */
  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-TOKEN': this.apiToken,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    // 206 is returned when batch is still processing
    const isValidStatusCode = response.ok || response.status === 206

    if (!isValidStatusCode) {
      const errorText = await response.text()
      throw new Error(`Native Staking API error (${response.status}): ${errorText}`)
    }

    const data = (await response.json()) as T
    return data
  }

  /**
   * Creates a new batch of validators
   */
  async createBatch (params: CreateBatchRequest): Promise<CreateBatchResponse> {
    const isCompounding = params.is_compounding ?? false

    if (isCompounding) {
      if (!isCompoundingAddress(params.withdrawal_address)) {
        throw new Error('Compounding validators require withdrawal address in 0x02 format')
      }
    } else {
      if (!isStandardAddress(params.withdrawal_address)) {
        throw new Error('Non-compounding validators require standard withdrawal address format')
      }
    }

    const requestParams: CreateBatchRequest = {
      batch_id: params.batch_id,
      withdrawal_address: params.withdrawal_address,
      fee_recipient: params.fee_recipient,
      number_of_validators: params.number_of_validators,
      network: params.network,
      is_compounding: isCompounding,
      deposit_gwei_per_validator: params.deposit_gwei_per_validator
    }

    const endpoint = `/ethereum/${this.network}/batches/new`

    return this.apiRequest<CreateBatchResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(requestParams)
    })
  }

  /**
   * Gets detailed information about a validator batch including validator deposit data
   */
  async getBatchDetails (batchId: string): Promise<BatchDetailsResponse> {
    const endpoint = `/ethereum/${this.network}/batches/${batchId}`

    return this.apiRequest<BatchDetailsResponse>(endpoint)
  }

  /**
   * Lists all batches for the authenticated tenant
   */
  async listBatches (): Promise<ListBatchesResponse> {
    const endpoint = `/ethereum/${this.network}/batches`

    return this.apiRequest<ListBatchesResponse>(endpoint)
  }
}
