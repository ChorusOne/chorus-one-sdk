import { ApiScanExtrinsicResponse } from './types.subscan'
import { SubstrateTxStatus } from '../types'

/**
 * This class provides the functionality to interact with Subscan Indexer API.
 */
export class SubscanIndexer {
  private network: string
  private headers: Headers

  /**
   * This creates a new SubscanIndexer instance.
   *
   * @param params - Initialization parameters
   * @param params.network - Substrate network name e.g. 'polkadot', 'kusama'
   * @param params.headers - (Optional) HTTP headers to include in requests
   *
   * @returns  An instance of SubscanIndexer.
   */
  constructor (params: { network: string; headers?: Array<Record<string, string>> }) {
    const { network, headers } = params

    this.network = network
    this.headers = new Headers()
    this.headers.append('Content-Type', 'application/json')

    if (headers) {
      headers.forEach((header) => {
        this.headers.append(header.key, header.value)
      })
    }
  }

  async getTxStatus (txHash: string): Promise<SubstrateTxStatus> {
    const raw = JSON.stringify({
      hash: txHash,
      only_extrinsic_event: true
    })

    const options = {
      method: 'POST',
      headers: this.headers,
      body: raw,
      redirect: 'follow' as const
    }

    const response = await fetch(`https://${this.network}.api.subscan.io/api/scan/extrinsic`, options)
    const jsonResponse = (await response.json()) as ApiScanExtrinsicResponse

    if (jsonResponse.code !== undefined && jsonResponse.code !== 0) {
      throw new Error(`Subscan API returned error: ${jsonResponse.message}`)
    }

    if (!jsonResponse.data) {
      return { status: 'unknown', receipt: jsonResponse }
    }

    if (jsonResponse.data.pending) {
      return { status: 'pending', receipt: jsonResponse }
    }

    if (jsonResponse.data.error !== null) {
      return { status: 'failure', receipt: jsonResponse }
    }

    if (jsonResponse.data.success) {
      return { status: 'success', receipt: jsonResponse }
    }

    if (jsonResponse.data.success !== null && !jsonResponse.data.success) {
      return { status: 'failure', receipt: jsonResponse }
    }

    return { status: 'unknown', receipt: jsonResponse }
  }
}
