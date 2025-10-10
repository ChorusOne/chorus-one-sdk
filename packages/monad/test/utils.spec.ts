import { describe, it } from 'mocha'
import { assert } from 'chai'
import { isValidValidatorId, isValidWithdrawalId } from '../src/utils'

describe('Validation Utils', () => {
  describe('isValidValidatorId', () => {
    it('should accept valid uint64 validator IDs', () => {
      const validIds = [0, 1, 100, 999, 1000000, 2 ** 63 - 1]

      for (const id of validIds) {
        assert.isTrue(isValidValidatorId(id), `Expected ${id} to be valid`)
      }
    })

    it('should reject invalid validator IDs', () => {
      const invalidIds = [
        -1, // negative
        -100, // negative
        1.5, // non-integer
        99.9, // non-integer
        2 ** 64, // >= 2^64
        2 ** 64 + 1, // >= 2^64
        NaN, // NaN
        Infinity, // Infinity
        -Infinity // -Infinity
      ]

      for (const id of invalidIds) {
        assert.isFalse(isValidValidatorId(id), `Expected ${id} to be invalid`)
      }
    })
  })

  describe('isValidWithdrawalId', () => {
    it('should accept valid uint8 withdrawal IDs (0-255)', () => {
      const validIds = [0, 1, 100, 128, 255]

      for (const id of validIds) {
        assert.isTrue(isValidWithdrawalId(id), `Expected ${id} to be valid`)
      }
    })

    it('should reject invalid withdrawal IDs', () => {
      const invalidIds = [
        -1, // negative
        -100, // negative
        256, // > 255
        300, // > 255
        1.5, // non-integer
        254.9, // non-integer
        NaN, // NaN
        Infinity, // Infinity
        -Infinity // -Infinity
      ]

      for (const id of invalidIds) {
        assert.isFalse(isValidWithdrawalId(id), `Expected ${id} to be invalid`)
      }
    })

    it('should validate boundary values correctly', () => {
      // Lower boundary
      assert.isTrue(isValidWithdrawalId(0))
      assert.isFalse(isValidWithdrawalId(-1))

      // Upper boundary
      assert.isTrue(isValidWithdrawalId(255))
      assert.isFalse(isValidWithdrawalId(256))
    })
  })
})
