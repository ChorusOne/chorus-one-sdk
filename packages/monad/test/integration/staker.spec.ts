import 'dotenv/config'
import { describe, it, before } from 'mocha'
import { expect } from 'chai'
import { MonadTestStaker } from './testStaker'

describe('MonadStaker - integration', () => {
  let testStaker: MonadTestStaker

  before(async function () {
    this.timeout(30000)

    const mnemonic = process.env.TEST_MONAD_MNEMONIC
    const rpcUrl = process.env.TEST_MONAD_RPC_URL

    if (!mnemonic) {
      throw new Error('TEST_MONAD_MNEMONIC environment variable is not set')
    }

    if (!rpcUrl) {
      throw new Error('TEST_MONAD_RPC_URL environment variable is not set')
    }

    testStaker = new MonadTestStaker({
      mnemonic,
      rpcUrl
    })

    await testStaker.init()
  })

  it('should get delegator info', async function () {
    this.timeout(30000)

    const delegatorInfo = await testStaker.staker.getDelegator({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress
    })

    expect(delegatorInfo).to.have.property('stake')
    expect(delegatorInfo).to.have.property('unclaimedRewards')
    expect(delegatorInfo).to.have.property('deltaStake')
    expect(delegatorInfo).to.have.property('nextDeltaStake')
    expect(delegatorInfo).to.have.property('deltaEpoch')
    expect(delegatorInfo).to.have.property('nextDeltaEpoch')
    expect(delegatorInfo).to.have.property('accRewardPerToken')

    expect(delegatorInfo.stake).to.be.a('bigint')
    expect(delegatorInfo.unclaimedRewards).to.be.a('bigint')
    expect(delegatorInfo.deltaStake).to.be.a('bigint')
    expect(delegatorInfo.nextDeltaStake).to.be.a('bigint')
  })

  it('should get current epoch info', async function () {
    this.timeout(30000)

    const epochInfo = await testStaker.staker.getEpoch()

    expect(epochInfo).to.have.property('epoch')
    expect(epochInfo).to.have.property('inEpochDelayPeriod')

    expect(epochInfo.epoch).to.be.a('bigint')
    expect(epochInfo.inEpochDelayPeriod).to.be.a('boolean')
  })

  it('should stake, unstake, and withdraw', async function () {
    this.timeout(120000)

    const stakeAmount = '0.001'
    const withdrawalId = 0

    const stakeTxHash = await testStaker.createAndDelegateStake(stakeAmount)
    expect(stakeTxHash).to.be.a('string')
    expect(stakeTxHash).to.match(/^0x/)

    await new Promise((resolve) => setTimeout(resolve, 5000))

    const delegatorInfoAfterStake = await testStaker.staker.getDelegator({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress
    })
    const totalPendingStake = delegatorInfoAfterStake.deltaStake + delegatorInfoAfterStake.nextDeltaStake
    expect(totalPendingStake > 0n).to.be.true

    const unstakeTxHash = await testStaker.unstake(stakeAmount, withdrawalId)
    expect(unstakeTxHash).to.be.a('string')
    expect(unstakeTxHash).to.match(/^0x/)

    await new Promise((resolve) => setTimeout(resolve, 5000))

    const withdrawalRequest = await testStaker.staker.getWithdrawalRequest({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress,
      withdrawalId
    })
    expect(withdrawalRequest.withdrawalAmount > 0n).to.be.true

    const currentEpoch = await testStaker.staker.getEpoch()
    if (currentEpoch.epoch >= withdrawalRequest.withdrawEpoch) {
      const withdrawTxHash = await testStaker.withdraw(withdrawalId)
      expect(withdrawTxHash).to.be.a('string')
      expect(withdrawTxHash).to.match(/^0x/)
    }
  })
})
