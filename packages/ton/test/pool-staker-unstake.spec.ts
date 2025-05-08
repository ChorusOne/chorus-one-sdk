import { describe, it } from 'mocha'
import { use, expect, spy } from 'chai'
import { toNano, Address } from '@ton/ton'
import { TonPoolStaker } from '../src/TonPoolStaker'
import { chaiAsPromised } from 'chai-promised'
import spies from 'chai-spies'
import { TupleItem, TupleReader } from '@ton/core'

// Use chai plugins
use(chaiAsPromised)
use(spies)

describe.only('TonPoolStaker - buildUnstakeTx', () => {
  // Sample addresses for testing
  const delegatorAddress = '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr'
  const validatorAddressPair: [string, string] = [
    'kQAHBakDk_E7qLlNQZxJDsqj_ruyAFpqarw85tO-c03fK26F',
    'kQCltujow9Sq3ZVPPU6CYGfqwDxYwjlmFGZ1Wt0bAYebio4o'
  ]

  const staker = new TonPoolStaker({
    rpcUrl: 'https://testnet.toncenter.com/api/v2/jsonRPC'
  })

  const getParamsResponse: TupleItem[] = [
    { type: 'int', value: BigInt(1) }, // enabled
    { type: 'int', value: BigInt(1) }, // updatesEnables
    { type: 'int', value: toNano('1') }, // minStake
    { type: 'int', value: toNano('0.05') }, // depositFee
    { type: 'int', value: toNano('0.05') }, // withdrawFee
    { type: 'int', value: toNano('0.1') }, // poolFee
    { type: 'int', value: toNano('0.01') }, // receiptPrice
    { type: 'int', value: toNano('10') } // minStakeTotal
  ]

  const getPoolStatusResponse: TupleItem[] = [
    { type: 'int', value: toNano('20000') }, // balance
    { type: 'int', value: toNano('0') }, // balanceSent
    { type: 'int', value: toNano('0') }, // balancePendingDeposits
    { type: 'int', value: toNano('0') }, // balancePendingWithdrawals
    { type: 'int', value: toNano('0') } // balanceWithdraw
  ]

  const getMemberResponse: TupleItem[] = [
    { type: 'int', value: toNano('1') }, // balance
    { type: 'int', value: toNano('1') }, // pendingDeposit
    { type: 'int', value: toNano('1') }, // pendingWithdraw
    { type: 'int', value: toNano('0.05') } // withdraw
  ]

  // ------------------------------------------------------------------------------------------------

  // Mock contract responses via client
  spy.on(staker, ['getClient'], () => {
    return {
      provider: () => ({
        get: async (methodName: string): Promise<{ stack: TupleReader }> => {
          let stackMock: TupleItem[] = []

          if (methodName === 'get_pool_status') {
            stackMock = getPoolStatusResponse
          }

          return {
            stack: new TupleReader(stackMock)
          }
        }
      }),

      runMethod: async (_address: Address, methodName: string): Promise<{ stack: TupleReader }> => {
        let stackMock: TupleItem[] = []

        switch (methodName) {
          case 'get_member':
            stackMock = getMemberResponse
            break
          case 'get_params':
            stackMock = getParamsResponse
            break
          default:
            throw new Error(`Unknown method: ${methodName}`)
        }

        return {
          stack: new TupleReader(stackMock)
        }
      }
    }
  })

  // Mock address validation and min election stake methods
  spy.on(staker, ['checkIfAddressTestnetFlagMatches'], () => {})
  spy.on(staker, ['getElectionMinStake'], async () => toNano('10000'))

  it('should successfully build an unstake transaction with stateful calculation', async () => {
    // Call the method
    const result = await staker.buildUnstakeTx({
      delegatorAddress,
      validatorAddressPair,
      amount: '1'
    })

    // Verify the result has the expected structure
    expect(result).to.have.property('tx')
    expect(result.tx).to.have.property('validUntil').that.is.a('number')
    expect(result.tx).to.have.property('messages').that.is.an('array')

    // Verify we have messages for both validators
    if (result.tx.messages) {
      expect(result.tx.messages.length).to.equal(2)

      // Verify each message has the correct structure
      result.tx.messages.forEach((message, index) => {
        expect(message).to.have.property('address', validatorAddressPair[index])
        expect(message).to.have.property('bounceable', true)
        expect(message).to.have.property('amount').that.is.a('bigint')
        expect(message).to.have.property('payload')
      })
    }
  })

  it('should successfully build an unstake transaction with disabled stateful calculation', async () => {
    // Call the method with disableStatefulCalculation flag
    const result = await staker.buildUnstakeTx({
      delegatorAddress,
      validatorAddressPair,
      amount: '1',
      disableStatefulCalculation: true
    })

    // Verify the result has the expected structure
    expect(result).to.have.property('tx')
    expect(result.tx).to.have.property('validUntil').that.is.a('number')
    expect(result.tx).to.have.property('messages').that.is.an('array')

    // Verify we have messages for both validators
    if (result.tx.messages) {
      expect(result.tx.messages.length).to.equal(2)

      // When stateful calculation is disabled, it should still generate valid messages
      result.tx.messages.forEach((message, index) => {
        expect(message).to.have.property('address', validatorAddressPair[index])
        expect(message).to.have.property('bounceable', true)
        expect(message).to.have.property('amount').that.is.a('bigint')
        expect(message).to.have.property('payload')
      })
    }
  })

  it('should successfully build an unstake transaction with a custom validUntil timestamp', async () => {
    const validUntil = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

    // Call the method with a custom validUntil
    const result = await staker.buildUnstakeTx({
      delegatorAddress,
      validatorAddressPair,
      amount: '1',
      validUntil
    })

    // Verify the result has the custom validUntil
    expect(result.tx.validUntil).to.equal(validUntil)
  })

  it('should successfully build an unstake transaction with a single validator address', async () => {
    // Use only the first validator address
    const singleValidatorPair: [string, string] = [validatorAddressPair[0], '']

    // Call the method
    const result = await staker.buildUnstakeTx({
      delegatorAddress,
      validatorAddressPair: singleValidatorPair,
      amount: '1'
    })

    // Verify we have a message for only one validator
    if (result.tx.messages) {
      expect(result.tx.messages.length).to.equal(1)
      expect(result.tx.messages[0]).to.have.property('address', singleValidatorPair[0])
    }
  })
})
