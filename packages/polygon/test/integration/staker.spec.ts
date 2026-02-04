import { PolygonStaker } from '@chorus-one/polygon'
import {
  type PublicClient,
  type WalletClient,
  type Address,
  parseEther,
  formatEther,
  createWalletClient,
  http,
  maxUint256
} from 'viem'
import { hardhat } from 'viem/chains'
import { use, expect, assert } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
  prepareTests,
  fundWithStakingToken,
  approve,
  approveAndStake,
  unstake,
  sendTx,
  advanceEpoch,
  impersonate,
  getStakingTokenBalance,
  getWithdrawalDelay
} from './utils'
import { restoreToInitialState } from './setup'

use(chaiAsPromised)

const AMOUNT = '100'

// Existing Chorus One validator delegator with accrued rewards at block 24369869
const WHALE_DELEGATOR = '0xf382c7202ff9fa88f5ee4054b124fbb9cc196c6e' as Address

describe('PolygonStaker', () => {
  let delegatorAddress: Address
  let validatorShareAddress: Address
  let walletClient: WalletClient
  let publicClient: PublicClient
  let staker: PolygonStaker

  afterEach(async () => {
    await restoreToInitialState()
  })

  describe('query methods', () => {
    beforeEach(async () => {
      const setup = await prepareTests()
      validatorShareAddress = setup.validatorShareAddress
      publicClient = setup.publicClient
      staker = setup.staker
    })

    it('reads current epoch', async () => {
      const epoch = await staker.getEpoch()
      assert.equal(epoch, 96699n)
    })

    it('reads stake info', async () => {
      const stakeInfo = await staker.getStake({ delegatorAddress: WHALE_DELEGATOR, validatorShareAddress })
      assert.equal(stakeInfo.balance, formatEther(135000000000000000000000n))
    })

    it('reads allowance', async () => {
      const allowance = await staker.getAllowance(WHALE_DELEGATOR)
      assert.equal(allowance, '0')
    })

    it('reads unbond nonce', async () => {
      const nonce = await staker.getUnbondNonce({ delegatorAddress: WHALE_DELEGATOR, validatorShareAddress })
      assert.equal(nonce, 0n)
    })

    it('reads liquid rewards', async () => {
      const rewards = await staker.getLiquidRewards({ delegatorAddress: WHALE_DELEGATOR, validatorShareAddress })
      assert.equal(rewards, '29.168279722050262884')
    })
  })

  describe('staking lifecycle', () => {
    beforeEach(async () => {
      const setup = await prepareTests()
      delegatorAddress = setup.delegatorAddress
      validatorShareAddress = setup.validatorShareAddress
      walletClient = setup.walletClient
      publicClient = setup.publicClient
      staker = setup.staker

      await fundWithStakingToken({
        publicClient,
        recipientAddress: delegatorAddress,
        amount: parseEther('10000')
      })
    })

    it('approves staking token and verifies allowance', async () => {
      await approve({ delegatorAddress, amount: AMOUNT, staker, walletClient, publicClient })

      const allowance = await staker.getAllowance(delegatorAddress)
      assert.equal(allowance, AMOUNT)
    })

    it('approves max (unlimited) allowance', async () => {
      await approve({ delegatorAddress, amount: 'max', staker, walletClient, publicClient })

      const allowance = await staker.getAllowance(delegatorAddress)
      assert.equal(parseEther(allowance), maxUint256)
    })

    it('stakes and verifies on-chain state', async () => {
      await approveAndStake({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        staker,
        walletClient,
        publicClient
      })

      const stakeInfo = await staker.getStake({ delegatorAddress, validatorShareAddress })
      assert.equal(stakeInfo.balance, AMOUNT)
    })

    it('stakes with referrer tracking in tx data', async () => {
      await approve({ delegatorAddress, amount: AMOUNT, staker, walletClient, publicClient })

      const { tx } = await staker.buildStakeTx({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        minSharesToMint: 0n
      })

      assert.isTrue(tx.data.includes('c1c1'), 'tx data should contain referrer marker')

      const request = await walletClient.prepareTransactionRequest({ ...tx, chain: undefined })
      const hash = await walletClient.sendTransaction({ ...request, account: delegatorAddress })

      const onChainTx = await publicClient.getTransaction({ hash })
      assert.isTrue(onChainTx.input.includes('c1c1'), 'on-chain tx input should contain referrer marker')

      const receipt = await publicClient.getTransactionReceipt({ hash })
      assert.equal(receipt.status, 'success')

      const stakeInfo = await staker.getStake({ delegatorAddress, validatorShareAddress })
      assert.equal(stakeInfo.balance, AMOUNT)
    })

    it('unstakes and creates unbond request', async () => {
      await approveAndStake({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        staker,
        walletClient,
        publicClient
      })

      const nonceBefore = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })
      const currentEpoch = await staker.getEpoch()

      const stakeBefore = await staker.getStake({ delegatorAddress, validatorShareAddress })
      await unstake({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        maximumSharesToBurn: stakeBefore.shares,
        staker,
        walletClient,
        publicClient
      })

      const nonceAfter = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })
      assert.equal(nonceAfter, nonceBefore + 1n)

      const unbond = await staker.getUnbond({ delegatorAddress, validatorShareAddress, unbondNonce: nonceAfter })
      assert.isTrue(unbond.withdrawEpoch === currentEpoch)

      const EXCHANGE_RATE_PRECISION = 10n ** 29n // For non-foundation nodes, the exchange rate is 10^29
      const unbondAmount = (unbond.shares * stakeBefore.exchangeRate) / EXCHANGE_RATE_PRECISION
      assert.equal(unbondAmount, parseEther(AMOUNT))

      const stakeAfter = await staker.getStake({ delegatorAddress, validatorShareAddress })
      assert.equal(stakeAfter.balance, '0')
    })

    it('withdraws after unbonding period and verifies balance increase', async () => {
      await approveAndStake({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        staker,
        walletClient,
        publicClient
      })
      const stakeBefore = await staker.getStake({ delegatorAddress, validatorShareAddress })
      await unstake({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        maximumSharesToBurn: stakeBefore.shares,
        staker,
        walletClient,
        publicClient
      })

      const nonce = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })
      const unbond = await staker.getUnbond({ delegatorAddress, validatorShareAddress, unbondNonce: nonce })

      const withdrawalDelay = await getWithdrawalDelay({ publicClient })
      await advanceEpoch({ publicClient, staker, targetEpoch: unbond.withdrawEpoch + withdrawalDelay })

      const balanceBefore = await getStakingTokenBalance({ publicClient, address: delegatorAddress })

      const { tx } = await staker.buildWithdrawTx({ delegatorAddress, validatorShareAddress, unbondNonce: nonce })
      await sendTx({ tx, walletClient, publicClient, senderAddress: delegatorAddress })

      const balanceAfter = await getStakingTokenBalance({ publicClient, address: delegatorAddress })
      assert.equal(balanceAfter - balanceBefore, parseEther(AMOUNT))
    })

    it('rejects withdraw for non-existent unbond', async () => {
      await expect(
        staker.buildWithdrawTx({ delegatorAddress, validatorShareAddress, unbondNonce: 999n })
      ).to.be.rejectedWith('No unbond request found for nonce 999')
    })

    it('rejects withdraw before unbonding period completes (withdrawEpoch + withdrawalDelay)', async () => {
      await approveAndStake({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        staker,
        walletClient,
        publicClient
      })

      const stakeBefore = await staker.getStake({ delegatorAddress, validatorShareAddress })
      await unstake({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        maximumSharesToBurn: stakeBefore.shares,
        staker,
        walletClient,
        publicClient
      })

      const nonce = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })
      const unbond = await staker.getUnbond({ delegatorAddress, validatorShareAddress, unbondNonce: nonce })
      const withdrawalDelay = await getWithdrawalDelay({ publicClient })

      await expect(
        staker.buildWithdrawTx({ delegatorAddress, validatorShareAddress, unbondNonce: nonce })
      ).to.be.rejectedWith(
        `Unbonding not complete. Current epoch: ${unbond.withdrawEpoch}, Required epoch: ${unbond.withdrawEpoch + withdrawalDelay}`
      )
    })

    it('rejects claim rewards when none available', async () => {
      await approveAndStake({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        staker,
        walletClient,
        publicClient
      })

      await expect(staker.buildClaimRewardsTx({ delegatorAddress, validatorShareAddress })).to.be.rejectedWith(
        'No rewards available to claim'
      )
    })

    it('rejects compound when no rewards available', async () => {
      await approveAndStake({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        staker,
        walletClient,
        publicClient
      })

      await expect(staker.buildCompoundTx({ delegatorAddress, validatorShareAddress })).to.be.rejectedWith(
        'No rewards available to compound'
      )
    })
  })

  describe('whale delegator operations', () => {
    let whaleWallet: WalletClient

    beforeEach(async () => {
      const setup = await prepareTests()
      validatorShareAddress = setup.validatorShareAddress
      publicClient = setup.publicClient
      staker = setup.staker

      await impersonate({ publicClient, address: WHALE_DELEGATOR })
      whaleWallet = createWalletClient({ account: WHALE_DELEGATOR, chain: hardhat, transport: http() })
    })

    it('claims rewards and verifies POL balance increase', async () => {
      const rewardsBefore = await staker.getLiquidRewards({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      assert.isTrue(parseEther(rewardsBefore) > 0n, 'Whale should have accrued rewards')

      const balanceBefore = await getStakingTokenBalance({ publicClient, address: WHALE_DELEGATOR })

      const { tx } = await staker.buildClaimRewardsTx({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      await sendTx({ tx, walletClient: whaleWallet, publicClient, senderAddress: WHALE_DELEGATOR })

      const rewardsAfter = await staker.getLiquidRewards({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      assert.equal(rewardsAfter, '0')

      const balanceAfter = await getStakingTokenBalance({ publicClient, address: WHALE_DELEGATOR })
      assert.equal(balanceAfter - balanceBefore, parseEther(rewardsBefore))
    })

    it('compounds rewards and verifies stake increase', async () => {
      const rewardsBefore = await staker.getLiquidRewards({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      assert.isTrue(parseEther(rewardsBefore) > 0n, 'Whale should have accrued rewards')

      const stakeBefore = await staker.getStake({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })

      const { tx } = await staker.buildCompoundTx({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      await sendTx({ tx, walletClient: whaleWallet, publicClient, senderAddress: WHALE_DELEGATOR })

      const rewardsAfter = await staker.getLiquidRewards({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      assert.equal(rewardsAfter, '0')

      const stakeAfter = await staker.getStake({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      assert.equal(parseEther(stakeAfter.balance) - parseEther(stakeBefore.balance), parseEther(rewardsBefore))
    })
  })
})
