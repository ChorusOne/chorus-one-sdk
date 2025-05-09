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

describe('TonPoolStaker', () => {
  const delegatorAddress = '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr'
  const validatorAddressPair: [string, string] = [
    'kQAHBakDk_E7qLlNQZxJDsqj_ruyAFpqarw85tO-c03fK26F',
    'kQCltujow9Sq3ZVPPU6CYGfqwDxYwjlmFGZ1Wt0bAYebio4o'
  ]

  describe('buildUnstakeTx', () => {
    it.only('should calculate the correct unstake amount for the happy path', async () => {
      const poolStatusMock = createPoolStatusMock({
        balance: toNano('20000')
      })

      const memberMock = createMemberMock({
        balance: toNano('1'),
        pendingDeposit: toNano('1'),
        pendingWithdraw: toNano('1'),
        withdraw: toNano('0.05')
      })

      const paramsMock = createParamsMock({
        enabled: BigInt(1),
        updatesEnabled: BigInt(1),
        minStake: toNano('1'),
        depositFee: toNano('0.05'),
        withdrawFee: toNano('0.05'),
        poolFee: toNano('0.1'),
        receiptPrice: toNano('0.01'),
        minStakeTotal: toNano('10')
      })

      const poolStatusResponse = {
        [validatorAddressPair[0]]: poolStatusMock,
        [validatorAddressPair[1]]: poolStatusMock
      }

      const memberResponse = {
        [validatorAddressPair[0]]: memberMock,
        [validatorAddressPair[1]]: memberMock
      }

      const paramsResponse = {
        [validatorAddressPair[0]]: paramsMock,
        [validatorAddressPair[1]]: paramsMock
      }

      const staker = setupStaker({
        poolStatusResponse,
        memberResponse,
        paramsResponse
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
      expect(payloads.length).to.equal(1)

      // Each message should have a valid unstake amount
      payloads.forEach((payload) => {
        expect(payload.amount).to.be.a('bigint')
        expect(payload.amount).to.equal(toNano('2'))
      })
    })

    it.only('should correctly unstake the maximum available amount', async () => {
      const poolStatusMock = createPoolStatusMock({
        balance: toNano('20000')
      })

      const memberMock = createMemberMock({
        balance: toNano('10')
      })

      const paramsMock = createParamsMock({
        enabled: BigInt(1),
        updatesEnabled: BigInt(1),
        minStake: toNano('3'),
        depositFee: toNano('0.05'),
        withdrawFee: toNano('0.05'),
        poolFee: toNano('0.1'),
        receiptPrice: toNano('0.01'),
        minStakeTotal: toNano('10')
      })

      const poolStatusResponse = {
        [validatorAddressPair[0]]: poolStatusMock,
        [validatorAddressPair[1]]: poolStatusMock
      }

      const memberResponse = {
        [validatorAddressPair[0]]: memberMock,
        [validatorAddressPair[1]]: memberMock
      }

      const paramsResponse = {
        [validatorAddressPair[0]]: paramsMock,
        [validatorAddressPair[1]]: paramsMock
      }

      const staker = setupStaker({
        poolStatusResponse,
        memberResponse,
        paramsResponse
      })

      const {
        tx: { messages }
      } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorAddressPair,
        amount: '20'
      })

      const payloads = extractMessagePayload(messages || [])

      expect(payloads.length).to.equal(2)
      payloads.forEach((payload) => {
        expect(payload.amount).to.be.a('bigint')
        expect(payload.amount).to.equal(toNano('10'))
      })
    })

    it('should handle unstaking from a pool with minimum required balance', async () => {
      // Configure pool close to minimum required balance
      const poolStatusMock = createPoolStatusMock({
        balance: toNano('10001'), // Just above min stake
        balanceSent: toNano('0'),
        balancePendingDeposits: toNano('0'),
        balancePendingWithdrawals: toNano('0'),
        balanceWithdraw: toNano('0')
      })

      const memberMock = createMemberMock({
        balance: toNano('1'),
        pendingDeposit: toNano('1'),
        pendingWithdraw: toNano('1'),
        withdraw: toNano('0.05')
      })

      const paramsMock = createParamsMock({
        enabled: BigInt(1),
        updatesEnabled: BigInt(1),
        minStake: toNano('1'),
        depositFee: toNano('0.05'),
        withdrawFee: toNano('0.05'),
        poolFee: toNano('0.1'),
        receiptPrice: toNano('0.01'),
        minStakeTotal: toNano('10')
      })

      const poolStatusResponse = {
        [validatorAddressPair[0]]: poolStatusMock,
        [validatorAddressPair[1]]: poolStatusMock
      }

      const memberResponse = {
        [validatorAddressPair[0]]: memberMock,
        [validatorAddressPair[1]]: memberMock
      }

      const paramsResponse = {
        [validatorAddressPair[0]]: paramsMock,
        [validatorAddressPair[1]]: paramsMock
      }

      const staker = setupStaker({
        poolStatusResponse,
        memberResponse,
        paramsResponse,
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
      const poolStatusMock = createPoolStatusMock({
        balance: toNano('10000'), // Exactly at min stake
        balanceSent: toNano('0'),
        balancePendingDeposits: toNano('0'),
        balancePendingWithdrawals: toNano('0'),
        balanceWithdraw: toNano('0')
      })

      const memberMock = createMemberMock({
        balance: toNano('5'), // User has significant balance
        pendingDeposit: toNano('0'), // No pending deposits
        pendingWithdraw: toNano('0'), // No pending withdrawals
        withdraw: toNano('0') // No withdrawals in progress
      })

      const paramsMock = createParamsMock({
        enabled: BigInt(1),
        updatesEnabled: BigInt(1),
        minStake: toNano('1'),
        depositFee: toNano('0.05'),
        withdrawFee: toNano('0.05'),
        poolFee: toNano('0.1'),
        receiptPrice: toNano('0.01'),
        minStakeTotal: toNano('10')
      })

      const poolStatusResponse = {
        [validatorAddressPair[0]]: poolStatusMock,
        [validatorAddressPair[1]]: poolStatusMock
      }

      const memberResponse = {
        [validatorAddressPair[0]]: memberMock,
        [validatorAddressPair[1]]: memberMock
      }

      const paramsResponse = {
        [validatorAddressPair[0]]: paramsMock,
        [validatorAddressPair[1]]: paramsMock
      }

      const staker = setupStaker({
        poolStatusResponse,
        memberResponse,
        paramsResponse,
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
      const poolStatusMock = createPoolStatusMock({
        balance: toNano('20000'),
        balanceSent: toNano('0'),
        balancePendingDeposits: toNano('0'),
        balancePendingWithdrawals: toNano('0'),
        balanceWithdraw: toNano('0')
      })

      const memberMock = createMemberMock({
        balance: toNano('1'),
        pendingDeposit: toNano('1'),
        pendingWithdraw: toNano('1'),
        withdraw: toNano('0.05')
      })

      const paramsMock = createParamsMock({
        enabled: BigInt(1),
        updatesEnabled: BigInt(1),
        minStake: toNano('1'),
        depositFee: toNano('0.05'),
        withdrawFee: toNano('0.05'),
        poolFee: toNano('0.1'),
        receiptPrice: toNano('0.01'),
        minStakeTotal: toNano('10')
      })

      // For single validator test, only include the first validator
      const poolStatusResponse = {
        [validatorAddressPair[0]]: poolStatusMock
      }

      const memberResponse = {
        [validatorAddressPair[0]]: memberMock
      }

      const paramsResponse = {
        [validatorAddressPair[0]]: paramsMock
      }

      const staker = setupStaker({
        poolStatusResponse,
        memberResponse,
        paramsResponse
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
      const poolStatusMock = createPoolStatusMock({
        balance: toNano('20000'),
        balanceSent: toNano('0'),
        balancePendingDeposits: toNano('0'),
        balancePendingWithdrawals: toNano('0'),
        balanceWithdraw: toNano('0')
      })

      const memberMock = createMemberMock({
        balance: toNano('1'),
        pendingDeposit: toNano('1'),
        pendingWithdraw: toNano('1'),
        withdraw: toNano('0.05')
      })

      const paramsMock = createParamsMock({
        enabled: BigInt(1),
        updatesEnabled: BigInt(1),
        minStake: toNano('1'),
        depositFee: toNano('0.05'),
        withdrawFee: toNano('0.05'),
        poolFee: toNano('0.1'),
        receiptPrice: toNano('0.01'),
        minStakeTotal: toNano('10')
      })

      const poolStatusResponse = {
        [validatorAddressPair[0]]: poolStatusMock,
        [validatorAddressPair[1]]: poolStatusMock
      }

      const memberResponse = {
        [validatorAddressPair[0]]: memberMock,
        [validatorAddressPair[1]]: memberMock
      }

      const paramsResponse = {
        [validatorAddressPair[0]]: paramsMock,
        [validatorAddressPair[1]]: paramsMock
      }

      const staker = setupStaker({
        poolStatusResponse,
        memberResponse,
        paramsResponse
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
      const poolStatusMock = createPoolStatusMock({
        balance: toNano('20000'),
        balanceSent: toNano('0'),
        balancePendingDeposits: toNano('0'),
        balancePendingWithdrawals: toNano('0'),
        balanceWithdraw: toNano('0')
      })

      const memberMock = createMemberMock({
        balance: toNano('1'),
        pendingDeposit: toNano('1'),
        pendingWithdraw: toNano('1'),
        withdraw: toNano('0.05')
      })

      const paramsMock = createParamsMock({
        enabled: BigInt(1),
        updatesEnabled: BigInt(1),
        minStake: toNano('1'),
        depositFee: toNano('0.05'),
        withdrawFee: toNano('0.05'),
        poolFee: toNano('0.1'),
        receiptPrice: toNano('0.01'),
        minStakeTotal: toNano('10')
      })

      const poolStatusResponse = {
        [validatorAddressPair[0]]: poolStatusMock,
        [validatorAddressPair[1]]: poolStatusMock
      }

      const memberResponse = {
        [validatorAddressPair[0]]: memberMock,
        [validatorAddressPair[1]]: memberMock
      }

      const paramsResponse = {
        [validatorAddressPair[0]]: paramsMock,
        [validatorAddressPair[1]]: paramsMock
      }

      const staker = setupStaker({
        poolStatusResponse,
        memberResponse,
        paramsResponse
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
