import 'dotenv/config'
import { describe, it, before } from 'mocha'
import { expect } from 'chai'
import { HyperliquidTestStaker } from './testStaker'

describe.skip('HyperliquidStaker - integration', () => {
  let testStaker: HyperliquidTestStaker
  let delegatorAddress: `0x${string}`
  const validatorAddress = '0x172054cfc01b32effe0bf6af7a15b36e1ad730b3' as `0x${number}`

  before(async function () {
    this.timeout(30000)

    const mnemonic = process.env.TEST_HYPELIQUID_MNEMONIC

    if (!mnemonic) {
      throw new Error('TEST_HYPELIQUID_MNEMONIC environment variable is not set')
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

    const spotBalancesBefore = await testStaker.spotBalances(delegatorAddress)
    console.log(
      'spot balance before',
      spotBalancesBefore.filter((b) => b.coin === 'HYPE')
    )
    const hypeBalanceBefore = spotBalancesBefore.find((b) => b.coin === 'HYPE')?.total
    const stakingSummaryBefore = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary before', stakingSummaryBefore)
    await testStaker.moveFromSpotToStaking('0.0003')
    const spotBalancesAfter = await testStaker.spotBalances(delegatorAddress)
    console.log(
      'spot balance after',
      spotBalancesAfter.filter((b) => b.coin === 'HYPE')
    )
    const hypeBalanceAfter = spotBalancesAfter.find((b) => b.coin === 'HYPE')?.total
    const stakingSummaryAfter = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary after', stakingSummaryAfter)
    expect(Number(hypeBalanceAfter || '0')).to.be.lessThanOrEqual(Number(hypeBalanceBefore || '0'))
    expect(Number(stakingSummaryAfter.undelegated)).to.be.greaterThan(Number(stakingSummaryBefore.undelegated))
  })
  it('should successfully stake HYPE to validator', async () => {
    const stakingSummaryBefore = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary before', stakingSummaryBefore)
    const txHash = await testStaker.stake('0.0001')
    console.log('stake tx', txHash)
    const stakingSummaryAfter = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary after', stakingSummaryAfter)
    expect(Number(stakingSummaryAfter.delegated)).to.be.greaterThan(Number(stakingSummaryBefore.delegated))
  })
  it('should successfully unstake HYPE from validator', async () => {
    const stakingSummaryBefore = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary before', stakingSummaryBefore)
    const txHash = await testStaker.unstake('0.0001')
    console.log('undelegate tx', txHash)
    const stakingSummaryAfter = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary after', stakingSummaryAfter)
    expect(Number(stakingSummaryAfter.delegated)).to.be.lessThan(Number(stakingSummaryBefore.delegated))
  })
  it('should successfully withdraw undelegated HYPE to spot account', async () => {
    const stakingSummaryBefore = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary before', stakingSummaryBefore)
    const txHash = await testStaker.withdrawFromStakingToSpot('0.01')
    console.log('withdraw undelegated tx', txHash)
    const stakingSummaryAfter = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary after', stakingSummaryAfter)
    expect(Number(stakingSummaryAfter.undelegated)).to.be.lessThan(Number(stakingSummaryBefore.undelegated))
    expect(Number(stakingSummaryAfter.totalPendingWithdrawal)).to.be.greaterThan(
      Number(stakingSummaryBefore.totalPendingWithdrawal)
    )
  })
})
