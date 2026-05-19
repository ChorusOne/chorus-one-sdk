import 'dotenv/config'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { describe, it, before } from 'mocha'
import { use, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import spies from 'chai-spies'
import { SolanaTestStaker } from './testStaker'
import { macroToDenomAmount, getDenomMultiplier } from '../../src/tx'

// Use chai-as-promised plugin for async tests
use(chaiAsPromised)
use(spies)

describe('SolanaStake - integration', () => {
  let testStaker: SolanaTestStaker

  before(async function () {
    this.timeout(10000)
    const mnemonic = process.env.TEST_SOLANA_MNEMONIC
    if (!mnemonic) {
      throw new Error('TEST_SOLANA_MNEMONIC environment variable is not set')
    }

    testStaker = new SolanaTestStaker({
      mnemonic,
      rpcUrl: 'https://api.devnet.solana.com'
    })

    await testStaker.init()

    await testStaker.requestAirdropIfNeeded(new PublicKey(testStaker.ownerAddress), 0.1, 2)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  })
  beforeEach(async function () {
    this.timeout(30000)
    await testStaker.cleanupAllStakeAccounts()
  })

  it('should create and delegate a stake account, unstake and withdraw', async () => {
    // Check stake accounts before creating a new one
    const allStakeAccountsBefore = await testStaker.getStakeAccounts(null)
    const allStakeAccountsBeforeCount = allStakeAccountsBefore.accounts.length

    // create and delegate a stake account
    const stakeAccountAddress = await testStaker.createAndDelegateStake('1.05')
    const stakeAccountsAfterCreation = await testStaker.getStakeAccounts(null)
    const stakeAccountsAfterCreationCount = stakeAccountsAfterCreation.accounts.length
    expect(stakeAccountsAfterCreationCount).to.equal(allStakeAccountsBeforeCount + 1)
    const stakeAccount = stakeAccountsAfterCreation.accounts.find((account) => account.address === stakeAccountAddress)
    expect(stakeAccount).to.exist
    expect(stakeAccount!.state).to.equal('delegated')

    // unstake
    const statusUnstake = await testStaker.undelegateStake(stakeAccountAddress)
    expect(statusUnstake).to.equal('success')

    // withdraw
    const statusWithdraw = await testStaker.withdrawStake(stakeAccountAddress)
    expect(statusWithdraw).to.equal('success')
    const stakeAccountsAfterWithdraw = await testStaker.getStakeAccounts(null)
    const stakeAccountsAfterWithdrawCount = stakeAccountsAfterWithdraw.accounts.length
    expect(stakeAccountsAfterWithdrawCount).to.equal(allStakeAccountsBeforeCount)
  }).timeout(60000)
  it('should stake and split the stake account', async () => {
    const stakeAmount = 2.1
    const stakeAccountAddress = await testStaker.createAndDelegateStake(stakeAmount.toString())

    // split the stake account
    const { status, newStakeAccountAddress } = await testStaker.splitStake(stakeAccountAddress, '1.05')
    expect(status).to.equal('success')
    const {
      accounts: [oldStakeAccount]
    } = await testStaker.getStakeAccounts(stakeAccountAddress)
    expect(oldStakeAccount.state).to.equal('delegated')
    expect(oldStakeAccount.amount).to.be.equal(1_050_000_000)

    // check the new stake account balance
    const {
      accounts: [newStakeAccount]
    } = await testStaker.getStakeAccounts(newStakeAccountAddress)
    expect(newStakeAccount.state).to.equal('delegated')
    expect(newStakeAccount.amount).to.be.greaterThan(1_000_000_000)
  }).timeout(60000)
})

describe('Solana staker - partial unstake - happy path 🙂', () => {
  let testStaker: SolanaTestStaker

  before(async function () {
    this.timeout(10000)
    const mnemonic = process.env.TEST_SOLANA_MNEMONIC
    if (!mnemonic) {
      throw new Error('TEST_SOLANA_MNEMONIC environment variable is not set')
    }

    testStaker = new SolanaTestStaker({
      mnemonic,
      rpcUrl: 'https://api.devnet.solana.com'
    })

    await testStaker.init()

    await testStaker.requestAirdropIfNeeded(new PublicKey(testStaker.ownerAddress), 1, 5)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  })
  beforeEach(async function () {
    this.timeout(60000)
    const { accounts } = await testStaker.getStakeAccounts(null)
    const delegated = accounts.filter((a) => a.state === 'delegated')
    const deactivating = accounts.filter((a) => a.state === 'deactivating')
    const undelegated = accounts.filter((a) => a.state === 'undelegated')
    console.log(
      `🧹 Cleaning up before test: ${delegated.length} delegated, ${deactivating.length} deactivating, ${undelegated.length} undelegated, total: ${accounts.length}`
    )
    await testStaker.cleanupAllStakeAccounts()
    const { accounts: postCleanup } = await testStaker.getStakeAccounts(null)
    const delegatedAfter = postCleanup.filter((a) => a.state === 'delegated')
    expect(delegatedAfter.length).to.equal(0)
    console.log(`✅ Cleaned up all stake accounts before the test.`)
  })
  it('should unstake partial amount - one stake account', async () => {
    // Stake/unstake both ≥ 1 SOL on each side of the split (SIMD-0033 min delegation).
    const stakeAmountLamports = 2_500_000_000
    const stakeAmountSol = stakeAmountLamports / LAMPORTS_PER_SOL

    const stakeAccountAddress = await testStaker.createAndDelegateStake(stakeAmountSol.toString())
    console.log(`🟢 Staked ${stakeAmountSol} SOL → ${stakeAccountAddress}`)

    const [createdAccount] = (await testStaker.getStakeAccounts(stakeAccountAddress)).accounts
    expect(createdAccount).to.exist
    expect(createdAccount.state).to.equal('delegated')

    const unstakeLamports = 1_200_000_000
    const unstakeSol = unstakeLamports / LAMPORTS_PER_SOL
    console.log(`🔻 Unstaking ${unstakeSol} SOL (${unstakeLamports} lamports)`)

    const { statuses } = await testStaker.undelegatePartialStake(unstakeSol.toString())
    expect(statuses.length).to.be.greaterThan(0)
    statuses.forEach((s) => expect(s).to.equal('success'))

    const [remainingAccount] = (await testStaker.getStakeAccounts(stakeAccountAddress)).accounts
    expect(remainingAccount).to.exist
    expect(remainingAccount.state).to.equal('delegated')

    const expectedRemaining = stakeAmountLamports - unstakeLamports
    console.log(`📊 Expected remaining: ${expectedRemaining} lamports (${expectedRemaining / LAMPORTS_PER_SOL} SOL)`)
    console.log(
      `📦 Actual remaining:   ${remainingAccount.amount} lamports (${remainingAccount.amount / LAMPORTS_PER_SOL} SOL)`
    )

    expect(remainingAccount.amount).to.equal(expectedRemaining)
  }).timeout(60000)
  it('should split the smallest viable account when the unstake fits within one account', async () => {
    const denomMultiplier = getDenomMultiplier()
    // Each stake ≥ 2 SOL so a split leaves ≥ 1 SOL on both sides (SIMD-0033).
    const smallLamports = macroToDenomAmount('2.01', denomMultiplier)
    const midLamports = macroToDenomAmount('2.05', denomMultiplier)
    const largeLamports = macroToDenomAmount('2.1', denomMultiplier)

    const stakeAmounts = [smallLamports, midLamports, largeLamports]
    const stakeAccountsMap = new Map<string, number>()

    for (const amount of stakeAmounts) {
      const solAmount = amount / LAMPORTS_PER_SOL
      const addr = await testStaker.createAndDelegateStake(solAmount.toString())
      stakeAccountsMap.set(addr, amount)
      console.log(`🟢 Staked ${solAmount} SOL → ${addr}`)
    }

    // 1 SOL is the smallest viable unstake post-SIMD-0033; splits the smallest account.
    const unstakeLamports = macroToDenomAmount('1.0', denomMultiplier)
    const unstakeSol = unstakeLamports / LAMPORTS_PER_SOL
    console.log(`🔻 Unstaking ${unstakeLamports / LAMPORTS_PER_SOL} SOL`)

    const expectedRemaining = smallLamports - unstakeLamports

    // Perform partial unstake
    const { statuses, accounts: affectedAccounts } = await testStaker.undelegatePartialStake(unstakeSol.toString())

    // Expect exactly one successful transaction
    expect(statuses).to.have.lengthOf(1)
    expect(statuses[0]).to.equal('success')

    // Expect exactly one affected account (the one that was split)
    expect(affectedAccounts).to.have.lengthOf(1)

    const splitAccount = affectedAccounts[0]

    const { accounts: updatedSplitAccounts } = await testStaker.getStakeAccounts(splitAccount.address)
    const updatedSplitAccount = updatedSplitAccounts[0]

    console.log(`📦 Split result: ${JSON.stringify(updatedSplitAccount, null, 2)}`)

    expect(updatedSplitAccount).to.exist
    expect(updatedSplitAccount.state).to.equal('delegated')
    expect(updatedSplitAccount.amount).to.equal(expectedRemaining)

    // Verify that the smallest account was used
    const [smallestAddr] = [...stakeAccountsMap.entries()].sort((a, b) => a[1] - b[1])[0]
    expect(updatedSplitAccount.address).to.equal(smallestAddr)

    console.log(`✅ Correctly split smallest account: ${smallestAddr}`)
  }).timeout(60000)
  it('should fully unstake the exact matching mid account', async () => {
    const denomMultiplier = getDenomMultiplier()

    const smallLamports = macroToDenomAmount('1.01', denomMultiplier)
    const midLamports = macroToDenomAmount('1.05', denomMultiplier)
    const largeLamports = macroToDenomAmount('1.1', denomMultiplier)

    const stakeAmounts = [smallLamports, midLamports, largeLamports]
    const stakeAccountsMap = new Map<string, number>()

    for (const amount of stakeAmounts) {
      const solAmount = amount / LAMPORTS_PER_SOL
      const addr = await testStaker.createAndDelegateStake(solAmount.toString())
      stakeAccountsMap.set(addr, amount)
      console.log(`🟢 Staked ${solAmount} SOL → ${addr}`)
    }

    // Unstake exactly the mid account amount → algorithm picks full unstake, no split.
    const unstakeSol = midLamports / LAMPORTS_PER_SOL
    console.log(`🔻 Unstaking exact mid account amount: ${unstakeSol} SOL`)

    const { statuses, accounts: affectedAccounts } = await testStaker.undelegatePartialStake(unstakeSol.toString())

    // Expect one transaction, and it's a full unstake (no split)
    expect(statuses).to.have.lengthOf(1)
    expect(statuses[0]).to.equal('success')
    expect(affectedAccounts).to.have.lengthOf(1)

    const unstakedAccountRef = affectedAccounts[0]
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const { accounts: updatedAccounts } = await testStaker.getStakeAccounts(unstakedAccountRef.address)

    // The unstaked account should now be in 'inactive' or 'deactivating' states
    expect(updatedAccounts[0]).to.exist
    expect(['deactivating', 'inactive']).to.include(updatedAccounts[0].state)
    expect(updatedAccounts[0].amount).to.equal(midLamports)

    // Confirm the unstaked account was the mid one
    const midAccount = [...stakeAccountsMap.entries()].find(([_, lamports]) => lamports === midLamports)
    expect(updatedAccounts[0].address).to.equal(midAccount![0])

    console.log(`✅ Fully unstaked exact match account: ${midAccount![0]}`)
  }).timeout(60000)
  it('should split the largest account when unstake amount exceeds any single account', async () => {
    const denomMultiplier = getDenomMultiplier()
    expect(denomMultiplier).to.equal(BigInt(LAMPORTS_PER_SOL).toString())

    // Largest must be ≥ unstake + 1 SOL so split's source still satisfies min delegation.
    const smallLamports = macroToDenomAmount('1.05', denomMultiplier)
    const midLamports = macroToDenomAmount('1.1', denomMultiplier)
    const largeLamports = macroToDenomAmount('3.0', denomMultiplier)

    const stakeAmounts = [smallLamports, midLamports, largeLamports]
    const stakeAccountsMap = new Map<string, number>()

    for (const amount of stakeAmounts) {
      const solAmount = amount / LAMPORTS_PER_SOL
      const addr = await testStaker.createAndDelegateStake(solAmount.toString())
      stakeAccountsMap.set(addr, amount)
      console.log(`🟢 Staked ${solAmount} SOL → ${addr}`)
    }

    // 1.5 SOL > each of small/mid, fits in large with 1.5 SOL remaining on both sides of the split.
    const unstakeLamports = macroToDenomAmount('1.5', denomMultiplier)
    const unstakeSol = unstakeLamports / LAMPORTS_PER_SOL
    console.log(`🔻 Unstaking ${unstakeLamports} lamports (${unstakeSol} SOL)`)

    const { statuses, accounts: affectedAccounts } = await testStaker.undelegatePartialStake(unstakeSol.toString())

    expect(statuses.length).to.equal(1)
    expect(statuses[0]).to.equal('success')
    expect(affectedAccounts.length).to.equal(1)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const splitAccount = (await testStaker.getStakeAccounts(affectedAccounts[0].address)).accounts[0]
    expect(splitAccount).to.exist
    expect(splitAccount.state).to.equal('delegated')

    const expectedRemaining = largeLamports - unstakeLamports
    expect(splitAccount.amount).to.equal(expectedRemaining)

    const [largestAccount] = [...stakeAccountsMap.entries()].sort((a, b) => b[1] - a[1])
    expect(splitAccount.address).to.equal(largestAccount[0])

    console.log(
      `✅ Correctly split largest account (${splitAccount.address}), new balance: ${splitAccount.amount} lamports`
    )
  }).timeout(60000)
  it('should fully unstake the largest and another account when amount spans multiple accounts', async () => {
    const denomMultiplier = getDenomMultiplier()

    // Define 4 stake amounts
    const lamportsA = macroToDenomAmount('1.01', denomMultiplier) // A
    const lamportsB = macroToDenomAmount('1.03', denomMultiplier) // B
    const lamportsC = macroToDenomAmount('1.05', denomMultiplier) // C
    const lamportsD = macroToDenomAmount('1.1', denomMultiplier) // D

    const stakeAmounts = [lamportsA, lamportsB, lamportsC, lamportsD]
    const stakeAccountsMap = new Map<string, number>()

    for (const amount of stakeAmounts) {
      const solAmount = amount / LAMPORTS_PER_SOL
      const addr = await testStaker.createAndDelegateStake(solAmount.toString())
      stakeAccountsMap.set(addr, amount)
      console.log(`🟢 Staked ${solAmount} SOL → ${addr}`)
    }

    // 2.13 = D (1.1) + B (1.03) exactly → both full-unstaked, no split needed.
    const unstakeLamports = macroToDenomAmount('2.13', denomMultiplier)
    const unstakeSol = unstakeLamports / LAMPORTS_PER_SOL
    console.log(`🔻 Unstaking ${unstakeLamports} lamports (${unstakeSol} SOL)`)

    const { statuses, accounts: affectedAccounts } = await testStaker.undelegatePartialStake(unstakeSol.toString())

    expect(statuses.length).to.equal(2) // 2 full unstakes
    statuses.forEach((s) => expect(s).to.equal('success'))

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const updated = await Promise.all(
      affectedAccounts.map((a) => testStaker.getStakeAccounts(a.address).then((res) => res.accounts[0]))
    )

    // Expect both accounts should be deactivating and together they should match unstake amount
    updated.forEach((a) => {
      expect(a).to.exist
      expect(a.state).to.equal('deactivating')
    })

    const affectedLamports = updated.map((a) => a.amount)
    expect(affectedLamports.reduce((a, b) => a + b, 0)).to.equal(unstakeLamports)

    const [_accountA, accountB, _accountC, accountD] = [...stakeAccountsMap.entries()].sort((a, b) => a[1] - b[1])
    expect(affectedAccounts.some((a) => a.address === accountB[0])).to.be.true
    expect(affectedAccounts.some((a) => a.address === accountD[0])).to.be.true

    console.log(`✅ Fully unstaked largest (${accountD[0]}) and (${accountB[0]}) accounts`)
  }).timeout(60000)
})

describe('Solana staker - partial unstake - sad path 😢', () => {
  let testStaker: SolanaTestStaker

  before(async function () {
    this.timeout(10000)
    const mnemonic = process.env.TEST_SOLANA_MNEMONIC
    if (!mnemonic) {
      throw new Error('TEST_SOLANA_MNEMONIC environment variable is not set')
    }

    testStaker = new SolanaTestStaker({
      mnemonic,
      rpcUrl: 'https://api.devnet.solana.com'
    })

    await testStaker.init()

    await testStaker.requestAirdropIfNeeded(new PublicKey(testStaker.ownerAddress), 1, 5)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  })
  beforeEach(async function () {
    this.timeout(60000)
    const { accounts } = await testStaker.getStakeAccounts(null)
    const delegated = accounts.filter((a) => a.state === 'delegated')
    const deactivating = accounts.filter((a) => a.state === 'deactivating')
    const undelegated = accounts.filter((a) => a.state === 'undelegated')
    console.log(
      `🧹 Cleaning up before test: ${delegated.length} delegated, ${deactivating.length} deactivating, ${undelegated.length} undelegated, total: ${accounts.length}`
    )
    await testStaker.cleanupAllStakeAccounts()
    const { accounts: postCleanup } = await testStaker.getStakeAccounts(null)
    const delegatedAfter = postCleanup.filter((a) => a.state === 'delegated')
    expect(delegatedAfter.length).to.equal(0)
    console.log(`✅ Cleaned up all stake accounts before the test.`)
  })
  it('should throw if there are no delegated stake accounts', async () => {
    const unstakeAmount = 0.01
    console.log(`🔻 Attempting to unstake ${unstakeAmount} SOL with no stake accounts`)

    await expect(testStaker.undelegatePartialStake(unstakeAmount.toString())).to.be.rejectedWith(
      /No delegated stake account/
    )
  })
  it('should throw if split would leave less than min delegation on either side', async () => {
    // Stake 1.5 SOL — valid under SIMD-0033. Request 0.6 SOL unstake: the SDK picks the
    // split branch (rentExemption check passes), but both halves (0.9 and 0.6 SOL) violate
    // the 1 SOL min delegation, so Solana rejects the transaction.
    const stakeAmount = 1.5
    const stakeAccountAddress = await testStaker.createAndDelegateStake(stakeAmount.toString())
    console.log(`🟢 Staked ${stakeAmount} SOL → ${stakeAccountAddress}`)

    const unstakeAmount = 0.6
    console.log(`🔻 Attempting unstake of ${unstakeAmount} SOL — split would leave 0.9/0.6 SOL`)

    await expect(testStaker.undelegatePartialStake(unstakeAmount.toString())).to.be.rejected
  }).timeout(60000)
  it('should throw an error when unstaking more than available', async () => {
    const stakeAmount = 1.1 // must satisfy 1 SOL min delegation (SIMD-0033)
    const stakeAccountAddress = await testStaker.createAndDelegateStake(stakeAmount.toString())
    console.log(`🟢 Staked ${stakeAmount} SOL → ${stakeAccountAddress}`)

    // Attempt to unstake more than the available amount
    const unstakeAmount = 2.0
    console.log(`🔻 Attempting to unstake ${unstakeAmount} SOL`)

    await expect(testStaker.undelegatePartialStake(unstakeAmount.toString())).to.be.rejected
  }).timeout(60000)
})
