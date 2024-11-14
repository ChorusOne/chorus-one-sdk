import { TonNominatorPoolStaker } from '@chorus-one/ton'
import { Address, TupleItem, TupleReader } from '@ton/core'
import { describe, it } from 'mocha'
import { use, assert, expect, spy } from 'chai'
import { chaiAsPromised } from 'chai-promised'
import spies from 'chai-spies'

// Use chai-as-promised plugin for async tests
use(chaiAsPromised)
use(spies)

describe('TonStaker', () => {
  const delegatorAddress = '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr'
  const validatorAddress = 'kf8SWCvzf6eJK4Q0ZOe14PqDdsT5wk0_Ni0wAThL0cVorNVU'
  const staker = new TonNominatorPoolStaker({
    rpcUrl: 'https://ton.fake.website',
    addressDerivationConfig: {
      walletContractVersion: 4,
      workchain: 0,
      bounceable: false,
      testOnly: true,
      urlSafe: true
    }
  })

  const getPoolDataResponse: TupleItem[] = [
    { type: 'tuple', items: [] },
    { type: 'int', value: BigInt(1) }, // nominators count
    { type: 'tuple', items: [] },
    { type: 'tuple', items: [] },
    { type: 'tuple', items: [] },
    { type: 'tuple', items: [] },
    { type: 'int', value: BigInt(10) }, // max nominator count
    { type: 'tuple', items: [] },
    { type: 'int', value: BigInt(0) }, // nominator stake
    { type: 'tuple', items: [] },
    { type: 'tuple', items: [] },
    { type: 'tuple', items: [] },
    { type: 'tuple', items: [] },
    { type: 'tuple', items: [] },
    { type: 'tuple', items: [] },
    { type: 'tuple', items: [] },
    { type: 'tuple', items: [] }
  ]

  const getNominatorListResponse: TupleItem[] = [{ type: 'tuple', items: [] }]

  spy.on(staker, ['getClient'], () => {
    return {
      runMethod: async (
        _address: Address,
        name: string,
        _stack?: TupleItem[]
      ): Promise<{ gas_used: number; stack: TupleReader }> => {
        let stackmock: TupleItem[]

        switch (name) {
          case 'get_pool_data': {
            stackmock = getPoolDataResponse
            break
          }
          case 'list_nominators': {
            stackmock = getNominatorListResponse
            break
          }
          default:
            throw new Error(`Unknown method: ${name}`)
        }
        return {
          gas_used: 0,
          stack: new TupleReader(stackmock)
        }
      }
    }
  })

  it('should generate correct unsigned delegate tx', async () => {
    const { tx } = await staker.buildStakeTx({
      delegatorAddress,
      validatorAddress,
      amount: '0.5'
    })

    assert.equal(tx.message?.amount, BigInt('500000000'))
    assert.equal(tx.message?.bounceable, true)
    assert.equal(tx.message?.payload, 'd')
    assert.equal(tx.message?.address, 'kf8SWCvzf6eJK4Q0ZOe14PqDdsT5wk0_Ni0wAThL0cVorNVU')
  })

  it('should handle amount fuzzing correctly', async () => {
    await Promise.all(
      [
        ['0', '0'], // zero handlung
        ['1', '1000000000'], // 1 * denomMultiplier = denomMultiplier
        ['1.2', '1200000000'], // most common case
        ['0.123456789', '123456789'], // max precision
        ['1000000000', '1000000000000000000'], // unlikely edge case to send 1 000 000 000 macro tokens
        ['0.1234567891', '', 'Invalid number'], // over max precision
        ['', '0'], // empty string defaults to 0
        ['abc', '', 'Cannot convert abc to a BigInt'], // text is not a valid number
        ['-1', '', 'amount to stake (-1) is less than the minimum stake required (0)'] // negive amounts are not allowed
      ].map(async (testData) => {
        const [amount, expectedAmount, expectedError] = testData

        const runTest = async (amount: string): Promise<bigint> => {
          const { tx } = await staker.buildStakeTx({
            delegatorAddress,
            validatorAddress,
            amount
          })

          if (tx.message === undefined) {
            throw new Error('tx.message is undefined')
          }
          return tx.message?.amount
        }

        if (expectedError) {
          await expect(runTest(amount)).to.be.rejectedWith(expectedError)
        } else {
          const returnedAmount = await runTest(amount)

          // check if we have the expected amount
          assert.equal(returnedAmount.toString(), expectedAmount)
        }
      })
    )
  })
})
