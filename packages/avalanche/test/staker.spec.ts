import { denomToMacroAmount, macroToDenomAmount } from '@chorus-one/avalanche'
import { describe, it } from 'mocha'
import { assert, expect } from 'chai'

describe('AvalancheStaker', () => {
  // TODO: mocking the avalanchejs library is hard due to unexported basic types
  // figure out how to write the tests for staker
  it('should handle amount fuzzing correctly', () => {
    ;[
      ['0', '0'], // zero handlung
      ['1', '1000000000'], // 1 * denomMultiplier = denomMultiplier
      ['1.2', '1200000000'], // most common case
      ['0.123456', '123456000'], // max precision
      ['0.0000000000000000', '0'], // over max precision but zero
      ['1000000000', '1000000000000000000'], // unlikely edge case to send 1 000 000 000 macro tokens
      ['0.1234567891', '', 'exceeded maximum denominator precision, amount: 123456789.1, precision: .10'], // over max precision
      ['', '', 'invalid amount:  failed to parse to number'], // empty string is not a valid number
      ['abc', '', 'invalid amount: abc failed to parse to number'], // text is not a valid number
      ['-1', '', 'amount cannot be negative'] // negive amounts are not allowed
    ].map((testData) => {
      const [amount, expectedAmount, expectedError] = testData

      const runTest = (amount: string): bigint => {
        return macroToDenomAmount(amount, '1000000000' /* 1e9 */)
      }

      if (expectedError) {
        expect(() => {
          runTest(amount)
        }).to.throw(expectedError)
      } else {
        const result = runTest(amount)

        // check if we have the expected amount
        assert.equal(result.toString(10), expectedAmount)

        // check if the reverse conversion is correct (0.000000000000 is a special case, that returns just 0)
        const expectedMacroDenom = amount === '0.0000000000000000' ? '0' : amount
        assert.equal(denomToMacroAmount(result, '1000000000'), expectedMacroDenom)
      }
    })
  })
})
