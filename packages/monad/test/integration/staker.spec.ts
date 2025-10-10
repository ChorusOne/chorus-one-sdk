import 'dotenv/config'
import { describe, it, before } from 'mocha'
import { expect } from 'chai'
import { MonadTestStaker } from './testStaker'
import { parseEther, formatEther } from 'viem'

describe.skip('MonadStaker - integration', () => {
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

  it('should stake and increase pending stake', async function () {
    this.timeout(60000)

    const stakeAmount = '0.001'
    const stakeAmountWei = parseEther(stakeAmount)

    // Get delegator info before staking
    const delegatorBefore = await testStaker.staker.getDelegator({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress
    })
    const totalPendingBefore = delegatorBefore.deltaStake + delegatorBefore.nextDeltaStake

    // Stake
    const txHash = await testStaker.createAndDelegateStake(stakeAmount)
    expect(txHash).to.be.a('string')
    expect(txHash).to.match(/^0x/)

    // Get delegator info after staking
    const delegatorAfter = await testStaker.staker.getDelegator({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress
    })
    const totalPendingAfter = delegatorAfter.deltaStake + delegatorAfter.nextDeltaStake

    // Verify pending stake increased by staked amount
    const pendingIncrease = totalPendingAfter - totalPendingBefore
    expect(pendingIncrease).to.equal(stakeAmountWei, 'Pending stake should increase by staked amount')
  })

  it('should unstake and create withdrawal request', async function () {
    this.timeout(60000)

    const withdrawalId = 1

    // Check if there is active stake to unstake from
    const delegatorBefore = await testStaker.staker.getDelegator({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress
    })

    if (delegatorBefore.stake === 0n) {
      console.log('⏳ Skipping - no active stake available to unstake')
      console.log('   Note: Pending stake (deltaStake/nextDeltaStake) cannot be unstaked until active')
      this.skip()
      return
    }

    // Unstake from active stake (we can only unstake from the 'stake' field, not from pending)
    const unstakeAmount = delegatorBefore.stake
    const unstakeAmountMON = formatEther(unstakeAmount)

    // Unstake
    const txHash = await testStaker.unstake(unstakeAmountMON, withdrawalId)
    expect(txHash).to.be.a('string')
    expect(txHash).to.match(/^0x/)

    // Get delegator info after unstaking
    const delegatorAfter = await testStaker.staker.getDelegator({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress
    })

    // Verify active stake decreased by unstaked amount
    const activeStakeDecrease = delegatorBefore.stake - delegatorAfter.stake
    expect(activeStakeDecrease).to.equal(unstakeAmount, 'Active stake should decrease by unstaked amount')

    // Verify withdrawal request was created
    const withdrawalRequest = await testStaker.staker.getWithdrawalRequest({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress,
      withdrawalId
    })
    expect(withdrawalRequest.withdrawalAmount).to.equal(
      unstakeAmount,
      'Withdrawal request amount should match unstaked amount'
    )
    expect(withdrawalRequest.withdrawEpoch > 0n).to.be.true
  })

  it('should withdraw after delay period', async function () {
    this.timeout(60000)

    const withdrawalId = 1

    // Check for existing withdrawal request from unstake test
    const withdrawalRequest = await testStaker.staker.getWithdrawalRequest({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress,
      withdrawalId
    })

    if (withdrawalRequest.withdrawalAmount === 0n) {
      console.log('⏳ Skipping - no withdrawal request found')
      console.log('   Run the unstake test first to create a withdrawal request')
      this.skip()
      return
    }

    const currentEpoch = await testStaker.staker.getEpoch()

    if (currentEpoch.epoch < withdrawalRequest.withdrawEpoch) {
      console.log(
        `⏳ Skipping - withdrawal not ready yet. Current: ${currentEpoch.epoch}, Required: ${withdrawalRequest.withdrawEpoch}`
      )
      this.skip()
      return
    }

    // Withdraw
    const txHash = await testStaker.withdraw(withdrawalId)
    expect(txHash).to.be.a('string')
    expect(txHash).to.match(/^0x/)

    // Verify withdrawal request was cleared
    const withdrawalRequestAfter = await testStaker.staker.getWithdrawalRequest({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress,
      withdrawalId
    })
    expect(withdrawalRequestAfter.withdrawalAmount).to.equal(0n, 'Withdrawal request should be cleared')
  })

  it('should compound rewards if available', async function () {
    this.timeout(60000)

    // Check if there are rewards to compound
    const delegatorBefore = await testStaker.staker.getDelegator({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress
    })

    if (delegatorBefore.unclaimedRewards === 0n) {
      console.log('⏳ Skipping - no unclaimed rewards available to compound')
      this.skip()
      return
    }

    const rewardsAmount = delegatorBefore.unclaimedRewards
    const totalPendingBefore = delegatorBefore.deltaStake + delegatorBefore.nextDeltaStake

    // Compound
    const txHash = await testStaker.compound()
    expect(txHash).to.be.a('string')
    expect(txHash).to.match(/^0x/)

    // Get delegator info after compounding
    const delegatorAfter = await testStaker.staker.getDelegator({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress
    })
    const totalPendingAfter = delegatorAfter.deltaStake + delegatorAfter.nextDeltaStake

    // Verify rewards were compounded into pending stake
    expect(delegatorAfter.unclaimedRewards).to.equal(0n, 'Unclaimed rewards should be zero after compound')
    const pendingIncrease = totalPendingAfter - totalPendingBefore
    expect(pendingIncrease).to.equal(rewardsAmount, 'Pending stake should increase by compounded rewards amount')
  })

  it('should claim rewards if available', async function () {
    this.timeout(60000)

    // Check if there are rewards to claim
    const delegatorBefore = await testStaker.staker.getDelegator({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress
    })

    if (delegatorBefore.unclaimedRewards === 0n) {
      console.log('⏳ Skipping - no unclaimed rewards available to claim')
      this.skip()
      return
    }

    // Claim rewards
    const txHash = await testStaker.claimRewards()
    expect(txHash).to.be.a('string')
    expect(txHash).to.match(/^0x/)

    // Get delegator info after claiming
    const delegatorAfter = await testStaker.staker.getDelegator({
      validatorId: testStaker.validatorId,
      delegatorAddress: testStaker.ownerAddress
    })

    // Verify rewards were claimed
    expect(delegatorAfter.unclaimedRewards).to.equal(0n, 'Unclaimed rewards should be zero after claim')
  })
})
