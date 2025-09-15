import { EthereumStaker } from '@chorus-one/ethereum'
import { assert, spy } from 'chai'
import { setupNativeStakingConnector } from './lib/test-setup'
import { Hex } from 'viem'

describe('EthereumStaker.native_staking', () => {
  let staker: EthereumStaker
  const batchId: string = 'test-batch-id'
  const withdrawalAddress = '0x742d35Cc6634C0532925a3b8D456A2Ef7e2B4800' as Hex
  const feeRecipientAddress = '0x742d35Cc6634C0532925a3b8D456A2Ef7e2B4800' as Hex
  const numberOfValidators = 1

  const mockValidatorDepositData = {
    pubkey: '0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef12',
    withdrawal_credentials: '0x010000000000000000000000742d35cc6634c0532925a3b8d456a2ef7e2b4800',
    amount: 32000000000,
    signature:
      '0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef12',
    deposit_message_root: '0x987654321fedcba987654321fedcba987654321fedcba987654321fedcba9876',
    deposit_data_root: '0x987654321fedcba987654321fedcba987654321fedcba987654321fedcba9876',
    fork_version: '0x00000000',
    network_name: 'hoodi',
    deposit_cli_version: '2.5.0'
  }

  const mockValidator = {
    pubkey: '0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef12',
    status: 'created' as const,
    deposit_data: mockValidatorDepositData
  }

  beforeEach(async () => {
    // Setup mocked connector
    const connector = setupNativeStakingConnector({
      network: 'hoodi',
      apiToken: 'test-token',
      mockResponses: {
        createBatch: {
          data: {
            batch_id: batchId,
            message: `Batch ${batchId} created successfully`
          },
          status: 200
        },
        getBatchStatus: {
          data: {
            batch_id: batchId,
            withdrawal_address: withdrawalAddress,
            fee_recipient: feeRecipientAddress,
            number_of_validators: numberOfValidators,
            network: 'hoodi',
            status: 'ready',
            validators: Array(numberOfValidators)
              .fill(null)
              .map(() => mockValidator),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          status: 200
        },
        listBatches: {
          data: {
            batches: [
              {
                batch_id: batchId,
                withdrawal_address: withdrawalAddress,
                fee_recipient: feeRecipientAddress,
                number_of_validators: numberOfValidators,
                network: 'hoodi',
                status: 'ready',
                validators: Array(numberOfValidators)
                  .fill(null)
                  .map(() => mockValidator),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]
          },
          status: 200
        }
      }
    })

    staker = new EthereumStaker({
      network: 'hoodi',
      nativeStakingApiToken: 'test-token'
    })

    await staker.init()
    ;(staker as any).nativeStakingConnector = connector
  })

  afterEach(() => {
    spy.restore()
  })

  it('should create a validator batch successfully', async () => {
    const result = await staker.createValidatorBatch({
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
    const status = await staker.getValidatorBatchStatus({
      batchId
    })

    assert.ok(status)
    assert.equal(status.batch_id, batchId)
    assert.equal(status.status, 'ready')
    assert.equal(status.validators.length, numberOfValidators)
    assert.equal(status.statusCode, 200)

    status.validators.forEach((validator) => {
      assert.exists(validator.deposit_data)
      assert.exists(validator.deposit_data.pubkey)
      assert.exists(validator.deposit_data.withdrawal_credentials)
      assert.exists(validator.deposit_data.signature)
      assert.exists(validator.deposit_data.deposit_data_root)
    })
  })

  it('should handle buildDepositTx based on batch status', async () => {
    const result = await staker.buildDepositTx({ batchId })

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
    const result = await staker.exportDepositData({ batchId })

    assert.ok(result)
    assert.exists(result.depositData)
    assert.isArray(result.depositData)
    assert.equal(result.depositData.length, numberOfValidators)

    result.depositData.forEach((data) => {
      assert.exists(data.pubkey)
      assert.exists(data.withdrawal_credentials)
      assert.exists(data.signature)
      assert.exists(data.deposit_data_root)
      assert.equal(data.amount, 32000000000)
      assert.equal(data.network_name, 'hoodi')
    })
  })

  describe('batch processing scenarios', () => {
    it('should handle batch still being processed (206 status)', async () => {
      // Restore existing spy and create a new one with 206 status
      spy.restore()

      const processingConnector = setupNativeStakingConnector({
        network: 'hoodi',
        apiToken: 'test-token',
        mockResponses: {
          getBatchStatus: {
            data: {
              batch_id: batchId,
              withdrawal_address: withdrawalAddress,
              fee_recipient: feeRecipientAddress,
              number_of_validators: numberOfValidators,
              network: 'hoodi',
              status: 'pending',
              validators: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            status: 206
          }
        }
      })

      ;(staker as any).nativeStakingConnector = processingConnector

      const status = await staker.getValidatorBatchStatus({ batchId })

      assert.equal(status.statusCode, 206)
      assert.equal(status.status, 'pending')
      assert.equal(status.validators.length, 0)

      // Should throw error when trying to build deposit transactions
      try {
        await staker.buildDepositTx({ batchId })
        assert.fail('Should have thrown an error for batch still being processed')
      } catch (error: any) {
        assert.include(error.message, 'still being processed')
      }
    })
  })
})
