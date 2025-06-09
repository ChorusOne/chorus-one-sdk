import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { describe, it, before } from 'mocha'
import { use, expect } from 'chai'
import { chaiAsPromised } from 'chai-promised'
import spies from 'chai-spies'
import { SolanaTestStaker } from './testStaker'

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
  it('should unstake partial amounts - simple', async () => {
    const maybeDelegatedStakeAccounts = (await testStaker.getStakeAccounts(null)).accounts.filter(
      (account) => account.state === 'delegated'
    )

    if (maybeDelegatedStakeAccounts.length === 0) {
      const stakeAmount = 0.5
      console.log('No delegated stake accounts found, creating one with ' + stakeAmount + ' SOL')
      const stakeAccountAddress = await testStaker.createAndDelegateStake(stakeAmount.toString())
      console.log(`Created stake account: ${stakeAccountAddress}`)

      const stakeAccountsAfterCreation = await testStaker.getStakeAccounts(stakeAccountAddress)
      expect(stakeAccountsAfterCreation.accounts.length).to.equal(1)
      expect(stakeAccountsAfterCreation.accounts[0].state).to.equal('delegated')

      const amountToUnstakeSOL = stakeAmount - 0.1
      console.log(`Unstaking ${amountToUnstakeSOL} SOL`)
      const status = await testStaker.undelegatePartialStake(amountToUnstakeSOL.toString())
      expect(status.length).to.be.greaterThan(0)
      status.forEach((s) => expect(s).to.equal('success'))
    } else {
      console.log(
        `Found ${maybeDelegatedStakeAccounts.length} delegated stake accounts, proceeding with partial unstake`
      )
      const totalStakedLamports = maybeDelegatedStakeAccounts.reduce((acc, account) => acc + account.amount, 0)
      const totalStakedSOL = totalStakedLamports / LAMPORTS_PER_SOL
      const amountToUnstakeSOL = Math.min(0.1, totalStakedSOL * 0.5)

      console.log(`Total staked: ${totalStakedSOL} SOL (${totalStakedLamports} lamports)`)
      console.log(`Amount to unstake: ${amountToUnstakeSOL} SOL`)

      const status = await testStaker.undelegatePartialStake(amountToUnstakeSOL.toString())
      expect(status.length).to.be.greaterThan(0)
      status.forEach((s) => expect(s).to.equal('success'))

      console.log(`✅ Successfully unstaked ${amountToUnstakeSOL} SOL in ${status.length} transaction(s)`)
    }
  }).timeout(60000)
})
