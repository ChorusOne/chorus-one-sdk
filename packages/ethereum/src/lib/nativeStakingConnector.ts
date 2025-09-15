import { createPublicClient, PublicClient, http, Hex, Chain } from 'viem'
import { hoodi, mainnet } from 'viem/chains'
import { Networks } from './types/networks'
import { CreateBatchRequest, CreateBatchResponse, BatchStatusResponse, ValidatorBatch } from './types/nativeStaking'

export class NativeStakingConnector {
  /** Base URL for Native Staking API */
  baseURL: string
  /** API token for authentication */
  apiToken: string
  /** Network name for API endpoints */
  network: string
  /** Web3 connector for deposit contract interactions */
  eth: PublicClient
  /** Ethereum chain configuration */
  chain: Chain
  /** Deposit contract address */
  depositContractAddress: Hex

  constructor (network: Networks, apiToken: string, rpcUrl?: string) {
    this.apiToken = apiToken
    this.baseURL = 'https://native-staking.chorus.one'

    const transport = rpcUrl ? http(rpcUrl) : http()

    switch (network) {
      case 'ethereum':
        this.network = 'mainnet'
        this.chain = mainnet
        this.eth = createPublicClient({
          chain: mainnet,
          transport
        })
        // Official Ethereum Deposit Contract
        this.depositContractAddress = '0x00000000219ab540356cBB839Cbe05303d7705Fa'
        break
      case 'hoodi':
        this.network = 'hoodi'
        this.chain = hoodi
        this.eth = createPublicClient({
          chain: hoodi,
          transport
        })
        this.depositContractAddress = '0x00000000219ab540356cBB839Cbe05303d7705Fa'
        break
      default:
        throw new Error(`Invalid network passed: ${network}`)
    }
  }

  /**
   * Makes an authenticated API request to the Native Staking API
   */
  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T & { statusCode?: number }> {
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
    return { ...data, statusCode: response.status } as T & { statusCode?: number }
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
   * Gets the status of a validator batch
   */
  async getBatchStatus (batchId: string, epoch?: string): Promise<BatchStatusResponse> {
    const queryParams = epoch ? `?epoch=${epoch}` : ''
    const endpoint = `/ethereum/${this.network}/batches/${batchId}${queryParams}`

    return this.apiRequest<BatchStatusResponse>(endpoint)
  }

  /**
   * Lists all batches for the authenticated tenant
   */
  async listBatches (): Promise<{ batches: ValidatorBatch[] }> {
    const endpoint = `/ethereum/${this.network}/batches`

    return this.apiRequest<{ batches: ValidatorBatch[] }>(endpoint)
  }
}
