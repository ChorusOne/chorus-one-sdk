import { PolygonStaker } from '@chorus-one/polygon'
import { type PublicClient, type WalletClient, type Address, parseEther } from 'viem'
import { assert } from 'chai'
import { prepareTests, fundWithStakingToken, approve, stake } from './utils'
import { restoreToInitialState } from './setup'

const amountToApprove = '100'
const amountToStake = '100'

describe('PolygonStaker', () => {
  let delegatorAddress: Address
  let validatorShareAddress: Address
  let walletClient: WalletClient
  let publicClient: PublicClient
  let staker: PolygonStaker

  afterEach(async () => {
    await restoreToInitialState()
  })

  describe('query methods (zero state)', () => {
    beforeEach(async function () {
      this.timeout(30000)
      const setup = await prepareTests()
      delegatorAddress = setup.delegatorAddress
      validatorShareAddress = setup.validatorShareAddress
      staker = setup.staker
    })

    it('reads current epoch', async () => {
      const epoch = await staker.getEpoch()
      assert.typeOf(epoch, 'bigint')
      assert.isTrue(epoch > 0n)
    })

    it('reads stake info for address with no stake', async () => {
      const stakeInfo = await staker.getStake({ delegatorAddress, validatorShareAddress })
      assert.equal(stakeInfo.totalStaked, 0n)
    })

    it('reads allowance for address with no approval', async () => {
      const allowance = await staker.getAllowance(delegatorAddress)
      assert.equal(allowance, 0n)
    })

    it('reads unbond nonce for address with no unbonds', async () => {
      const nonce = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })
      assert.equal(nonce, 0n)
    })

    it('reads liquid rewards for address with no stake', async () => {
      const rewards = await staker.getLiquidRewards({ delegatorAddress, validatorShareAddress })
      assert.equal(rewards, 0n)
    })
  })

  describe('staking lifecycle', () => {
    beforeEach(async function () {
      this.timeout(60000)
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
      await approve({ delegatorAddress, amount: amountToApprove, staker, walletClient, publicClient })

      const allowance = await staker.getAllowance(delegatorAddress)
      assert.equal(allowance, parseEther(amountToApprove))
    })

    it('stakes and verifies on-chain state', async () => {
      await approve({ delegatorAddress, amount: amountToApprove, staker, walletClient, publicClient })

      const stakeBefore = await staker.getStake({ delegatorAddress, validatorShareAddress })

      await stake({ delegatorAddress, validatorShareAddress, amount: amountToStake, staker, walletClient, publicClient })

      const stakeAfter = await staker.getStake({ delegatorAddress, validatorShareAddress })
      const stakeIncrease = stakeAfter.totalStaked - stakeBefore.totalStaked
      assert.equal(stakeIncrease, parseEther(amountToStake))
      assert.isTrue(stakeAfter.shares > 0n)
    })

    it('unstakes and creates unbond request', async () => {
      await approve({ delegatorAddress, amount: amountToApprove, staker, walletClient, publicClient })
      await stake({ delegatorAddress, validatorShareAddress, amount: amountToStake, staker, walletClient, publicClient })

      const nonceBefore = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })

      const { tx } = await staker.buildUnstakeTx({ delegatorAddress, validatorShareAddress, amount: amountToStake })
      const request = await walletClient.prepareTransactionRequest({ ...tx, chain: undefined })
      const hash = await walletClient.sendTransaction({ ...request, account: delegatorAddress })
      const receipt = await publicClient.getTransactionReceipt({ hash })
      assert.equal(receipt.status, 'success')

      const nonceAfter = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })
      assert.equal(nonceAfter, nonceBefore + 1n)

      const unbond = await staker.getUnbond({ delegatorAddress, validatorShareAddress, unbondNonce: nonceAfter })
      assert.isTrue(unbond.shares > 0n)
      assert.isTrue(unbond.withdrawEpoch > 0n)
    })
  })
})
