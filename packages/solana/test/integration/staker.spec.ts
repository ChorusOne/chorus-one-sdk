import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { describe, it, before } from 'mocha'
import { use, expect } from 'chai'
import { chaiAsPromised } from 'chai-promised'
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
    const stakeAccountAddress = await testStaker.createAndDelegateStake('0.003')
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
    const stakeAmount = 0.3
    const stakeAccountAddress = await testStaker.createAndDelegateStake(stakeAmount.toString())

    // split the stake account
    const { status, newStakeAccountAddress } = await testStaker.splitStake(stakeAccountAddress, '0.1')
    expect(status).to.equal('success')
    const {
      accounts: [oldStakeAccount]
    } = await testStaker.getStakeAccounts(stakeAccountAddress)
    expect(oldStakeAccount.state).to.equal('delegated')
    expect(oldStakeAccount.amount).to.be.equal(200000000)

    // check the new stake account balance
    const {
      accounts: [newStakeAccount]
    } = await testStaker.getStakeAccounts(newStakeAccountAddress)
    expect(newStakeAccount.state).to.equal('delegated')
    expect(newStakeAccount.amount).to.be.greaterThan(100000000) // we need to account for the rent exemption
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
    // make sure there are no delegated stake accounts before the test
    expect(delegated.length).to.equal(0)
    console.log(`✅ Cleaned up all stake accounts before the test, found ${delegated.length} delegated accounts.`)
  })
  it('should unstake partial amount - one stake account', async () => {
    // Stake a fixed amount in lamports
    const stakeAmountLamports = 100_000_000 // 0.1 SOL
    const stakeAmountSol = stakeAmountLamports / LAMPORTS_PER_SOL

    const stakeAccountAddress = await testStaker.createAndDelegateStake(stakeAmountSol.toString())
    console.log(`🟢 Staked ${stakeAmountSol} SOL → ${stakeAccountAddress}`)

    const [createdAccount] = (await testStaker.getStakeAccounts(stakeAccountAddress)).accounts
    expect(createdAccount).to.exist
    expect(createdAccount.state).to.equal('delegated')

    // Unstake 5% (in lamports)
    const unstakeLamports = Number((BigInt(stakeAmountLamports) * 5n) / 100n) // 5% of the stake amount)
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
  it('should split the smallest viable account when unstake amount is tiny', async () => {
    const denomMultiplier = getDenomMultiplier()
    const smallLamports = macroToDenomAmount('0.01', denomMultiplier) // 0.1 SOL
    const midLamports = macroToDenomAmount('0.05', denomMultiplier) // 0.5 SOL
    const largeLamports = macroToDenomAmount('0.1', denomMultiplier) // 1.0 SOL

    const stakeAmounts = [smallLamports, midLamports, largeLamports]
    const stakeAccountsMap = new Map<string, number>()

    for (const amount of stakeAmounts) {
      const solAmount = amount / LAMPORTS_PER_SOL
      const addr = await testStaker.createAndDelegateStake(solAmount.toString())
      stakeAccountsMap.set(addr, amount)
      console.log(`🟢 Staked ${solAmount} SOL → ${addr}`)
    }

    // Unstake a small amount (0.05 SOL)
    const unstakeLamports = macroToDenomAmount('0.005', denomMultiplier)
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

    // Stake amounts
    const smallLamports = macroToDenomAmount('0.01', denomMultiplier) // 0.01 SOL
    const midLamports = macroToDenomAmount('0.05', denomMultiplier) // 0.05 SOL
    const largeLamports = macroToDenomAmount('0.1', denomMultiplier) // 0.1 SOL

    const stakeAmounts = [smallLamports, midLamports, largeLamports]
    const stakeAccountsMap = new Map<string, number>()

    for (const amount of stakeAmounts) {
      const solAmount = amount / LAMPORTS_PER_SOL
      const addr = await testStaker.createAndDelegateStake(solAmount.toString())
      stakeAccountsMap.set(addr, amount)
      console.log(`🟢 Staked ${solAmount} SOL → ${addr}`)
    }

    // Unstake exactly the mid account amount (0.05 SOL)
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

    // Set up stake accounts
    const smallLamports = macroToDenomAmount('0.01', denomMultiplier)
    const midLamports = macroToDenomAmount('0.05', denomMultiplier)
    const largeLamports = macroToDenomAmount('0.1', denomMultiplier)

    const stakeAmounts = [smallLamports, midLamports, largeLamports]
    const stakeAccountsMap = new Map<string, number>()

    for (const amount of stakeAmounts) {
      const solAmount = amount / LAMPORTS_PER_SOL
      const addr = await testStaker.createAndDelegateStake(solAmount.toString())
      stakeAccountsMap.set(addr, amount)
      console.log(`🟢 Staked ${solAmount} SOL → ${addr}`)
    }

    // Request unstake of 0.075 SOL → should split from 0.1 account
    const unstakeLamports = macroToDenomAmount('0.075', denomMultiplier)
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
    const lamportsA = macroToDenomAmount('0.01', denomMultiplier) // A
    const lamportsB = macroToDenomAmount('0.03', denomMultiplier) // B
    const lamportsC = macroToDenomAmount('0.05', denomMultiplier) // C
    const lamportsD = macroToDenomAmount('0.1', denomMultiplier) // D

    const stakeAmounts = [lamportsA, lamportsB, lamportsC, lamportsD]
    const stakeAccountsMap = new Map<string, number>()

    for (const amount of stakeAmounts) {
      const solAmount = amount / LAMPORTS_PER_SOL
      const addr = await testStaker.createAndDelegateStake(solAmount.toString())
      stakeAccountsMap.set(addr, amount)
      console.log(`🟢 Staked ${solAmount} SOL → ${addr}`)
    }

    // Unstake 0.13 SOL — larger than any single account
    const unstakeLamports = macroToDenomAmount('0.13', denomMultiplier)
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
    // make sure there are no delegated stake accounts before the test
    // expect(delegated.length).to.equal(0)
    console.log(`✅ Cleaned up all stake accounts before the test, found ${delegated.length} delegated accounts.`)
  })
  it('should throw if there are no delegated stake accounts', async () => {
    const unstakeAmount = 0.01
    console.log(`🔻 Attempting to unstake ${unstakeAmount} SOL with no stake accounts`)

    await expect(testStaker.undelegatePartialStake(unstakeAmount.toString())).to.be.rejectedWith(
      /No delegated stake account/
    )
  })
  it('should throw if split would leave less than rent exemption', async () => {
    // Smallest viable stake: just above rent exemption
    const rentExemptionLamports = await testStaker.getMinimumStakeRentExemption()
    console.log(`Minimum rent exemption: ${rentExemptionLamports} lamports `)

    const barelyViableLamports = rentExemptionLamports + 100_000 // tiny amount above rent

    const solAmount = barelyViableLamports / LAMPORTS_PER_SOL
    const stakeAccount = await testStaker.createAndDelegateStake(solAmount.toString())
    console.log(`🟢 Staked just above rent exemption → ${stakeAccount}`)

    const accounts = await testStaker.getStakeAccounts(null)
    const delegated = accounts.accounts.filter((a) => a.state === 'delegated')
    console.log(`Found ${delegated.length} delegated stake accounts before test.`, delegated[0].amount)
    // Try to unstake an amount that would leave < rent exemption in the source
    const unsafeUnstakeLamports = barelyViableLamports - rentExemptionLamports + 1 // 1 lamport too much
    const unsafeUnstakeSol = unsafeUnstakeLamports / LAMPORTS_PER_SOL

    console.log(`🔻 Attempting unsafe unstake of ${unsafeUnstakeLamports} lamports (${unsafeUnstakeSol} SOL)`)
    await expect(testStaker.undelegatePartialStake(unsafeUnstakeSol.toString())).to.be.rejected
  }).timeout(60000)
  it('should throw an error when unstaking more than available', async () => {
    const stakeAmount = 0.1 // 0.1 SOL
    const stakeAccountAddress = await testStaker.createAndDelegateStake(stakeAmount.toString())
    console.log(`🟢 Staked ${stakeAmount} SOL → ${stakeAccountAddress}`)

    // Attempt to unstake more than the available amount
    const unstakeAmount = 0.2 // 0.2 SOL
    console.log(`🔻 Attempting to unstake ${unstakeAmount} SOL`)

    await expect(testStaker.undelegatePartialStake(unstakeAmount.toString())).to.be.rejected
  }).timeout(60000)
})
