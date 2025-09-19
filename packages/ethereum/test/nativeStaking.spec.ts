import { EthereumStaker } from '@chorus-one/ethereum'
import { assert } from 'chai'
import { setupTestEnvironment, setupNativeStakingConnector, TestConfig } from './lib/utils'
import { Hex } from 'viem'
import {
  BatchValidators,
  CreateBatchResponse,
  ListBatchesResponse,
  BatchDetailsResponse,
  BatchDetailsDepositData,
  BatchDetailsValidator,
  ValidatorExitMessage
} from '../src/lib/types/nativeStaking'

const mockValidatorDepositData: BatchDetailsDepositData = {
  amount: 32000000000,
  deposit_cli_version: '2.7.0',
  deposit_data_root: '2a25f626e6b017355a866fca99d2d4b2b2dc84fd5eaf8b21b3b5f3e27b68d98d',
  deposit_message_root: '97a32e1a21bd89ccbe6c4e323e6ecdce540a9c80d607778e559425b1138941dd',
  fork_version: '10000910',
  network_name: 'hoodi',
  pubkey: '123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef12',
  signature:
    'abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef12',
  withdrawal_credentials: '010000000000000000000000742d35cc6634c0532925a3b8d456a2ef7e2b4800'
}
describe.only('EthereumStaker.native_staking', () => {
  let staker: EthereumStaker
  let cleanup: () => void
  const batchId: string = 'test-batch-id'
  const withdrawalAddress = '0x742d35Cc6634C0532925a3b8D456A2Ef7e2B4800' as Hex
  const feeRecipientAddress = '0x742d35Cc6634C0532925a3b8D456A2Ef7e2B4800' as Hex
  const numberOfValidators = 1

  const mockValidator: BatchDetailsValidator = {
    deposit_data: mockValidatorDepositData,
    status: 'created' as const,
    exit_message: null
  }

  beforeEach(async () => {
    const testConfig: TestConfig = {
      network: 'hoodi',
      apiToken: 'test-token',
      beaconRpcUrl: 'https://dummy-beacon-url.test',
      mockResponses: {
        createBatch: {
          batch_id: batchId,
          message: `Batch ${batchId} created successfully`
        } as CreateBatchResponse,
        getBatchStatus: {
          validators: Array(numberOfValidators)
            .fill(null)
            .map(() => mockValidator),
          status: 'ready',
          created: new Date().toISOString(),
          is_compounding: false,
          deposit_gwei_per_validator: 32000000000,
          status_code: 200
        } as BatchDetailsResponse,
        listBatches: {
          requests: [
            {
              batch_id: batchId,
              created: Date.now(),
              status: 'ready',
              is_compounding: false,
              deposit_gwei_per_validator: 32000000000
            }
          ]
        } as ListBatchesResponse
      }
    }

    const testSetup = await setupTestEnvironment(testConfig)
    cleanup = testSetup.cleanup

    staker = new EthereumStaker({
      network: 'hoodi',
      nativeStakingApiToken: 'test-token'
    })

    await staker.init()
    ;(staker as any).nativeStakingConnector = testSetup.nativeStakingConnector
    ;(staker as any).beaconConnector = testSetup.beaconConnector
  })

  afterEach(() => {
    cleanup()
  })

  it('should create a validator batch successfully', async () => {
    const result: CreateBatchResponse = await staker.createValidatorBatch({
      batchId,
      withdrawalAddress,
      feeRecipientAddress,
      numberOfValidators
    })

    assert.ok(result)
    assert.equal(result.batch_id, batchId)
    assert.include(result.message, batchId, 'message should include batchId')
    assert.include(result.message, 'created', 'message should confirm creation')
  })

  it('should get validator batch status successfully', async () => {
    const status: BatchValidators = await staker.getValidatorBatchStatus({
      batchId
    })

    assert.ok(status)
    assert.equal(status.status, 'ready')
    assert.equal(status.validators.length, numberOfValidators)

    status.validators.forEach((validator) => {
      assert.exists(validator.deposit_data)
      assert.exists(validator.deposit_data.amount)
      assert.exists(validator.deposit_data.deposit_cli_version)
      assert.exists(validator.deposit_data.deposit_data_root)
      assert.exists(validator.deposit_data.deposit_message_root)
      assert.exists(validator.deposit_data.fork_version)
      assert.exists(validator.deposit_data.network_name)
      assert.exists(validator.deposit_data.pubkey)
      assert.exists(validator.deposit_data.signature)
      assert.exists(validator.deposit_data.withdrawal_credentials)
    })
  })

  it('should handle buildDepositTx based on batch status', async () => {
    const batchData: BatchValidators = await staker.getValidatorBatchStatus({ batchId })
    const result = await staker.buildDepositTx({ batchData })

    assert.ok(result)
    assert.exists(result.transactions)
    assert.isArray(result.transactions)
    assert.isAtLeast(result.transactions.length, 1)

    result.transactions.forEach((tx) => {
      assert.exists(tx.to, 'Transaction should have a "to" address')
      assert.exists(tx.value, 'Transaction should have a value')
      assert.exists(tx.data, 'Transaction should have data')
      assert.equal(tx.value, 32000000000000000000n, 'Each validator deposit should be exactly 32 ETH')
      assert.isString(tx.data, 'Transaction data should be a hex string')
      assert.isTrue(tx.data!.startsWith('0x'), 'Transaction data should start with 0x')
    })
  })

  it('exports the correct deposit data', async () => {
    const batchData: BatchValidators = await staker.getValidatorBatchStatus({ batchId })
    const result = await staker.exportDepositData({ batchData })

    assert.ok(result)
    assert.exists(result.depositData)
    assert.isArray(result.depositData)
    assert.equal(result.depositData.length, numberOfValidators)

    result.depositData.forEach((data) => {
      assert.exists(data.amount)
      assert.exists(data.deposit_cli_version)
      assert.exists(data.deposit_data_root)
      assert.exists(data.deposit_message_root)
      assert.exists(data.fork_version)
      assert.exists(data.network_name)
      assert.exists(data.pubkey)
      assert.exists(data.signature)
      assert.exists(data.withdrawal_credentials)
    })
    it('should handle batch still being processed', async () => {
      const { connector: processingConnector } = setupNativeStakingConnector({
        network: 'hoodi',
        apiToken: 'test-token',
        mockResponses: {
          getBatchStatus: {
            validators: [],
            status: 'created',
            created: new Date().toISOString(),
            is_compounding: false,
            deposit_gwei_per_validator: 32000000000
          }
        }
      })

      ;(staker as any).nativeStakingConnector = processingConnector

      const status = await staker.getValidatorBatchStatus({ batchId })

      assert.equal(status.status, 'created')
      assert.equal(status.validators.length, 0)

      // Should return empty transactions when batch is not ready
      const result = await staker.buildDepositTx({ batchData: status })
      assert.ok(result)
      assert.isArray(result.transactions)
      assert.equal(result.transactions.length, 0)
    })
  })
})

describe.only('EthereumStaker.exiting validators', () => {
  let staker: EthereumStaker
  let cleanup: () => void

  const mockExitMessage: ValidatorExitMessage = {
    message: {
      epoch: 41615,
      validator_index: 123456
    },
    signature:
      '0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef12'
  }

  const mockValidatorWithExit: BatchDetailsValidator = {
    deposit_data: mockValidatorDepositData,
    status: 'active' as const,
    exit_message: mockExitMessage
  }

  beforeEach(async () => {
    const testConfig: TestConfig = {
      network: 'hoodi',
      apiToken: 'test-token',
      beaconRpcUrl: 'https://dummy-beacon-url.test',
      mockResponses: {
        getBatchStatus: {
          validators: [mockValidatorWithExit],
          status: 'ready',
          created: new Date().toISOString(),
          is_compounding: false,
          deposit_gwei_per_validator: 32000000000,
          status_code: 200
        } as BatchDetailsResponse,
        listBatches: {
          requests: [
            {
              batch_id: 'test-batch-1',
              created: Date.now(),
              status: 'ready',
              is_compounding: false,
              deposit_gwei_per_validator: 32000000000
            }
          ]
        } as ListBatchesResponse
      }
    }

    const testSetup = await setupTestEnvironment(testConfig)
    cleanup = testSetup.cleanup

    staker = new EthereumStaker({
      network: 'hoodi',
      nativeStakingApiToken: 'test-token'
    })

    await staker.init()
    ;(staker as any).nativeStakingConnector = testSetup.nativeStakingConnector
    ;(staker as any).beaconConnector = testSetup.beaconConnector
  })

  afterEach(() => {
    cleanup()
  })

  it('should submit exit messages successfully', async () => {
    const exitMessages = [mockExitMessage]
    const result = await staker.submitValidatorExits({ exitMessages })

    assert.ok(result)
    assert.instanceOf(result, Set)
    assert.equal(result.size, 0) // Mock returns empty set by default
  })

  it('should throw error when beacon connector is not available', async () => {
    ;(staker as any).beaconConnector = null

    try {
      await staker.submitValidatorExits({ exitMessages: [mockExitMessage] })
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.equal((error as Error).message, 'Beacon connector is not available.')
    }
  })

  it('should handle empty exit messages array', async () => {
    const result = await staker.submitValidatorExits({ exitMessages: [] })

    assert.ok(result)
    assert.instanceOf(result, Set)
    assert.equal(result.size, 0)
  })

  it('should handle multiple exit messages', async () => {
    const exitMessage2: ValidatorExitMessage = {
      message: {
        epoch: 41615,
        validator_index: 789012
      },
      signature:
        '0xfedcba987654321fedcba987654321fedcba987654321fedcba987654321fedcba987654321fedcba987654321fedcba987654321fedcba987654321fedcba987654321fedcba987654321fedcba987654321fedcba987654321fedcba987654321fedcba987654321'
    }

    const exitMessages = [mockExitMessage, exitMessage2]
    const result = await staker.submitValidatorExits({ exitMessages })

    assert.ok(result)
    assert.instanceOf(result, Set)
  })

  it('should extract exit messages from batch and submit them', async () => {
    const { requests } = await staker.listValidatorBatches()
    assert.isArray(requests)
    assert.isAtLeast(requests.length, 1)

    const batch = await staker.getValidatorBatchStatus({
      batchId: requests[0].batch_id
    })

    assert.ok(batch)
    assert.isArray(batch.validators)

    const exitMessages = batch.validators.filter((v) => v.exit_message).map((v) => v.exit_message!)

    assert.isArray(exitMessages)
    assert.isAtLeast(exitMessages.length, 1)

    const result = await staker.submitValidatorExits({ exitMessages })
    assert.ok(result)
    assert.instanceOf(result, Set)
  })
})
