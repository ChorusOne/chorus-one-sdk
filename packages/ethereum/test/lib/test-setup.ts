import { NativeStakingConnector } from '../../src/lib/nativeStakingConnector'
import { Networks } from '../../src/lib/types/networks'
import { CreateBatchResponse, BatchStatusResponse, ValidatorBatch } from '../../src/lib/types/nativeStaking'
import { use, spy } from 'chai'
import spies from 'chai-spies'

// Enable chai-spies plugin
use(spies)

type MockResponse<T> = {
  data: T
  status?: number
}

type MockResponses = {
  createBatch?: MockResponse<CreateBatchResponse>
  getBatchStatus?: MockResponse<BatchStatusResponse>
  listBatches?: MockResponse<{ batches: ValidatorBatch[] }>
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
  // Use a dummy RPC URL since we're only testing API calls, not on-chain interactions
  const connector = new NativeStakingConnector(network, apiToken, 'https://dummy-rpc-url.test')

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
          },
          status: 200
        }
        return new Response(JSON.stringify(mock.data), {
          status: mock.status || 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // GET /batches/{batchId} - Get batch status
      if (method === 'GET' && url.includes('/batches/')) {
        const mock = mockResponses.getBatchStatus || {
          data: {
            batch_id: 'test-batch-id',
            status: 'ready',
            validators: [],
            statusCode: 200
          },
          status: 200
        }
        // For getBatchStatus, also add statusCode to the response data
        const responseData = { ...mock.data, statusCode: mock.status || 200 }
        return new Response(JSON.stringify(responseData), {
          status: mock.status || 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // GET /batches - List all batches
      if (method === 'GET' && url.endsWith('/batches')) {
        const mock = mockResponses.listBatches || {
          data: { batches: [] },
          status: 200
        }
        return new Response(JSON.stringify(mock.data), {
          status: mock.status || 200,
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
