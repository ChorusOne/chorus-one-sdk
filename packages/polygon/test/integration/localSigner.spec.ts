import { type PublicClient, parseEther } from 'viem'
import { hardhat } from 'viem/chains'
import { assert } from 'chai'
import { fundWithStakingToken, impersonate, getStakingTokenBalance, getWithdrawalDelay, advanceEpoch } from './utils'
import { restoreToInitialState } from './setup'
import { PolygonTestStaker } from './testStaker'

const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
const AMOUNT = '100'

describe('PolygonStaker with LocalSigner', () => {
  let testStaker: PolygonTestStaker
  let publicClient: PublicClient

  afterEach(async () => {
    await restoreToInitialState()
  })

  beforeEach(async () => {
    testStaker = new PolygonTestStaker({
      mnemonic: TEST_MNEMONIC,
      rpcUrl: hardhat.rpcUrls.default.http[0]
    })
    await testStaker.init()

    publicClient = testStaker.publicClient

    await fundWithStakingToken({
      publicClient,
      recipientAddress: testStaker.delegatorAddress,
      amount: parseEther('10000')
    })

    await impersonate({ publicClient, address: testStaker.delegatorAddress })
  })

  it('derives address from mnemonic correctly', async () => {
    assert.isTrue(testStaker.delegatorAddress.startsWith('0x'))
    assert.equal(testStaker.delegatorAddress.length, 42)
  })

  it('approves and stakes using LocalSigner', async () => {
    await testStaker.approve(AMOUNT)

    const allowance = await testStaker.staker.getAllowance(testStaker.delegatorAddress)
    assert.equal(allowance, parseEther(AMOUNT))

    await testStaker.stake(AMOUNT)

    const stakeInfo = await testStaker.staker.getStake({
      delegatorAddress: testStaker.delegatorAddress,
      validatorShareAddress: testStaker.validatorShareAddress
    })
    assert.equal(stakeInfo.balance, AMOUNT)
  })

  it('unstakes using LocalSigner', async () => {
    await testStaker.approve(AMOUNT)
    await testStaker.stake(AMOUNT)

    const nonceBefore = await testStaker.staker.getUnbondNonce({
      delegatorAddress: testStaker.delegatorAddress,
      validatorShareAddress: testStaker.validatorShareAddress
    })

    await testStaker.unstake(AMOUNT)

    const nonceAfter = await testStaker.staker.getUnbondNonce({
      delegatorAddress: testStaker.delegatorAddress,
      validatorShareAddress: testStaker.validatorShareAddress
    })
    assert.equal(nonceAfter, nonceBefore + 1n)

    const stakeAfter = await testStaker.staker.getStake({
      delegatorAddress: testStaker.delegatorAddress,
      validatorShareAddress: testStaker.validatorShareAddress
    })
    assert.equal(stakeAfter.balance, '0')
  })

  it('withdraws using LocalSigner after unbonding period', async () => {
    await testStaker.approve(AMOUNT)
    await testStaker.stake(AMOUNT)
    await testStaker.unstake(AMOUNT)

    const nonce = await testStaker.staker.getUnbondNonce({
      delegatorAddress: testStaker.delegatorAddress,
      validatorShareAddress: testStaker.validatorShareAddress
    })

    const unbond = await testStaker.staker.getUnbond({
      delegatorAddress: testStaker.delegatorAddress,
      validatorShareAddress: testStaker.validatorShareAddress,
      unbondNonce: nonce
    })

    const withdrawalDelay = await getWithdrawalDelay({ publicClient })
    await advanceEpoch({
      publicClient,
      staker: testStaker.staker,
      targetEpoch: unbond.withdrawEpoch + withdrawalDelay
    })

    const balanceBefore = await getStakingTokenBalance({
      publicClient,
      address: testStaker.delegatorAddress
    })

    await testStaker.withdraw(nonce)

    const balanceAfter = await getStakingTokenBalance({
      publicClient,
      address: testStaker.delegatorAddress
    })
    assert.equal(balanceAfter - balanceBefore, parseEther(AMOUNT))
  })

  it('reports transaction status correctly', async () => {
    const txHash = await testStaker.approve(AMOUNT)

    const { status } = await testStaker.staker.getTxStatus({ txHash: txHash as `0x${string}` })
    assert.equal(status, 'success')
  })
})
