import { NativeStakingConnector } from '../../src/lib/nativeStakingConnector'
import { Networks } from '../../src/lib/types/networks'
import { CreateBatchResponse, BatchDetailsResponse, ListBatchesResponse } from '../../src/lib/types/nativeStaking'
import { use, spy } from 'chai'
import spies from 'chai-spies'

// Enable chai-spies plugin
use(spies)

type MockResponses = {
  createBatch?: CreateBatchResponse
  getBatchStatus?: BatchDetailsResponse
  listBatches?: ListBatchesResponse
}

/**
 * Sets up a NativeStakingConnector instance with mocked fetch responses for testing
 */
export const setupNativeStakingConnector = ({
  network = 'ethereum',
  apiToken = 'test-token',
  mockResponses = {}
}: {
  network?: Networks
  apiToken?: string
  mockResponses?: MockResponses
}) => {
  const connector = new NativeStakingConnector(network, apiToken)

  const originalFetch = global.fetch
  spy.on(global, 'fetch', async (url: string, options: RequestInit = {}) => {
    if (url.includes('https://native-staking.chorus.one')) {
      const method = options.method || 'GET'

      // POST /batches/new - Create batch
      if (method === 'POST' && url.endsWith('/batches/new')) {
        const mock = mockResponses.createBatch || {
          data: {
            batch_id: 'test-batch-id',
            message: 'Batch test-batch-id created successfully'
          }
        }
        return new Response(JSON.stringify(mock), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // GET /batches/{batchId} - Get batch status
      if (method === 'GET' && url.includes('/batches/')) {
        const mock = mockResponses.getBatchStatus || {
          data: {
            validators: [],
            status: 'ready',
            created: new Date().toISOString(),
            is_compounding: false,
            deposit_gwei_per_validator: 32000000000
          }
        }
        return new Response(JSON.stringify(mock), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // GET /batches - List all batches
      if (method === 'GET' && url.endsWith('/batches')) {
        const mock = mockResponses.listBatches || {
          data: { requests: [] }
        }
        return new Response(JSON.stringify(mock), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return new Response('Not Found', { status: 404 })
    }

    // For any other URLs, call the original fetch
    return originalFetch(url, options)
  })

  return connector
}
