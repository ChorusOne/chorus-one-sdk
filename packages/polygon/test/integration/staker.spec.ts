import { PolygonStaker, NETWORK_CONTRACTS } from '@chorus-one/polygon'
import { type PublicClient, type WalletClient, type Address, parseEther, erc20Abi, createWalletClient, http } from 'viem'
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
  impersonate
} from './utils'
import { restoreToInitialState } from './setup'

use(chaiAsPromised)

const AMOUNT = '100'

// Existing Chorus One validator delegator with accrued rewards at block 22217318
const WHALE_DELEGATOR = '0x7c1b928a3dd22c5f75dbc9f87c8839fee03d31f3' as Address

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
      staker = setup.staker
    })

    it('reads current epoch', async () => {
      const epoch = await staker.getEpoch()
      assert.equal(epoch, 79524n)
    })

    it('reads stake info', async () => {
      const stakeInfo = await staker.getStake({ delegatorAddress: WHALE_DELEGATOR, validatorShareAddress })
      assert.equal(stakeInfo.totalStaked, 21988992415946939745339n)
    })

    it('reads allowance', async () => {
      const allowance = await staker.getAllowance(WHALE_DELEGATOR)
      assert.equal(allowance, 0n)
    })

    it('reads unbond nonce', async () => {
      const nonce = await staker.getUnbondNonce({ delegatorAddress: WHALE_DELEGATOR, validatorShareAddress })
      assert.equal(nonce, 0n)
    })

    it('reads liquid rewards', async () => {
      const rewards = await staker.getLiquidRewards({ delegatorAddress: WHALE_DELEGATOR, validatorShareAddress })
      assert.equal(rewards, 262938803657614873036n)
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
      assert.equal(allowance, parseEther(AMOUNT))
    })

    it('stakes and verifies on-chain state', async () => {
      await approveAndStake({ delegatorAddress, validatorShareAddress, amount: AMOUNT, staker, walletClient, publicClient })

      const stakeInfo = await staker.getStake({ delegatorAddress, validatorShareAddress })
      assert.equal(stakeInfo.totalStaked, parseEther(AMOUNT))
    })

    it('unstakes and creates unbond request', async () => {
      await approveAndStake({ delegatorAddress, validatorShareAddress, amount: AMOUNT, staker, walletClient, publicClient })

      const nonceBefore = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })
      const epochBefore = await staker.getEpoch()

      await unstake({ delegatorAddress, validatorShareAddress, amount: AMOUNT, staker, walletClient, publicClient })

      const nonceAfter = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })
      assert.equal(nonceAfter, nonceBefore + 1n)

      const unbond = await staker.getUnbond({ delegatorAddress, validatorShareAddress, unbondNonce: nonceAfter })
      assert.equal(unbond.shares, parseEther(AMOUNT))
      assert.isTrue(unbond.withdrawEpoch >= epochBefore)

      const stakeAfter = await staker.getStake({ delegatorAddress, validatorShareAddress })
      assert.equal(stakeAfter.totalStaked, 0n)
    })

    it('builds withdraw tx after unbonding period', async () => {
      await approveAndStake({ delegatorAddress, validatorShareAddress, amount: AMOUNT, staker, walletClient, publicClient })
      await unstake({ delegatorAddress, validatorShareAddress, amount: AMOUNT, staker, walletClient, publicClient })

      const nonce = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })
      const unbond = await staker.getUnbond({ delegatorAddress, validatorShareAddress, unbondNonce: nonce })

      await advanceEpoch({ publicClient, staker, targetEpoch: unbond.withdrawEpoch })

      const { tx } = await staker.buildWithdrawTx({ delegatorAddress, validatorShareAddress, unbondNonce: nonce })

      assert.equal(tx.to, validatorShareAddress)
      assert.equal(tx.value, 0n)
      assert.isDefined(tx.data)
      assert.isDefined(tx.accessList)
    })

    it('rejects withdraw for non-existent unbond', async () => {
      await expect(
        staker.buildWithdrawTx({ delegatorAddress, validatorShareAddress, unbondNonce: 999n })
      ).to.be.rejectedWith('No unbond request found for nonce 999')
    })

    it('rejects claim rewards when none available', async () => {
      await approveAndStake({ delegatorAddress, validatorShareAddress, amount: AMOUNT, staker, walletClient, publicClient })

      await expect(
        staker.buildClaimRewardsTx({ delegatorAddress, validatorShareAddress })
      ).to.be.rejectedWith('No rewards available to claim')
    })

    it('rejects compound when no rewards available', async () => {
      await approveAndStake({ delegatorAddress, validatorShareAddress, amount: AMOUNT, staker, walletClient, publicClient })

      await expect(
        staker.buildCompoundTx({ delegatorAddress, validatorShareAddress })
      ).to.be.rejectedWith('No rewards available to compound')
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
      assert.isTrue(rewardsBefore > 0n, 'Whale should have accrued rewards')

      const balanceBefore = await publicClient.readContract({
        address: NETWORK_CONTRACTS.mainnet.stakingTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [WHALE_DELEGATOR]
      })

      const { tx } = await staker.buildClaimRewardsTx({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      await sendTx({ tx, walletClient: whaleWallet, publicClient, delegatorAddress: WHALE_DELEGATOR })

      const rewardsAfter = await staker.getLiquidRewards({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      assert.equal(rewardsAfter, 0n)

      const balanceAfter = await publicClient.readContract({
        address: NETWORK_CONTRACTS.mainnet.stakingTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [WHALE_DELEGATOR]
      })
      assert.equal(balanceAfter - balanceBefore, rewardsBefore)
    })

    it('compounds rewards and verifies stake increase', async () => {
      const rewardsBefore = await staker.getLiquidRewards({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      assert.isTrue(rewardsBefore > 0n, 'Whale should have accrued rewards')

      const stakeBefore = await staker.getStake({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })

      const { tx } = await staker.buildCompoundTx({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      await sendTx({ tx, walletClient: whaleWallet, publicClient, delegatorAddress: WHALE_DELEGATOR })

      const rewardsAfter = await staker.getLiquidRewards({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      assert.equal(rewardsAfter, 0n)

      const stakeAfter = await staker.getStake({
        delegatorAddress: WHALE_DELEGATOR,
        validatorShareAddress
      })
      assert.equal(stakeAfter.totalStaked - stakeBefore.totalStaked, rewardsBefore)
    })
  })
})
