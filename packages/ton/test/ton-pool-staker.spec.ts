import { describe, it } from 'mocha'
import { use, expect } from 'chai'
import { toNano } from '@ton/ton'
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
    it('should unstake', async () => {
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
        updatesEnabled: BigInt(1)
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

      expect(payloads.length).to.equal(1)

      payloads.forEach((payload) => {
        expect(payload.amount).to.be.a('bigint')
        expect(payload.amount).to.equal(toNano('2'))
      })
    })

    it('should unstake the maximum available amount', async () => {
      const poolStatusMock = createPoolStatusMock({
        balance: toNano('20000')
      })

      const memberMock = createMemberMock({
        balance: toNano('2.5'),
        pendingDeposit: toNano('2.5'),
        pendingWithdraw: toNano('2.5'),
        withdraw: toNano('5')
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
  })
})
