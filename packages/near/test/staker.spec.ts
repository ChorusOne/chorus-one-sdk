import { NearStaker, denomToMacroAmount, macroToDenomAmount } from '@chorus-one/near'
import { KeyPair } from 'near-api-js'
import { describe, it } from 'mocha'
import chai, { use, assert, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import spies from 'chai-spies'

// Use chai-as-promised plugin for async tests
use(chaiAsPromised)
use(spies)

// After using the spies plugin, spy is available on chai
const { spy } = chai

describe('NearStaker', () => {
  const delegatorAddress = 'mateusz-test-mnemonic.testnet'
  const validatorAddress = 'chorusone.pool.f863973.m0'
  const staker = new NearStaker({
    networkId: 'testnet',
    rpcUrl: 'https://near.fake.website'
  })

  it('should generate correct unsigned delegate tx', async () => {
    spy.on(staker, ['getConnection'], () => {
      return {
        provider: {
          block: () => Promise.resolve({ header: { hash: '123' } }),
          query: () =>
            Promise.resolve({
              keys: [
                {
                  public_key: KeyPair.fromRandom('ed25519').getPublicKey().toString(),
                  access_key: {
                    nonce: 0,
                    permission: 'FullAccess'
                  }
                }
              ]
            })
        }
      }
    })

    const { tx } = await staker.buildStakeTx({
      delegatorAddress,
      validatorAddress,
      amount: '0.5'
    })

    const fnCall = tx.actions[0].functionCall

    assert.equal(fnCall?.deposit, BigInt('500000000000000000000000'))
    assert.equal(fnCall?.methodName, 'deposit_and_stake')
    assert.equal(tx.signerId, delegatorAddress)
    assert.equal(tx.receiverId, validatorAddress)
  })

  it('should handle amount fuzzing correctly', () => {
    ;[
      ['0', '0'], // zero handlung
      ['1', '1000000000000000000000000'], // 1 * denomMultiplier = denomMultiplier
      ['1.2', '1200000000000000000000000'], // most common case
      ['0.123456789123456789123456', '123456789123456789123456'], // max precision
      ['0.000000000000000000000000', '0'], // over max precision but zero
      ['1000000000', '1000000000000000000000000000000000'], // unlikely edge case to send 1 000 000 000 macro tokens
      [
        '0.123456789123456789123456789',
        '',
        'exceeded maximum denominator precision, amount: 1.23456789123456789123456789e+23, precision: .27'
      ], // over max precision
      ['', '', 'invalid amount:  failed to parse to number'], // empty string is not a valid number
      ['abc', '', 'invalid amount: abc failed to parse to number'], // text is not a valid number
      ['-1', '', 'amount cannot be negative'] // negive amounts are not allowed
    ].map((testData) => {
      const [amount, expectedAmount, expectedError] = testData

      const runTest = (amount: string): string => {
        return macroToDenomAmount(amount, '1000000000000000000000000' /* 10^24 */)
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
        assert.equal(denomToMacroAmount(result, '1000000000000000000000000'), expectedMacroDenom)
      }
    })
  })
})
