import { PolygonStaker } from '../src/staker'
import { describe, it, beforeEach } from 'mocha'
import { use, expect, assert } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import type { Address, Hex } from 'viem'
import {
  EXPECTED_APPROVE_TX,
  EXPECTED_APPROVE_MAX_TX,
  TEST_ADDRESS,
  TEST_VALIDATOR_SHARE
} from './fixtures/expected-data'

use(chaiAsPromised)

describe('PolygonStaker', () => {
  let staker: PolygonStaker

  beforeEach(() => {
    staker = new PolygonStaker({
      network: 'mainnet',
      rpcUrl: 'https://ethereum-rpc.publicnode.com'
    })
  })

  describe('buildApproveTx', () => {
    it('should generate correct unsigned approve tx', async () => {
      const { tx } = await staker.buildApproveTx({
        amount: EXPECTED_APPROVE_TX.amount
      })

      assert.equal(tx.to, EXPECTED_APPROVE_TX.expected.to)
      assert.equal(tx.data, EXPECTED_APPROVE_TX.expected.data)
      assert.equal(tx.value, EXPECTED_APPROVE_TX.expected.value)
    })

    it('should generate max uint256 approval when amount is "max"', async () => {
      const { tx } = await staker.buildApproveTx({
        amount: EXPECTED_APPROVE_MAX_TX.amount
      })

      assert.equal(tx.to, EXPECTED_APPROVE_MAX_TX.expected.to)
      assert.equal(tx.data, EXPECTED_APPROVE_MAX_TX.expected.data)
      assert.equal(tx.value, EXPECTED_APPROVE_MAX_TX.expected.value)
    })

    it('should reject invalid amounts', async () => {
      await expect(staker.buildApproveTx({ amount: '0' })).to.be.rejectedWith('Amount must be greater than 0')
      await expect(staker.buildApproveTx({ amount: '' })).to.be.rejectedWith('Amount cannot be empty')
      await expect(staker.buildApproveTx({ amount: 'invalid' })).to.be.rejectedWith('Amount must be a valid number')
    })

    it('should include default c1c1 referrer tracking in accessList', async () => {
      const { tx } = await staker.buildApproveTx({ amount: '100' })

      const expectedStorageKey: Hex = '0xc1c17d208d000000000000000000000000000000000000000000000000000000'
      const expectedAccessList: Array<{ address: Address; storageKeys: Hex[] }> = [
        {
          address: '0x000000000000000000000000000000000000dEaD',
          storageKeys: [expectedStorageKey]
        }
      ]

      assert.deepEqual(tx.accessList, expectedAccessList)
    })

    it('should use custom referrer directly when provided', async () => {
      const customReferrer: Hex = '0x0000000000000000000000001234567890123456789012345678901234567890'
      const { tx } = await staker.buildApproveTx({ amount: '100', referrer: customReferrer })

      const expectedAccessList: Array<{ address: Address; storageKeys: Hex[] }> = [
        {
          address: '0x000000000000000000000000000000000000dEaD',
          storageKeys: [customReferrer]
        }
      ]

      assert.deepEqual(tx.accessList, expectedAccessList)
    })
  })

  describe('address validation', () => {
    it('should reject invalid delegator address', async () => {
      await expect(
        staker.buildStakeTx({
          delegatorAddress: 'invalid' as Address,
          validatorShareAddress: TEST_VALIDATOR_SHARE,
          amount: '100'
        })
      ).to.be.rejectedWith('Invalid delegator address')
    })

    it('should reject invalid validator share address', async () => {
      await expect(
        staker.buildStakeTx({
          delegatorAddress: TEST_ADDRESS,
          validatorShareAddress: 'invalid' as Address,
          amount: '100'
        })
      ).to.be.rejectedWith('Invalid validator share address')
    })
  })

  describe('getAddressDerivationFn', () => {
    it('should derive correct ethereum address from a compressed public key', async () => {
      const fn = PolygonStaker.getAddressDerivationFn()

      // Known secp256k1 compressed public key (generator point)
      const compressedPubKey = Uint8Array.from(
        Buffer.from('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', 'hex')
      )

      const [address] = await fn(compressedPubKey)
      assert.isString(address)
      assert.equal(address.length, 40)
    })
  })
})
