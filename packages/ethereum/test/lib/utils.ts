import { CHORUS_ONE_ETHEREUM_VALIDATORS, EthereumStaker } from '@chorus-one/ethereum'
import { createWalletClient, http, createPublicClient, Hex, formatEther, PublicClient, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hardhat } from 'viem/chains'
import { getConfig } from './getConfig'
import { assert } from 'chai'
import { NativeStakingConnector } from '../../src/lib/nativeStakingConnector'
import { Networks } from '../../src/lib/types/networks'
import { CreateBatchResponse, BatchDetailsResponse, ListBatchesResponse } from '../../src/lib/types/nativeStaking'
import { use, spy } from 'chai'
import spies from 'chai-spies'

use(spies)

export interface TestConfig {
  network?: Networks
  apiToken?: string
  mockResponses?: MockResponses
  useRealFetch?: boolean
}

export interface TestSetup {
  validatorAddress: Hex
  walletClient: WalletClient
  publicClient: PublicClient
  staker: EthereumStaker
  osEthTokenAddress: Hex
  network: string
  nativeStakingConnector?: NativeStakingConnector
  cleanup: () => void
}

export const prepareTests = async () => {
  const config = getConfig()
  const privateKey = config.accounts[0].privateKey as Hex
  const account = privateKeyToAccount(privateKey)
  if (!account) throw new Error('Account not found')
  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http()
  })
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http()
  })
  const staker = new EthereumStaker({
    network: config.networkConfig.name,
    rpcUrl: hardhat.rpcUrls.default.http[0]
  })
  await staker.init()

  return {
    validatorAddress: CHORUS_ONE_ETHEREUM_VALIDATORS[config.networkConfig.name].mevMaxVault,
    walletClient,
    publicClient,
    staker,
    osEthTokenAddress: config.networkConfig.addresses.osEthToken,
    network: config.network
  }
}

export const stake = async ({
  delegatorAddress,
  validatorAddress,
  referrer,
  amountToStake,
  staker,
  walletClient,
  publicClient
}: {
  delegatorAddress: Hex
  validatorAddress: Hex
  referrer?: Hex
  amountToStake: bigint
  staker: EthereumStaker
  walletClient: WalletClient
  publicClient: PublicClient
}) => {
  const { tx } = await staker.buildStakeTx({
    delegatorAddress,
    validatorAddress,
    amount: formatEther(amountToStake),
    referrer
  })

  const request = await walletClient.prepareTransactionRequest({
    ...tx,
    chain: undefined
  })

  const hash = await walletClient.sendTransaction({
    ...request,
    account: delegatorAddress
  })

  const receipt = await publicClient.getTransactionReceipt({ hash })
  assert.equal(receipt.status, 'success')
}

export const mint = async ({
  delegatorAddress,
  validatorAddress,
  amountToMint,
  staker,
  walletClient,
  publicClient
}: {
  delegatorAddress: Hex
  validatorAddress: Hex
  amountToMint: bigint
  staker: EthereumStaker
  walletClient: WalletClient
  publicClient: PublicClient
}) => {
  const { tx } = await staker.buildMintTx({
    delegatorAddress,
    validatorAddress,
    amount: formatEther(amountToMint)
  })

  const request = await walletClient.prepareTransactionRequest({
    ...tx,
    chain: undefined
  })
  const hash = await walletClient.sendTransaction({
    ...request,
    account: delegatorAddress
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  assert.equal(receipt.status, 'success')
}

type MockResponses = {
  createBatch?: CreateBatchResponse
  getBatchStatus?: BatchDetailsResponse
  listBatches?: ListBatchesResponse
}

export const setupNativeStakingConnector = ({
  network = 'ethereum',
  apiToken = 'test-token',
  mockResponses = {},
  useRealFetch = false
}: {
  network?: Networks
  apiToken?: string
  mockResponses?: MockResponses
  useRealFetch?: boolean
}) => {
  const connector = new NativeStakingConnector(network, apiToken)
  let fetchSpy: any = null

  if (!useRealFetch) {
    const originalFetch = global.fetch
    fetchSpy = spy.on(global, 'fetch', async (url: string, options: RequestInit = {}) => {
      if (url.includes('https://native-staking.chorus.one')) {
        const method = options.method || 'GET'

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

      return originalFetch(url, options)
    })
  }

  return { connector, fetchSpy }
}

export const setupTestEnvironment = async (config: TestConfig = {}): Promise<TestSetup> => {
  const baseSetup = await prepareTests()
  const spies: any[] = []

  let nativeStakingConnector: NativeStakingConnector | undefined

  if (config.apiToken) {
    const { connector, fetchSpy } = setupNativeStakingConnector({
      network: config.network,
      apiToken: config.apiToken,
      mockResponses: config.mockResponses,
      useRealFetch: config.useRealFetch
    })
    nativeStakingConnector = connector
    if (fetchSpy) spies.push(fetchSpy)
  }

  const cleanup = () => {
    spies.forEach((spyInstance) => {
      if (spyInstance) {
        spy.restore(spyInstance)
      }
    })
    spy.restore()
  }

  return {
    ...baseSetup,
    nativeStakingConnector,
    cleanup
  }
}
