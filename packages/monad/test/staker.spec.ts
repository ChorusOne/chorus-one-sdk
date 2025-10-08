import { MonadStaker } from '../src/staker'
import { describe, it, beforeEach } from 'mocha'
import { use, expect, assert } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import type { Address } from 'viem'
import {
  EXPECTED_DELEGATE_TX,
  EXPECTED_DELEGATE_TX_LARGE,
  TEST_ADDRESS
} from './fixtures/expected-data'

use(chaiAsPromised)

describe('MonadStaker', () => {
  let staker: MonadStaker

  beforeEach(async () => {
    staker = new MonadStaker({
      rpcUrl: 'https://testnet-rpc.monad.xyz'
    })

    await staker.init()
  })

  describe('buildDelegateTx', () => {
    it('should generate correct unsigned delegate tx', async () => {
      const tx = await staker.buildDelegateTx({
        validatorId: EXPECTED_DELEGATE_TX.validatorId,
        amount: EXPECTED_DELEGATE_TX.amount
      })

      assert.equal(tx.to, EXPECTED_DELEGATE_TX.expected.to)
      assert.equal(tx.data, EXPECTED_DELEGATE_TX.expected.data)
      assert.equal(tx.value, EXPECTED_DELEGATE_TX.expected.value)
    })

    it('should encode large validator IDs correctly', async () => {
      const tx = await staker.buildDelegateTx({
        validatorId: EXPECTED_DELEGATE_TX_LARGE.validatorId,
        amount: EXPECTED_DELEGATE_TX_LARGE.amount
      })

      assert.equal(tx.to, EXPECTED_DELEGATE_TX_LARGE.expected.to)
      assert.equal(tx.data, EXPECTED_DELEGATE_TX_LARGE.expected.data)
      assert.equal(tx.value, EXPECTED_DELEGATE_TX_LARGE.expected.value)
    })

    it('should handle amount fuzzing correctly', async () => {
      await Promise.all(
        [
          ['0', '0'],
          ['1', '1000000000000000000'],
          ['0.5', '500000000000000000'],
          ['100.123456789012345678', '100123456789012345678'],
          ['0.000000000000000001', '1'],
          ['1000000000', '1000000000000000000000000000'],
          ['0.123456789012345678', '123456789012345678']
        ].map(async ([amount, expectedWei]) => {
          const tx = await staker.buildDelegateTx({ validatorId: 1, amount })
          assert.equal(tx.value.toString(), expectedWei, `Failed for amount: ${amount}`)
        })
      )
    })

    it('should reject invalid validator ID', async () => {
      await expect(staker.buildDelegateTx({ validatorId: -1, amount: '100' })).to.be.rejectedWith(
        'Invalid validator ID'
      )

      await expect(staker.buildDelegateTx({ validatorId: 1.5, amount: '100' })).to.be.rejectedWith(
        'Invalid validator ID'
      )

      await expect(staker.buildDelegateTx({ validatorId: 2 ** 64, amount: '1' })).to.be.rejectedWith(
        'Invalid validator ID'
      )
    })

    it('should throw when not initialized', async () => {
      const uninitializedStaker = new MonadStaker({ rpcUrl: 'https://testnet-rpc.monad.xyz' })

      await expect(uninitializedStaker.buildDelegateTx({ validatorId: 1, amount: '100' })).to.be.rejectedWith(
        'MonadStaker not initialized'
      )
    })
  })

  // Note: buildUndelegateTx, buildWithdrawTx, buildCompoundTx, buildClaimRewardsTx require RPC calls for pre-flight checks
  // (e.g., checking withdrawal exists, sufficient stake, rewards available). Only input validation is tested here.

  describe('buildUndelegateTx - Validation', () => {
    it('should reject invalid delegator address', async () => {
      await expect(
        staker.buildUndelegateTx({
          delegatorAddress: 'invalid' as Address,
          validatorId: 1,
          amount: '50',
          withdrawalId: 0
        })
      ).to.be.rejectedWith('Invalid delegator address')
    })

    it('should reject invalid validator ID', async () => {
      await expect(
        staker.buildUndelegateTx({
          delegatorAddress: TEST_ADDRESS,
          validatorId: -1,
          amount: '50',
          withdrawalId: 0
        })
      ).to.be.rejectedWith('Invalid validator ID')
    })

    it('should reject out of range withdrawal ID', async () => {
      await expect(
        staker.buildUndelegateTx({
          delegatorAddress: TEST_ADDRESS,
          validatorId: 1,
          amount: '50',
          withdrawalId: 256
        })
      ).to.be.rejectedWith('Invalid withdrawal ID')

      await expect(
        staker.buildUndelegateTx({
          delegatorAddress: TEST_ADDRESS,
          validatorId: 1,
          amount: '50',
          withdrawalId: -1
        })
      ).to.be.rejectedWith('Invalid withdrawal ID')
    })
  })

  describe('buildWithdrawTx - Validation', () => {
    it('should reject invalid delegator address', async () => {
      await expect(
        staker.buildWithdrawTx({
          delegatorAddress: 'invalid' as Address,
          validatorId: 1,
          withdrawalId: 5
        })
      ).to.be.rejectedWith('Invalid delegator address')
    })

    it('should reject invalid validator ID', async () => {
      await expect(
        staker.buildWithdrawTx({
          delegatorAddress: TEST_ADDRESS,
          validatorId: -1,
          withdrawalId: 5
        })
      ).to.be.rejectedWith('Invalid validator ID')
    })

    it('should reject out of range withdrawal ID', async () => {
      await expect(
        staker.buildWithdrawTx({
          delegatorAddress: TEST_ADDRESS,
          validatorId: 1,
          withdrawalId: 300
        })
      ).to.be.rejectedWith('Invalid withdrawal ID')
    })
  })

  describe('buildCompoundTx - Validation', () => {
    it('should reject invalid delegator address', async () => {
      await expect(
        staker.buildCompoundTx({
          delegatorAddress: 'invalid' as Address,
          validatorId: 1
        })
      ).to.be.rejectedWith('Invalid delegator address')
    })

    it('should reject invalid validator ID', async () => {
      await expect(
        staker.buildCompoundTx({
          delegatorAddress: TEST_ADDRESS,
          validatorId: -1
        })
      ).to.be.rejectedWith('Invalid validator ID')
    })
  })

  describe('buildClaimRewardsTx - Validation', () => {
    it('should reject invalid delegator address', async () => {
      await expect(
        staker.buildClaimRewardsTx({
          delegatorAddress: 'invalid' as Address,
          validatorId: 1
        })
      ).to.be.rejectedWith('Invalid delegator address')
    })

    it('should reject invalid validator ID', async () => {
      await expect(
        staker.buildClaimRewardsTx({
          delegatorAddress: TEST_ADDRESS,
          validatorId: -1
        })
      ).to.be.rejectedWith('Invalid validator ID')
    })
  })
})
