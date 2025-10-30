import 'dotenv/config'
import { describe, it, before } from 'mocha'
import { expect } from 'chai'
import { HyperliquidTestStaker } from './testStaker'
import { parseUnits } from 'viem'
import { DECIMALS } from '../../src/constants'

// These tests require a funded testnet account. They are skipped by default and can be
// enabled by removing the ".skip" modifier from the describe function. To run:
// export TEST_HYPE_MNEMONIC="your testnet mnemonic here"
// `npm run test:integration` in packages/hyperliquid

describe.skip('HyperliquidStaker - integration', () => {
  let testStaker: HyperliquidTestStaker
  let delegatorAddress: `0x${string}`
  const validatorAddress = '0x172054cfc01b32effe0bf6af7a15b36e1ad730b3' as `0x${number}`

  before(async function () {
    this.timeout(30000)

    const mnemonic = process.env.TEST_HYPE_MNEMONIC

    if (!mnemonic) {
      throw new Error('TEST_HYPE_MNEMONIC environment variable is not set')
    }

    testStaker = new HyperliquidTestStaker({
      mnemonic,
      chain: 'Testnet',
      validatorAddress
    })

    await testStaker.init()
    delegatorAddress = testStaker.ownerAddress
  })

  it('should successfully move HYPE from spot to staking', async () => {
    console.log('Move Hype from spot to staking account')
    const amountToMove = '0.0001'
    // before balances
    const spotBalancesBefore = (await testStaker.spotBalances(delegatorAddress)).filter((b) => b.coin === 'HYPE')
    console.log('spot balance before', spotBalancesBefore)
    const hypeBalanceBefore = spotBalancesBefore.find((b) => b.coin === 'HYPE')?.total ?? '0'
    const stakingSummaryBefore = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary before', stakingSummaryBefore)
    // make the tx
    await testStaker.moveFromSpotToStaking(amountToMove)
    // after balances
    const spotBalancesAfter = (await testStaker.spotBalances(delegatorAddress)).filter((b) => b.coin === 'HYPE')
    console.log('spot balance after', spotBalancesAfter)
    const hypeBalanceAfter = spotBalancesAfter.find((b) => b.coin === 'HYPE')?.total ?? '0'
    const stakingSummaryAfter = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary after', stakingSummaryAfter)
    expect(parseUnits(hypeBalanceAfter, DECIMALS)).to.be.equal(
      parseUnits(hypeBalanceBefore, DECIMALS) - parseUnits(amountToMove, DECIMALS)
    )
    expect(parseUnits(stakingSummaryAfter.undelegated, DECIMALS)).to.be.equal(
      parseUnits(stakingSummaryBefore.undelegated, DECIMALS) + parseUnits(amountToMove, DECIMALS)
    )
  })
  it('should successfully stake HYPE to validator', async () => {
    const amountToStake = '0.0001'
    const stakingSummaryBefore = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary before', stakingSummaryBefore)
    const txHash = await testStaker.stake(amountToStake)
    console.log('stake tx', txHash)
    const stakingSummaryAfter = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary after', stakingSummaryAfter)
    expect(parseUnits(stakingSummaryAfter.delegated, DECIMALS)).to.be.equal(
      parseUnits(stakingSummaryBefore.delegated, DECIMALS) + parseUnits(amountToStake, DECIMALS)
    )
  })
  it('should successfully unstake HYPE from validator', async () => {
    const amountToUnstake = '0.0001'
    const stakingSummaryBefore = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary before', stakingSummaryBefore)
    const txHash = await testStaker.unstake(amountToUnstake)
    console.log('undelegate tx', txHash)
    const stakingSummaryAfter = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary after', stakingSummaryAfter)
    expect(parseUnits(stakingSummaryAfter.delegated, DECIMALS)).to.be.equal(
      parseUnits(stakingSummaryBefore.delegated, DECIMALS) - parseUnits(amountToUnstake, DECIMALS)
    )
  })
  it('should successfully withdraw undelegated HYPE to spot account', async () => {
    const amountToWithdraw = '0.01'
    const stakingSummaryBefore = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary before', stakingSummaryBefore)
    const txHash = await testStaker.withdrawFromStakingToSpot(amountToWithdraw)
    console.log('withdraw undelegated tx', txHash)
    const stakingSummaryAfter = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary after', stakingSummaryAfter)
    expect(parseUnits(stakingSummaryAfter.undelegated, DECIMALS)).to.be.equal(
      parseUnits(stakingSummaryBefore.undelegated, DECIMALS) - parseUnits(amountToWithdraw, DECIMALS)
    )
    expect(parseUnits(stakingSummaryAfter.totalPendingWithdrawal, DECIMALS)).to.be.equal(
      parseUnits(stakingSummaryBefore.totalPendingWithdrawal, DECIMALS) + parseUnits(amountToWithdraw, DECIMALS)
    )
  })
})
