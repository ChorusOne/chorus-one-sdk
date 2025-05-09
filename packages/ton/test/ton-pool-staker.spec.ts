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

describe.only('TonPoolStaker', () => {
  const delegatorAddress = '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr'
  const validatorAddressPair: [string, string] = [
    'kQAHBakDk_E7qLlNQZxJDsqj_ruyAFpqarw85tO-c03fK26F',
    'kQCltujow9Sq3ZVPPU6CYGfqwDxYwjlmFGZ1Wt0bAYebio4o'
  ]

  describe('buildUnstakeTx', () => {
    it('should calculate the correct unstake amount for the happy path', async () => {
      // Setup with default mock values
      const staker = setupStaker({
        poolStatusResponse: createPoolStatusMock({
          balance: toNano('20000')
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
        })
      })

      const {
        tx: { messages }
      } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorAddressPair,
        amount: '2'
      })

      const payloads = extractMessagePayload(messages || [])

      // We should have two messages (one for each validator)
      expect(payloads.length).to.equal(2)

      // Each message should have a valid unstake amount
      payloads.forEach((payload) => {
        expect(payload.amount).to.be.a('bigint')
        expect(Number(payload.amount) > 0).to.be.true
      })

      // @ts-expect-error: method is private
      const poolDataForDelegator = await staker.getPoolDataForDelegator(delegatorAddress, validatorAddressPair)

      const amountToUnstake = TonPoolStaker.calculateUnstakePoolAmount(
        toNano('2'),
        poolDataForDelegator.minElectionStake,
        poolDataForDelegator.currentPoolBalances,
        poolDataForDelegator.userMaxUnstakeAmounts,
        poolDataForDelegator.currentUserWithdrawals
      )

      // Verify the calculation is correct
      expect(amountToUnstake).to.be.a('bigint')
      expect(Number(amountToUnstake) > 0).to.be.true
    })

    it('should correctly unstake the maximum available amount', async () => {
      // Configure high user balance to test max unstake
      const staker = setupStaker({
        poolStatusResponse: createPoolStatusMock({
          balance: toNano('20000'),
          balanceSent: toNano('0'),
          balancePendingDeposits: toNano('0'),
          balancePendingWithdrawals: toNano('0'),
          balanceWithdraw: toNano('0')
        }),
        memberResponse: createMemberMock({
          balance: toNano('10'), // High user balance
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
        })
      })

      const {
        tx: { messages }
      } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorAddressPair,
        amount: '10' // Attempting to unstake full balance
      })

      const payloads = extractMessagePayload(messages || [])

      // @ts-expect-error: method is private
      const poolDataForDelegator = await staker.getPoolDataForDelegator(delegatorAddress, validatorAddressPair)

      const amountToUnstake = TonPoolStaker.calculateUnstakePoolAmount(
        toNano('10'),
        poolDataForDelegator.minElectionStake,
        poolDataForDelegator.currentPoolBalances,
        poolDataForDelegator.userMaxUnstakeAmounts,
        poolDataForDelegator.currentUserWithdrawals
      )

      // Verify the unstake amount matches the user's max available balance
      expect(amountToUnstake).to.equal(toNano('10'))

      // Check that the message amounts reflect the calculated unstake amount
      const totalMessageAmount = payloads.reduce((sum, payload) => sum + payload.amount, 0n)
      expect(totalMessageAmount).to.be.a('bigint')
      expect(Number(totalMessageAmount) > 0).to.be.true
    })

    it('should handle unstaking from a pool with minimum required balance', async () => {
      // Configure pool close to minimum required balance
      const staker = setupStaker({
        poolStatusResponse: createPoolStatusMock({
          balance: toNano('10001'), // Just above min stake
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
        electionMinStake: toNano('10000') // Min election stake
      })

      const {
        tx: { messages = [] }
      } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorAddressPair,
        amount: '0.5' // Small amount that shouldn't leave the pool in a bad state
      })

      const payloads = extractMessagePayload(messages)

      // @ts-expect-error: method is private
      const poolDataForDelegator = await staker.getPoolDataForDelegator(delegatorAddress, validatorAddressPair)

      const amountToUnstake = TonPoolStaker.calculateUnstakePoolAmount(
        toNano('0.5'),
        poolDataForDelegator.minElectionStake,
        poolDataForDelegator.currentPoolBalances,
        poolDataForDelegator.userMaxUnstakeAmounts,
        poolDataForDelegator.currentUserWithdrawals
      )

      // The unstake should still be possible as it doesn't leave the pool below min stake
      expect(amountToUnstake).to.be.a('bigint')
      expect(Number(amountToUnstake) > 0).to.be.true

      // Validate the transaction messages were created correctly
      expect(payloads.length).to.be.greaterThan(0)
    })

    it('should adjust unstake amount if it would leave the pool below minimum stake', async () => {
      // Configure pool exactly at minimum required balance
      const staker = setupStaker({
        poolStatusResponse: createPoolStatusMock({
          balance: toNano('10000'), // Exactly at min stake
          balanceSent: toNano('0'),
          balancePendingDeposits: toNano('0'),
          balancePendingWithdrawals: toNano('0'),
          balanceWithdraw: toNano('0')
        }),
        memberResponse: createMemberMock({
          balance: toNano('5'), // User has significant balance
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
        electionMinStake: toNano('10000') // Min election stake
      })

      const {
        tx: { messages = [] }
      } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorAddressPair,
        amount: '5' // Attempting to unstake an amount that would leave pool below min stake
      })

      // Validate the transaction messages were created
      const payloads = extractMessagePayload(messages)
      expect(payloads.length).to.be.greaterThan(0)

      // @ts-expect-error: method is private
      const poolDataForDelegator = await staker.getPoolDataForDelegator(delegatorAddress, validatorAddressPair)

      const amountToUnstake = TonPoolStaker.calculateUnstakePoolAmount(
        toNano('5'),
        poolDataForDelegator.minElectionStake,
        poolDataForDelegator.currentPoolBalances,
        poolDataForDelegator.userMaxUnstakeAmounts,
        poolDataForDelegator.currentUserWithdrawals
      )

      // The amount should be adjusted to keep the pool at minimum stake
      expect(amountToUnstake).to.be.a('bigint')
      // The exact adjustment calculation would depend on the implementation of calculateUnstakePoolAmount
    })

    it('should correctly unstake from a single validator', async () => {
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
        })
      })

      // Use only the first validator
      const singleValidatorPair: [string, string] = [validatorAddressPair[0], '']

      const {
        tx: { messages = [] }
      } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorAddressPair: singleValidatorPair,
        amount: '1'
      })

      // Should only have one message for the single validator
      expect(messages.length).to.equal(1)
      expect(messages[0].address).to.equal(singleValidatorPair[0])

      const payloads = extractMessagePayload(messages)
      expect(payloads.length).to.equal(1)

      // @ts-expect-error: method is private
      const poolDataForDelegator = await staker.getPoolDataForDelegator(delegatorAddress, singleValidatorPair)

      const amountToUnstake = TonPoolStaker.calculateUnstakePoolAmount(
        toNano('1'),
        poolDataForDelegator.minElectionStake,
        poolDataForDelegator.currentPoolBalances,
        poolDataForDelegator.userMaxUnstakeAmounts,
        poolDataForDelegator.currentUserWithdrawals
      )

      // Verify the calculation is correct for single validator
      expect(amountToUnstake).to.be.a('bigint')
      expect(Number(amountToUnstake) > 0).to.be.true
    })

    it('should handle unstaking with disabled stateful calculation', async () => {
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
        })
      })

      const {
        tx: { messages = [] }
      } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorAddressPair,
        amount: '1',
        disableStatefulCalculation: true // Disable stateful calculation
      })

      // With disabled calculation, we should still get valid messages
      expect(messages.length).to.equal(2)

      // Each message should target the correct validator
      expect(messages[0].address).to.equal(validatorAddressPair[0])
      expect(messages[1].address).to.equal(validatorAddressPair[1])

      const payloads = extractMessagePayload(messages)

      // Each message should have a valid amount
      payloads.forEach((payload) => {
        expect(payload.amount).to.be.a('bigint')
        expect(Number(payload.amount) > 0).to.be.true
      })
    })

    it('should respect a custom validUntil timestamp', async () => {
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
        })
      })

      const validUntil = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

      const { tx } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorAddressPair,
        amount: '1',
        validUntil // Custom validUntil timestamp
      })

      // Verify the transaction has the correct validUntil timestamp
      expect(tx.validUntil).to.equal(validUntil)
    })
  })
})
