import { SubstrateStaker, denomToMacroAmount, macroToDenomAmount, RewardDestination } from '@chorus-one/substrate'
import { describe, it } from 'mocha'
import { use, assert, expect, spy } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import spies from 'chai-spies'

// Use chai-as-promised plugin for async tests
use(chaiAsPromised)
use(spies)

describe('SubstrateStaker', () => {
  const staker = new SubstrateStaker({
    rpcUrl: 'https://polkadot.fake.website',
    rewardDestination: RewardDestination.STASH,
    denomMultiplier: '10000000000' // 10^10
  })

  it('should generate correct unsigned delegate tx', async () => {
    spy.on(staker, ['getApi'], () => {
      return {
        tx: {
          staking: {
            bond: (args: any) => args
          }
        }
      }
    })

    const { tx } = await staker.buildStakeTx({
      amount: '0.5'
    })

    // we mocked the api, so we can safely cast the tx to string
    const amount = String(tx)
    assert.equal(amount, (0.5 * 10000000000).toString())
  })

  it('should handle amount fuzzing correctly', () => {
    ;[
      ['0', '0'], // zero handlung
      ['1', '10000000000'], // 1 * denomMultiplier = denomMultiplier
      ['1.2', '12000000000'], // most common case
      ['0.1234567891', '1234567891'], // max precision
      ['0.000000000000000000000000', '0'], // over max precision but zero
      ['1000000000', '10000000000000000000'], // unlikely edge case to send 1 000 000 000 macro tokens
      ['0.12345678912', '', '1234567891.2, precision: .11'], // over max precision
      ['', '', 'invalid amount:  failed to parse to number'], // empty string is not a valid number
      ['abc', '', 'invalid amount: abc failed to parse to number'], // text is not a valid number
      ['-1', '', 'amount cannot be negative'] // negive amounts are not allowed
    ].map((testData) => {
      const [amount, expectedAmount, expectedError] = testData

      const runTest = (amount: string): string => {
        return macroToDenomAmount(amount, '10000000000' /* 10^10 */)
      }

      if (expectedError) {
        expect(() => {
          runTest(amount)
        }).to.throw(expectedError)
      } else {
        const result = runTest(amount)

        // check if we have the expected amount
        assert.equal(result, expectedAmount)

        // check if the reverse conversion is correct (0.000000000000 is a special case, that returns just 0)
        const expectedMacroDenom = amount === '0.000000000000000000000000' ? '0' : amount
        assert.equal(denomToMacroAmount(result, '10000000000'), expectedMacroDenom)
      }
    })
  })
})
