import { PolygonStaker, EXCHANGE_RATE_HIGH_PRECISION, VALIDATOR_SHARE_ABI } from '@chorus-one/polygon'
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

// Existing Chorus One validator delegator with accrued rewards at block 24382010
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
      assert.equal(epoch, 96822n)
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
      assert.equal(rewards, '45.307877957471003709')
    })

    it('reads withdrawal delay', async () => {
      const delay = await staker.getWithdrawalDelay()
      assert.equal(delay, 80n)
    })

    it('caches withdrawal delay on subsequent calls', async () => {
      const delay1 = await staker.getWithdrawalDelay()
      const delay2 = await staker.getWithdrawalDelay()
      assert.equal(delay1, delay2)
      assert.equal(delay1, 80n)
    })

    it('reads exchange rate precision for non-foundation validator', async () => {
      const precision = await staker.getExchangeRatePrecision(validatorShareAddress)
      assert.equal(precision, EXCHANGE_RATE_HIGH_PRECISION)
    })

    it('caches exchange rate precision on subsequent calls', async () => {
      const precision1 = await staker.getExchangeRatePrecision(validatorShareAddress)
      const precision2 = await staker.getExchangeRatePrecision(validatorShareAddress)
      assert.equal(precision1, precision2)
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

    it('unstakes and creates unbond request with amount and isWithdrawable fields', async () => {
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
      assert.equal(unbond.amount, AMOUNT)
      assert.equal(unbond.isWithdrawable, false)

      const stakeAfter = await staker.getStake({ delegatorAddress, validatorShareAddress })
      assert.equal(stakeAfter.balance, '0')
    })

    it('stakes with slippageBps and verifies minSharesToMint calculation matches contract formula', async () => {
      await approve({ delegatorAddress, amount: AMOUNT, staker, walletClient, publicClient })

      const amountWei = parseEther(AMOUNT)
      const precision = await staker.getExchangeRatePrecision(validatorShareAddress)

      // Get exchange rate from contract (same way the SDK does)
      const exchangeRate = await publicClient
        .readContract({
          address: validatorShareAddress,
          abi: VALIDATOR_SHARE_ABI,
          functionName: 'getTotalStake',
          args: [validatorShareAddress]
        })
        .then(([, rate]) => rate)

      // Contract formula: shares = amount * precision / exchangeRate
      const expectedShares = (amountWei * precision) / exchangeRate

      // SDK slippage formula: minSharesToMint = expectedShares - (expectedShares * slippageBps / 10000)
      const slippageBps = 100n // 1%
      const expectedMinShares = expectedShares - (expectedShares * slippageBps) / 10000n

      const { tx } = await staker.buildStakeTx({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        slippageBps: Number(slippageBps)
      })

      // Decode the calldata to verify minSharesToMint
      const decodedMinShares = BigInt('0x' + tx.data.slice(74, 138))
      assert.equal(decodedMinShares, expectedMinShares, 'minSharesToMint should match calculated value')

      // Verify transaction succeeds
      await sendTx({ tx, walletClient, publicClient, senderAddress: delegatorAddress })

      const stakeInfo = await staker.getStake({ delegatorAddress, validatorShareAddress })
      assert.equal(stakeInfo.balance, AMOUNT)

      // Verify actual shares received are >= minSharesToMint
      assert.isTrue(stakeInfo.shares >= expectedMinShares, 'Actual shares should be >= minSharesToMint')
    })

    it('stakes with 0 slippageBps sets minSharesToMint to exact expected shares', async () => {
      await approve({ delegatorAddress, amount: AMOUNT, staker, walletClient, publicClient })

      const amountWei = parseEther(AMOUNT)
      const precision = await staker.getExchangeRatePrecision(validatorShareAddress)

      const exchangeRate = await publicClient
        .readContract({
          address: validatorShareAddress,
          abi: VALIDATOR_SHARE_ABI,
          functionName: 'getTotalStake',
          args: [validatorShareAddress]
        })
        .then(([, rate]) => rate)

      const expectedShares = (amountWei * precision) / exchangeRate

      const { tx } = await staker.buildStakeTx({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        slippageBps: 0
      })

      const decodedMinShares = BigInt('0x' + tx.data.slice(74, 138))
      assert.equal(decodedMinShares, expectedShares, 'With 0 slippage, minSharesToMint should equal expected shares')

      await sendTx({ tx, walletClient, publicClient, senderAddress: delegatorAddress })
      const stakeInfo = await staker.getStake({ delegatorAddress, validatorShareAddress })
      assert.equal(stakeInfo.shares, expectedShares, 'Actual shares should equal expected shares')
    })

    it('unstakes with slippageBps and verifies maximumSharesToBurn calculation matches contract formula', async () => {
      await approveAndStake({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        staker,
        walletClient,
        publicClient
      })

      const stake = await staker.getStake({ delegatorAddress, validatorShareAddress })
      const amountWei = parseEther(AMOUNT)
      const precision = await staker.getExchangeRatePrecision(validatorShareAddress)

      // Contract formula: shares = claimAmount * precision / exchangeRate
      const expectedShares = (amountWei * precision) / stake.exchangeRate

      // SDK slippage formula: maximumSharesToBurn = expectedShares + (expectedShares * slippageBps / 10000)
      const slippageBps = 100n // 1%
      const expectedMaxShares = expectedShares + (expectedShares * slippageBps) / 10000n

      const { tx } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        slippageBps: Number(slippageBps)
      })

      // Decode the calldata to verify maximumSharesToBurn (second arg after 4 byte selector + 32 byte amount)
      const decodedMaxShares = BigInt('0x' + tx.data.slice(74, 138))
      assert.equal(decodedMaxShares, expectedMaxShares, 'maximumSharesToBurn should match calculated value')

      await sendTx({ tx, walletClient, publicClient, senderAddress: delegatorAddress })

      const stakeAfter = await staker.getStake({ delegatorAddress, validatorShareAddress })
      assert.equal(stakeAfter.balance, '0')

      // TODO: Check if shares are lower than max
    })

    it('unstakes with 0 slippageBps sets maximumSharesToBurn to exact expected shares', async () => {
      await approveAndStake({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        staker,
        walletClient,
        publicClient
      })

      const stake = await staker.getStake({ delegatorAddress, validatorShareAddress })
      const amountWei = parseEther(AMOUNT)
      const precision = await staker.getExchangeRatePrecision(validatorShareAddress)

      const expectedShares = (amountWei * precision) / stake.exchangeRate

      const { tx } = await staker.buildUnstakeTx({
        delegatorAddress,
        validatorShareAddress,
        amount: AMOUNT,
        slippageBps: 0
      })

      const decodedMaxShares = BigInt('0x' + tx.data.slice(74, 138))
      assert.equal(
        decodedMaxShares,
        expectedShares,
        'With 0 slippage, maximumSharesToBurn should equal expected shares'
      )

      await sendTx({ tx, walletClient, publicClient, senderAddress: delegatorAddress })

      // TODO: check if shares are equal to expected
    })

    // TODO: unstake different amounts
    it('fetches multiple unbonds with getUnbonds batch method', async () => {
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
        amount: '50',
        maximumSharesToBurn: stakeBefore.shares / 2n,
        staker,
        walletClient,
        publicClient
      })

      const stakeAfterFirstUnstake = await staker.getStake({ delegatorAddress, validatorShareAddress })
      await unstake({
        delegatorAddress,
        validatorShareAddress,
        amount: '50',
        maximumSharesToBurn: stakeAfterFirstUnstake.shares,
        staker,
        walletClient,
        publicClient
      })

      const nonce = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })
      assert.equal(nonce, 2n)

      const unbonds = await staker.getUnbonds({
        delegatorAddress,
        validatorShareAddress,
        unbondNonces: [1n, 2n]
      })

      assert.lengthOf(unbonds, 2)
      assert.equal(unbonds[0].amount, '50')
      assert.equal(unbonds[1].amount, '50')
      assert.equal(unbonds[0].isWithdrawable, false)
      assert.equal(unbonds[1].isWithdrawable, false)
      assert.isTrue(unbonds[0].shares > 0n)
      assert.isTrue(unbonds[1].shares > 0n)
    })

    it('withdraws after unbonding period and verifies isWithdrawable becomes true', async () => {
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
      const unbondBefore = await staker.getUnbond({ delegatorAddress, validatorShareAddress, unbondNonce: nonce })
      assert.equal(unbondBefore.isWithdrawable, false)

      const withdrawalDelay = await getWithdrawalDelay({ publicClient })
      await advanceEpoch({ publicClient, staker, targetEpoch: unbondBefore.withdrawEpoch + withdrawalDelay })

      const unbondAfter = await staker.getUnbond({ delegatorAddress, validatorShareAddress, unbondNonce: nonce })
      assert.equal(unbondAfter.isWithdrawable, true)

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
