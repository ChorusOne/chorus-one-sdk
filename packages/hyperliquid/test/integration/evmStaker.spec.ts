import 'dotenv/config'
import { describe, it, before, Test } from 'mocha'
import { expect } from 'chai'
import { parseUnits, formatUnits } from 'viem'
import { CHORUS_ONE_HYPERLIQUID_VALIDATOR, DECIMALS } from '../../src/constants'
import { TestHyperliquidEvmStaker } from './testEvmStaker'

// These tests require a funded testnet account. They are skipped by default and can be
// enabled by removing the ".skip" modifier from the describe function. To run:
// export TEST_HYPE_MNEMONIC="your testnet mnemonic here"
// `npm run test:integration` in packages/hyperliquid

describe.skip('HyperliquidStaker - integration', () => {
  let testStaker: TestHyperliquidEvmStaker
  let delegatorAddress: `0x${string}`

  before(async function () {
    this.timeout(30000)

    const mnemonic = process.env.TEST_HYPE_MNEMONIC

    if (!mnemonic) {
      throw new Error('TEST_HYPE_MNEMONIC environment variable is not set')
    }

    testStaker = new TestHyperliquidEvmStaker({
      mnemonic,
      chain: 'Mainnet',
      validatorAddress: CHORUS_ONE_HYPERLIQUID_VALIDATOR
    })

    await testStaker.init()
    delegatorAddress = testStaker.ownerAddress
  })

  it.only('should read the spot balance', async () => {
    console.log('Fetch spot balance for address:', delegatorAddress)
    const spotBalance = await testStaker.spotBalances(delegatorAddress)
    console.log('Spot balance:', spotBalance)
  })
  it.skip('should read the staking summary', async () => {
    console.log('Fetch staking summary for address:', delegatorAddress)
    const stakingSummary = await testStaker.stakingInfo(delegatorAddress)
    console.log('Staking summary:', stakingSummary)
  })
  it.only("should move HYPE from EVM to Core's spot account", async function () {
    this.timeout(60000)

    const amountToMove = '0.0001' // Use a larger, more reasonable amount
    console.log(`\n=== Moving ${amountToMove} HYPE from EVM to Core's spot account ===`)

    // Check balance before
    const spotBalanceBefore = await testStaker.spotBalances(delegatorAddress)
    const evmBalanceBefore = await testStaker.getNativeEvmBalance(delegatorAddress)
    console.log('Before transfer:')
    console.log('  Spot balance:', spotBalanceBefore.total.toString())
    console.log('  EVM balance:', evmBalanceBefore.toString())

    // Execute transfer
    const txHash = await testStaker.moveFromEvmToSpot(amountToMove)
    console.log('\n✓ Transaction submitted:', txHash)

    console.log('  Explorer:', `https://hyperevmscan.io/tx/${txHash}`)

    // Wait for transfer to be processed (HyperCore processes EVM events with some delay)
    console.log('\nWaiting for HyperCore to process the transfer...')
    await new Promise((resolve) => setTimeout(resolve, 10000)) // Wait 10 seconds

    const res = await testStaker.verifyBridgeEvent('0xb0b2c0cd334eb4af26ba77fb549caf869a5e06df231ed1558578c02a1133c3fa')
    console.log('✓ Bridge event verified:', res)

    // Check balance after
    const spotBalanceAfter = await testStaker.spotBalances(delegatorAddress)
    const evmBalanceAfter = await testStaker.getNativeEvmBalance(delegatorAddress)
    console.log('\nAfter transfer (after 10s):')
    console.log('  Spot balance:', spotBalanceAfter.total.toString())
    console.log('  EVM balance:', evmBalanceAfter.toString())

    // Calculate changes
    const spotIncrease = spotBalanceAfter.total - spotBalanceBefore.total
    const evmDecrease = evmBalanceBefore - evmBalanceAfter
    console.log('\nBalance changes:')
    console.log('  Spot increased by:', spotIncrease.toString())
    console.log('  EVM decreased by:', evmDecrease.toString(), '(includes gas)')

    // The spot balance should have increased
    console.log(
      '\n' + (spotIncrease > 0n ? '✓ SUCCESS: HYPE transferred to spot!' : '❌ FAILED: Spot balance did not increase')
    )
  })

  it('should check balances and diagnose gas issue', async () => {
    console.log('\n=== Balance Diagnostic ===')
    console.log('Address:', delegatorAddress)

    // Check HyperCore spot balance
    const spotBalance = await testStaker.spotBalances(delegatorAddress)
    console.log('\n1. HyperCore Spot Balance (for trading/staking):')
    console.log('   Total:', spotBalance.total.toString())
    console.log('   Total (formatted):', formatUnits(spotBalance.total, DECIMALS), 'HYPE')
    console.log('   Hold:', spotBalance.hold.toString())
    console.log('   EntryNtl:', spotBalance.entryNtl.toString())

    // Check staking summary
    const stakingSummary = await testStaker.stakingInfo(delegatorAddress)
    console.log('\n2. HyperCore Staking Summary:')
    console.log('   Delegated:', stakingSummary.delegated.toString())
    console.log('   Undelegated:', stakingSummary.undelegated.toString())
    console.log('   Total Pending Withdrawal:', stakingSummary.totalPendingWithdrawal.toString())
    console.log('   # Pending Withdrawals:', stakingSummary.nPendingWithdrawals.toString())

    // Check native HyperEVM balance (used for gas)
    const evmBalance = await testStaker.getNativeEvmBalance(delegatorAddress)
    console.log('\n3. Native HyperEVM Balance (for gas fees):')
    console.log('   Balance:', evmBalance.toString())
    console.log('   Balance (formatted):', formatUnits(evmBalance, 18), 'HYPE')

    console.log('\n=== Diagnosis ===')
    if (evmBalance === 0n) {
      console.log('❌ PROBLEM: No native HYPE on HyperEVM for gas fees!')
      console.log('   You need to transfer HYPE from HyperCore to HyperEVM.')
      console.log('   From HyperCore UI: Send HYPE to 0x2222222222222222222222222222222222222222')
      console.log('   Cost: ~200k gas at base gas price')
    } else {
      console.log('✓ Native HyperEVM balance is sufficient for gas')
    }

    if (spotBalance.total === 0n) {
      console.log('❌ PROBLEM: No HYPE in HyperCore spot balance!')
      console.log('   You need HYPE in spot to move to staking.')
      console.log('')
      console.log('   To fix: Transfer HYPE from HyperEVM to HyperCore spot:')
      console.log('   - Run the "should move HYPE from EVM to Core\'s spot account" test')
      console.log('   - Or manually send native HYPE to 0x2222222222222222222222222222222222222222')
      console.log('   - Wait ~10 seconds for HyperCore to process the transfer')
    } else {
      console.log('✓ HyperCore spot balance exists')
      console.log(`   Amount: ${formatUnits(spotBalance.total, DECIMALS)} HYPE`)
    }
  })
  it.skip('should successfully stake HYPE to validator', async () => {
    const amountToStake = '0.0001'
    const stakingSummaryBefore = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary before', stakingSummaryBefore)
    const txHash = await testStaker.stake(amountToStake)
    console.log('stake tx', txHash)
    const stakingSummaryAfter = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary after', stakingSummaryAfter)
    expect(parseUnits(stakingSummaryAfter.delegated.toString(), DECIMALS)).to.be.equal(
      parseUnits(stakingSummaryBefore.delegated.toString(), DECIMALS) + parseUnits(amountToStake, DECIMALS)
    )
  })
  it.skip('should successfully unstake HYPE from validator', async () => {
    const amountToUnstake = '0.00005'
    const stakingSummaryBefore = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary before', stakingSummaryBefore)
    const txHash = await testStaker.unstake(amountToUnstake)
    console.log('undelegate tx', txHash)
    const stakingSummaryAfter = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary after', stakingSummaryAfter)
    expect(parseUnits(stakingSummaryAfter.delegated.toString(), DECIMALS)).to.be.equal(
      parseUnits(stakingSummaryBefore.delegated.toString(), DECIMALS) - parseUnits(amountToUnstake, DECIMALS)
    )
  })
  it.skip('should successfully withdraw undelegated HYPE to spot account', async () => {
    const amountToWithdraw = '0.01'
    const stakingSummaryBefore = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary before', stakingSummaryBefore)
    const txHash = await testStaker.withdrawFromStakingToSpot(amountToWithdraw)
    console.log('withdraw undelegated tx', txHash)
    const stakingSummaryAfter = await testStaker.stakingInfo(delegatorAddress)
    console.log('staking summary after', stakingSummaryAfter)
    expect(parseUnits(stakingSummaryAfter.undelegated.toString(), DECIMALS)).to.be.equal(
      parseUnits(stakingSummaryBefore.undelegated.toString(), DECIMALS) - parseUnits(amountToWithdraw, DECIMALS)
    )
    expect(parseUnits(stakingSummaryAfter.totalPendingWithdrawal.toString(), DECIMALS)).to.be.equal(
      parseUnits(stakingSummaryBefore.totalPendingWithdrawal.toString(), DECIMALS) +
        parseUnits(amountToWithdraw, DECIMALS)
    )
  })
})
