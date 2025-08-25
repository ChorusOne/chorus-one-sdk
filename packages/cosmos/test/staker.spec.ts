import { CosmosStaker, denomToMacroAmount } from '@chorus-one/cosmos'
import type { MsgDelegateEncodeObject } from '@cosmjs/stargate'
import { describe, it } from 'mocha'
import { use, assert, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

// Use chai-as-promised plugin for async tests
use(chaiAsPromised)

describe('CosmosStaker', () => {
  const delegatorAddress = 'celestia163l3w3m8nmgyq08helyvjq6tnpktr265tqljkn'
  const validatorAddress = 'celestiavaloper1ksqfc6445yq82n3p28utpt500fyddrtlezx3pp'
  const staker = new CosmosStaker({
    rpcUrl: 'https://celestia.chorus.one:443',
    lcdUrl: 'https://celestia-lcd.chorus.one:443',
    bechPrefix: 'celestia',
    denom: 'utia',
    denomMultiplier: '1000000',
    gas: 250000,
    gasPrice: '0.1'
  })

  it('should generate correct unsigned delegate tx', async () => {
    const { tx } = <{ tx: MsgDelegateEncodeObject }>await staker.buildStakeTx({
      delegatorAddress,
      validatorAddress,
      amount: '0.5'
    })

    assert.equal(tx.value.amount?.amount, '500000')
    assert.equal(tx.value.amount?.denom, 'utia')
    assert.equal(tx.value.delegatorAddress, delegatorAddress)
    assert.equal(tx.value.validatorAddress, validatorAddress)
  })

  it('should handle amount fuzzing correctly', async () => {
    await Promise.all(
      [
        ['0', '0'], // zero handlung
        ['1', '1000000'], // 1 * denomMultiplier = denomMultiplier
        ['1.2', '1200000'], // most common case
        ['0.123456', '123456'], // max precision
        ['0.000000000000', '0'], // over max precision but zero
        ['0.1234567', '', 'exceeded maximum denominator precision, amount: 123456.7, precision: .7'], // over max precision
        ['', '', 'invalid amount:  failed to parse to number'], // empty string is not a valid number
        ['abc', '', 'invalid amount: abc failed to parse to number'], // text is not a valid number
        ['-1', '', 'amount cannot be negative'] // negive amounts are not allowed
      ].map(async (testData) => {
        const [amount, expectedAmount, expectedError] = testData

        const runTest = async (amount: string): Promise<MsgDelegateEncodeObject> => {
          const { tx } = <{ tx: MsgDelegateEncodeObject }>await staker.buildStakeTx({
            delegatorAddress,
            validatorAddress,
            amount
          })

          return tx
        }

        if (expectedError) {
          await expect(runTest(amount)).to.be.rejectedWith(expectedError)
        } else {
          const tx = await runTest(amount)

          const coin = tx.value.amount
          if (!coin) {
            throw new Error('coin is undefined')
          }

          // check if we have the expected amount
          assert.equal(coin.amount, expectedAmount)

          // check if the reverse conversion is correct (0.000000000000 is a special case, that returns just 0)
          const expectedMacroDenom = amount === '0.000000000000' ? '0' : amount
          assert.equal(denomToMacroAmount(coin.amount.toString(), '1000000'), expectedMacroDenom)
        }
      })
    )
  })
})
