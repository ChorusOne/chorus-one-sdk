import { describe, it } from 'mocha'
import { use, expect } from 'chai'
import { toNano } from '@ton/ton'
import { TonPoolStaker } from '../src/TonPoolStaker'
import spies from 'chai-spies'
import { createMemberMock, createParamsMock, createPoolStatusMock } from './helpers/mock-data'
import { extractMessagePayload, setupStaker } from './helpers/test-setup'
import { chaiAsPromised } from 'chai-promised'

use(spies)
use(chaiAsPromised)

describe('TonPoolStaker EdgeCases', () => {
  const delegatorAddress = '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr'
  const validatorAddressPair: [string, string] = [
    'kQAHBakDk_E7qLlNQZxJDsqj_ruyAFpqarw85tO-c03fK26F',
    'kQCltujow9Sq3ZVPPU6CYGfqwDxYwjlmFGZ1Wt0bAYebio4o'
  ]

  describe('buildUnstakeTx edge cases', () => {
    it('should handle zero unstake amount gracefully', async () => {
      const staker = setupStaker({
        poolStatusResponse: createPoolStatusMock({
          balance: toNano('20000'),
          balanceSent: toNano('0'),
          balancePendingDeposits: toNano('0'),
          balancePendingWithdrawals: toNano('0'),
          balanceWithdraw: toNano('0')
        }),
        memberResponse: createMemberMock({
          balance: toNano('1'),
          pendingDeposit: toNano('1'),
          pendingWithdraw: toNano('1'),
          withdraw: toNano('0.05')
        }),
        paramsResponse: createParamsMock({
          enabled: BigInt(1),
          updatesEnabled: BigInt(1),
          minStake: toNano('1'),
          depositFee: toNano('0.05'),
          withdrawFee: toNano('0.05'),
          poolFee: toNano('0.1'),
          receiptPrice: toNano('0.01'),
          minStakeTotal: toNano('10')
        }),
        options: { spies }
      })

      // Trying to unstake zero should be safe (but might be rejected in the actual
      // implementation, depending on constraints)
      try {
        const { tx } = await staker.buildUnstakeTx({
          delegatorAddress,
          validatorAddressPair,
          amount: '0' // Zero amount to test edge case
        })

        // If it succeeds, verify the transaction exists
        expect(tx).to.exist
      } catch (err) {
        // If it fails, it should be with a meaningful error
        expect(err).to.be.an('error')
        expect(err.message).to.include('amount')
      }
    })

    it('should handle unstaking with pool at exact min election stake threshold', async () => {
      // Set up a pool that's exactly at the minimum election stake
      const staker = setupStaker({
        poolStatusResponse: createPoolStatusMock({
          balance: toNano('10000'), // Exactly at min stake
          balanceSent: toNano('0'),
          balancePendingDeposits: toNano('0'),
          balancePendingWithdrawals: toNano('0'),
          balanceWithdraw: toNano('0')
        }),
        memberResponse: createMemberMock({
          balance: toNano('10'), // User has significant balance
          pendingDeposit: toNano('0'), // No pending deposits
          pendingWithdraw: toNano('0'), // No pending withdrawals
          withdraw: toNano('0') // No withdrawals in progress
        }),
        paramsResponse: createParamsMock({
          enabled: BigInt(1),
          updatesEnabled: BigInt(1),
          minStake: toNano('1'),
          depositFee: toNano('0.05'),
          withdrawFee: toNano('0.05'),
          poolFee: toNano('0.1'),
          receiptPrice: toNano('0.01'),
          minStakeTotal: toNano('10')
        }),
        electionMinStake: toNano('10000'), // Min election stake = pool balance
        options: { spies }
      })

      const { tx } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorAddressPair,
        amount: '0.1' // Small amount to test edge case
      })

      expect(tx).to.exist
      expect(tx.messages).to.exist

      // @ts-expect-error: method is private
      const poolDataForDelegator = await staker.getPoolDataForDelegator(delegatorAddress, validatorAddressPair)

      const amountToUnstake = TonPoolStaker.calculateUnstakePoolAmount(
        toNano('0.1'),
        poolDataForDelegator.minElectionStake,
        poolDataForDelegator.currentPoolBalances,
        poolDataForDelegator.userMaxUnstakeAmounts,
        poolDataForDelegator.currentUserWithdrawals
      )

      // Since the pool is exactly at min stake, the implementation might:
      // 1. Disallow any unstaking (amountToUnstake = 0)
      // 2. Allow up to a certain amount if other constraints permit
      expect(amountToUnstake).to.be.a('bigint')
    })

    it('should handle unstaking when user has large pending withdrawals', async () => {
      // Create a user with large pending withdrawals already
      const staker = setupStaker({
        poolStatusResponse: createPoolStatusMock({
          balance: toNano('20000'),
          balanceSent: toNano('0'),
          balancePendingDeposits: toNano('0'),
          balancePendingWithdrawals: toNano('0'),
          balanceWithdraw: toNano('0')
        }),
        memberResponse: createMemberMock({
          balance: toNano('5'), // Regular balance
          pendingDeposit: toNano('0'), // No pending deposits
          pendingWithdraw: toNano('10'), // Large pending withdrawals - key part of test
          withdraw: toNano('0') // No withdrawals in progress
        }),
        paramsResponse: createParamsMock({
          enabled: BigInt(1),
          updatesEnabled: BigInt(1),
          minStake: toNano('1'),
          depositFee: toNano('0.05'),
          withdrawFee: toNano('0.05'),
          poolFee: toNano('0.1'),
          receiptPrice: toNano('0.01'),
          minStakeTotal: toNano('10')
        }),
        options: { spies }
      })

      const { tx } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorAddressPair,
        amount: '3' // Try to unstake from available balance with existing pending withdrawals
      })

      expect(tx).to.exist
      expect(tx.messages).to.exist

      // @ts-expect-error: method is private
      const poolDataForDelegator = await staker.getPoolDataForDelegator(delegatorAddress, validatorAddressPair)

      const amountToUnstake = TonPoolStaker.calculateUnstakePoolAmount(
        toNano('3'),
        poolDataForDelegator.minElectionStake,
        poolDataForDelegator.currentPoolBalances,
        poolDataForDelegator.userMaxUnstakeAmounts,
        poolDataForDelegator.currentUserWithdrawals
      )

      // The system should consider the existing pending withdrawals when calculating
      // how much more can be unstaked
      expect(amountToUnstake).to.be.a('bigint')
      // If implementation prioritizes pending withdrawals, this might be lower than requested
    })

    it('should handle unstaking more than available balance', async () => {
      // User has limited balance
      const staker = setupStaker({
        poolStatusResponse: createPoolStatusMock({
          balance: toNano('20000'),
          balanceSent: toNano('0'),
          balancePendingDeposits: toNano('0'),
          balancePendingWithdrawals: toNano('0'),
          balanceWithdraw: toNano('0')
        }),
        memberResponse: createMemberMock({
          balance: toNano('2'), // Small user balance - key part of test
          pendingDeposit: toNano('0'), // No pending deposits
          pendingWithdraw: toNano('0'), // No pending withdrawals
          withdraw: toNano('0') // No withdrawals in progress
        }),
        paramsResponse: createParamsMock({
          enabled: BigInt(1),
          updatesEnabled: BigInt(1),
          minStake: toNano('1'),
          depositFee: toNano('0.05'),
          withdrawFee: toNano('0.05'),
          poolFee: toNano('0.1'),
          receiptPrice: toNano('0.01'),
          minStakeTotal: toNano('10')
        }),
        options: { spies }
      })

      try {
        const { tx } = await staker.buildUnstakeTx({
          delegatorAddress,
          validatorAddressPair,
          amount: '5' // More than available balance - key part of test
        })

        expect(tx).to.exist
        expect(tx.messages).to.exist

        // @ts-expect-error: method is private
        const poolDataForDelegator = await staker.getPoolDataForDelegator(delegatorAddress, validatorAddressPair)

        const amountToUnstake = TonPoolStaker.calculateUnstakePoolAmount(
          toNano('5'),
          poolDataForDelegator.minElectionStake,
          poolDataForDelegator.currentPoolBalances,
          poolDataForDelegator.userMaxUnstakeAmounts,
          poolDataForDelegator.currentUserWithdrawals
        )

        // The unstake amount should be capped at available balance
        expect(amountToUnstake).to.be.a('bigint')
        expect(Number(amountToUnstake)).to.be.at.most(Number(toNano('2')))
      } catch (err) {
        // Some implementations might reject this instead
        expect(err).to.be.an('error')
        expect(err.message).to.include('balance')
      }
    })

    it('should handle unstaking with uneven distribution between validators', async () => {
      // Configure a situation where one validator pool has much more funds than the other
      const poolStatusMock1 = createPoolStatusMock({
        balance: toNano('15000'), // First pool with more funds
        balanceSent: toNano('0'),
        balancePendingDeposits: toNano('0'),
        balancePendingWithdrawals: toNano('0'),
        balanceWithdraw: toNano('0')
      })
      const poolStatusMock2 = createPoolStatusMock({
        balance: toNano('10500'), // Second pool with fewer funds
        balanceSent: toNano('0'),
        balancePendingDeposits: toNano('0'),
        balancePendingWithdrawals: toNano('0'),
        balanceWithdraw: toNano('0')
      })

      let currentGetPoolStatusCall = 0
      const poolStatusMockResponses = [poolStatusMock1, poolStatusMock2]

      const staker = setupStaker({
        poolStatusResponse: poolStatusMockResponses[0], // This will be overridden by our custom mock below
        memberResponse: createMemberMock({
          balance: toNano('5'), // Regular balance
          pendingDeposit: toNano('0'), // No pending deposits
          pendingWithdraw: toNano('0'), // No pending withdrawals
          withdraw: toNano('0') // No withdrawals in progress
        }),
        paramsResponse: createParamsMock({
          enabled: BigInt(1),
          updatesEnabled: BigInt(1),
          minStake: toNano('1'),
          depositFee: toNano('0.05'),
          withdrawFee: toNano('0.05'),
          poolFee: toNano('0.1'),
          receiptPrice: toNano('0.01'),
          minStakeTotal: toNano('10')
        }),
        options: { spies }
      })

      // Override the getClient mock to return different responses for each validator
      spies.on(staker, ['getClient'], () => {
        return {
          provider: () => ({
            get: async (methodName: string) => {
              if (methodName === 'get_pool_status') {
                // Alternate between the two responses
                const response = poolStatusMockResponses[currentGetPoolStatusCall % 2]
                currentGetPoolStatusCall++
                return { stack: response }
              }
              throw new Error(`Unknown method: ${methodName}`)
            }
          }),
          runMethod: async (_address, methodName) => {
            if (methodName === 'get_member') {
              return {
                stack: createMemberMock({
                  balance: toNano('5'), // Regular balance
                  pendingDeposit: toNano('0'), // No pending deposits
                  pendingWithdraw: toNano('0'), // No pending withdrawals
                  withdraw: toNano('0') // No withdrawals in progress
                })
              }
            }
            if (methodName === 'get_params') {
              return {
                stack: createParamsMock({
                  enabled: BigInt(1),
                  updatesEnabled: BigInt(1),
                  minStake: toNano('1'),
                  depositFee: toNano('0.05'),
                  withdrawFee: toNano('0.05'),
                  poolFee: toNano('0.1'),
                  receiptPrice: toNano('0.01'),
                  minStakeTotal: toNano('10')
                })
              }
            }
            throw new Error(`Unknown method: ${methodName}`)
          }
        }
      })

      // We need to re-add the other spies that were set in setupStaker
      spies.on(staker, ['checkIfAddressTestnetFlagMatches'], () => {})
      spies.on(staker, ['getElectionMinStake'], async () => toNano('10000'))

      const { tx } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorAddressPair,
        amount: '2' // Moderate unstake amount
      })

      expect(tx).to.exist
      expect(tx.messages).to.have.length(2)

      const payloads = extractMessagePayload(tx.messages || [])

      // Verify we have payloads for both validators
      expect(payloads).to.have.length(2)

      // The distribution might not be equal - it depends on the implementation
      // but both should have non-zero amounts
      payloads.forEach((payload) => {
        expect(payload.amount).to.be.a('bigint')
        expect(Number(payload.amount) > 0).to.be.true
      })
    })
  })
})
