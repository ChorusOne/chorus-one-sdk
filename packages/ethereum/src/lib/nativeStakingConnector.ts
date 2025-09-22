import { Networks } from './types/networks'
import {
  CreateBatchRequest,
  CreateBatchResponse,
  BatchDetailsResponse,
  ListBatchesResponse
} from './types/nativeStaking'
import { Hex, http, PublicClient, createPublicClient } from 'viem'
import { hoodi, mainnet } from 'viem/chains'

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
  config: {
    depositContractAddress: Hex
    withdrawalContractAddress: Hex
    excessInhibitor: Hex
    compoundingFeeAddition: bigint
    excessWithdrawalRequestsStorageSlot: bigint
    consolidationRequestFeeAddition: bigint
    minConsolidationRequestFee: bigint
  }

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
        this.config = {
          depositContractAddress: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
          withdrawalContractAddress: '0x00000961Ef480Eb55e80D19ad83579A64c007002',
          excessInhibitor: ('0x' + BigInt(2 ** 256 - 1).toString(16)) as Hex,
          compoundingFeeAddition: 3n,
          excessWithdrawalRequestsStorageSlot: 0n,
          consolidationRequestFeeAddition: 17n,
          minConsolidationRequestFee: 1n
        }
        break
      case 'hoodi':
        this.network = 'hoodi'
        this.eth = createPublicClient({
          chain: hoodi,
          transport
        })
        this.config = {
          depositContractAddress: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
          withdrawalContractAddress: '0x00000961Ef480Eb55e80D19ad83579A64c007002',
          excessInhibitor: ('0x' + BigInt(2 ** 256 - 1).toString(16)) as Hex,
          compoundingFeeAddition: 3n,
          excessWithdrawalRequestsStorageSlot: 0n,
          consolidationRequestFeeAddition: 17n,
          minConsolidationRequestFee: 1n
        }
        break
      default:
        throw new Error(`Invalid network passed: ${network}`)
    }
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
    const endpoint = `/ethereum/${this.network}/batches/new`

    return this.apiRequest<CreateBatchResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(params)
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
