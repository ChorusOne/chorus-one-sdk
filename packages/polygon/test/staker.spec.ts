import { PolygonStaker } from '../src/staker'
import { EXCHANGE_RATE_PRECISION, EXCHANGE_RATE_HIGH_PRECISION } from '../src/constants'
import { describe, it, beforeEach } from 'mocha'
import { use, expect, assert } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import type { Address } from 'viem'
import { EXPECTED_APPROVE_TX, TEST_ADDRESS, TEST_VALIDATOR_SHARE } from './fixtures/expected-data'

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

    it('should reject invalid amounts', async () => {
      await expect(staker.buildApproveTx({ amount: '0' })).to.be.rejectedWith('Amount must be greater than 0')
      await expect(staker.buildApproveTx({ amount: '' })).to.be.rejectedWith('Amount cannot be empty')
      await expect(staker.buildApproveTx({ amount: 'invalid' })).to.be.rejectedWith('Amount must be a valid number')
    })
  })

  describe('address validation', () => {
    it('should reject invalid delegator address in buildStakeTx', async () => {
      await expect(
        staker.buildStakeTx({
          delegatorAddress: 'invalid' as Address,
          validatorShareAddress: TEST_VALIDATOR_SHARE,
          amount: '100',
          minSharesToMint: 0n
        })
      ).to.be.rejectedWith('Invalid delegator address')
    })

    it('should reject invalid validator share address in buildStakeTx', async () => {
      await expect(
        staker.buildStakeTx({
          delegatorAddress: TEST_ADDRESS,
          validatorShareAddress: 'invalid' as Address,
          amount: '100',
          minSharesToMint: 0n
        })
      ).to.be.rejectedWith('Invalid validator share address')
    })

    it('should reject invalid delegator address in buildUnstakeTx', async () => {
      await expect(
        staker.buildUnstakeTx({
          delegatorAddress: 'invalid' as Address,
          validatorShareAddress: TEST_VALIDATOR_SHARE,
          amount: '100',
          maximumSharesToBurn: 0n
        })
      ).to.be.rejectedWith('Invalid delegator address')
    })

    it('should reject invalid validator share address in buildUnstakeTx', async () => {
      await expect(
        staker.buildUnstakeTx({
          delegatorAddress: TEST_ADDRESS,
          validatorShareAddress: 'invalid' as Address,
          amount: '100',
          maximumSharesToBurn: 0n
        })
      ).to.be.rejectedWith('Invalid validator share address')
    })
  })

  describe('buildStakeTx slippage validation', () => {
    it('should reject when both slippageBps and minSharesToMint are provided', async () => {
      await expect(
        staker.buildStakeTx({
          delegatorAddress: TEST_ADDRESS,
          validatorShareAddress: TEST_VALIDATOR_SHARE,
          amount: '100',
          slippageBps: 50,
          minSharesToMint: 100n
        })
      ).to.be.rejectedWith('Cannot specify both slippageBps and minSharesToMint. Use one or the other.')
    })
  })

  describe('buildUnstakeTx slippage validation', () => {
    it('should reject when both slippageBps and maximumSharesToBurn are provided', async () => {
      await expect(
        staker.buildUnstakeTx({
          delegatorAddress: TEST_ADDRESS,
          validatorShareAddress: TEST_VALIDATOR_SHARE,
          amount: '100',
          slippageBps: 50,
          maximumSharesToBurn: 100n
        })
      ).to.be.rejectedWith('Cannot specify both slippageBps and maximumSharesToBurn. Use one or the other.')
    })
  })

  describe('getUnbonds', () => {
    it('should return empty array for empty nonces input', async () => {
      const result = await staker.getUnbonds({
        delegatorAddress: TEST_ADDRESS,
        validatorShareAddress: TEST_VALIDATOR_SHARE,
        unbondNonces: []
      })

      assert.isArray(result)
      assert.lengthOf(result, 0)
    })
  })

  describe('exchange rate precision constants', () => {
    it('should have correct EXCHANGE_RATE_PRECISION value', () => {
      assert.equal(EXCHANGE_RATE_PRECISION, 100n)
    })

    it('should have correct EXCHANGE_RATE_HIGH_PRECISION value', () => {
      assert.equal(EXCHANGE_RATE_HIGH_PRECISION, 10n ** 29n)
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
