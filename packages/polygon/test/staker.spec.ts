import { PolygonStaker } from '../src/staker'
import { describe, it, beforeEach } from 'mocha'
import { use, expect, assert } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import type { Address, Hex } from 'viem'
import { NETWORK_CONTRACTS } from '../src/constants'
import { EXPECTED_APPROVE_TX, EXPECTED_APPROVE_MAX_TX, TEST_ADDRESS, TEST_VALIDATOR_SHARE } from './fixtures/expected-data'

use(chaiAsPromised)

describe('PolygonStaker', () => {
  let staker: PolygonStaker

  beforeEach(async () => {
    staker = new PolygonStaker({
      network: 'mainnet',
      rpcUrl: 'https://ethereum-rpc.publicnode.com'
    })

    await staker.init()
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

    it('should always target the staking token contract', async () => {
      const { tx } = await staker.buildApproveTx({ amount: '1' })
      assert.equal(tx.to, NETWORK_CONTRACTS.mainnet.stakingTokenAddress)
    })

    it('should always have value of 0 (ERC20 approval, not ETH transfer)', async () => {
      const { tx } = await staker.buildApproveTx({ amount: '1000' })
      assert.equal(tx.value, 0n)
    })

    it('should handle amount fuzzing correctly', async () => {
      const amounts: [string, string][] = [
        ['1', '1000000000000000000'],
        ['0.5', '500000000000000000'],
        ['100.123456789012345678', '100123456789012345678'],
        ['0.000000000000000001', '1'],
        ['1000000000', '1000000000000000000000000000'],
        ['0.123456789012345678', '123456789012345678']
      ]

      for (const [amount] of amounts) {
        const { tx } = await staker.buildApproveTx({ amount })
        assert.equal(tx.value, 0n, `Value should be 0 for amount: ${amount}`)
        assert.isString(tx.data, `Data should be string for amount: ${amount}`)
      }
    })

    it('should reject invalid amounts', async () => {
      await expect(staker.buildApproveTx({ amount: '0' })).to.be.rejectedWith('Amount must be greater than 0')

      await expect(staker.buildApproveTx({ amount: '' })).to.be.rejectedWith('Amount cannot be empty')

      await expect(staker.buildApproveTx({ amount: 'invalid' })).to.be.rejectedWith(
        'Amount must be a valid number'
      )
    })

    it('should include default c1c1 referrer tracking in accessList', async () => {
      const { tx } = await staker.buildApproveTx({ amount: '100' })

      // c1c1 + first 3 bytes of keccak256(toHex('sdk-chorusone-staking')) padded to 32 bytes
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

    it('should throw when not initialized', async () => {
      const uninitializedStaker = new PolygonStaker({ network: 'mainnet', rpcUrl: 'https://ethereum-rpc.publicnode.com' })

      await expect(uninitializedStaker.buildApproveTx({ amount: '100' })).to.be.rejectedWith(
        'PolygonStaker not initialized'
      )
    })
  })

  // Note: buildStakeTx, buildUnstakeTx, buildWithdrawTx, buildCompoundTx, buildClaimRewardsTx
  // require RPC calls for pre-flight checks (e.g., checking allowance, stake balance, rewards).
  // Only input validation is tested here.

  describe('buildStakeTx - Validation', () => {
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

    it('should throw when not initialized', async () => {
      const uninitializedStaker = new PolygonStaker({ network: 'mainnet', rpcUrl: 'https://ethereum-rpc.publicnode.com' })

      await expect(
        uninitializedStaker.buildStakeTx({
          delegatorAddress: TEST_ADDRESS,
          validatorShareAddress: TEST_VALIDATOR_SHARE,
          amount: '100'
        })
      ).to.be.rejectedWith('PolygonStaker not initialized')
    })
  })

  describe('buildUnstakeTx - Validation', () => {
    it('should reject invalid delegator address', async () => {
      await expect(
        staker.buildUnstakeTx({
          delegatorAddress: 'invalid' as Address,
          validatorShareAddress: TEST_VALIDATOR_SHARE,
          amount: '50'
        })
      ).to.be.rejectedWith('Invalid delegator address')
    })

    it('should reject invalid validator share address', async () => {
      await expect(
        staker.buildUnstakeTx({
          delegatorAddress: TEST_ADDRESS,
          validatorShareAddress: 'invalid' as Address,
          amount: '50'
        })
      ).to.be.rejectedWith('Invalid validator share address')
    })
  })

  describe('buildWithdrawTx - Validation', () => {
    it('should reject invalid delegator address', async () => {
      await expect(
        staker.buildWithdrawTx({
          delegatorAddress: 'invalid' as Address,
          validatorShareAddress: TEST_VALIDATOR_SHARE,
          unbondNonce: 0n
        })
      ).to.be.rejectedWith('Invalid delegator address')
    })

    it('should reject invalid validator share address', async () => {
      await expect(
        staker.buildWithdrawTx({
          delegatorAddress: TEST_ADDRESS,
          validatorShareAddress: 'invalid' as Address,
          unbondNonce: 0n
        })
      ).to.be.rejectedWith('Invalid validator share address')
    })
  })

  describe('buildClaimRewardsTx - Validation', () => {
    it('should reject invalid delegator address', async () => {
      await expect(
        staker.buildClaimRewardsTx({
          delegatorAddress: 'invalid' as Address,
          validatorShareAddress: TEST_VALIDATOR_SHARE
        })
      ).to.be.rejectedWith('Invalid delegator address')
    })

    it('should reject invalid validator share address', async () => {
      await expect(
        staker.buildClaimRewardsTx({
          delegatorAddress: TEST_ADDRESS,
          validatorShareAddress: 'invalid' as Address
        })
      ).to.be.rejectedWith('Invalid validator share address')
    })
  })

  describe('buildCompoundTx - Validation', () => {
    it('should reject invalid delegator address', async () => {
      await expect(
        staker.buildCompoundTx({
          delegatorAddress: 'invalid' as Address,
          validatorShareAddress: TEST_VALIDATOR_SHARE
        })
      ).to.be.rejectedWith('Invalid delegator address')
    })

    it('should reject invalid validator share address', async () => {
      await expect(
        staker.buildCompoundTx({
          delegatorAddress: TEST_ADDRESS,
          validatorShareAddress: 'invalid' as Address
        })
      ).to.be.rejectedWith('Invalid validator share address')
    })
  })

  describe('getAddressDerivationFn', () => {
    it('should return a function', () => {
      const fn = PolygonStaker.getAddressDerivationFn()
      assert.isFunction(fn)
    })
  })
})
