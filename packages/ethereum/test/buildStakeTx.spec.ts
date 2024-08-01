import { EthereumStaker } from '@chorus-one/ethereum'
import { Hex, PublicClient, WalletClient, parseEther } from 'viem'
import { assert } from 'chai'
import { prepareTests, stake } from './lib/utils'

const amountToStake = parseEther('2')

describe('EthereumStaker.buildStakeTx', () => {
  let delegatorAddress: Hex
  let validatorAddress: Hex
  let walletClient: WalletClient
  let publicClient: PublicClient
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()

    delegatorAddress = setup.walletClient.account.address
    validatorAddress = setup.validatorAddress
    walletClient = setup.walletClient
    publicClient = setup.publicClient
    staker = setup.staker
  })

  it('should build a staking tx', async () => {
    const balanceBefore = await publicClient.getBalance({
      address: delegatorAddress
    })

    await stake({
      delegatorAddress,
      validatorAddress,
      amountToStake,
      publicClient,
      walletClient,
      staker
    })

    const balanceAfter = await publicClient.getBalance({
      address: delegatorAddress
    })

    const { balance: stakeAfter } = await staker.getStake({
      delegatorAddress,
      validatorAddress
    })

    // Take into account gas fees
    assert.closeTo(Number(balanceAfter), Number(balanceBefore - amountToStake), Number(parseEther('0.001')))
    assert.equal(parseEther(stakeAfter), amountToStake)
  })

  it('should build a staking tx with referrer', async () => {
    await stake({
      delegatorAddress,
      validatorAddress,
      referrer: '0x4242424242424242424242424242424242424242',
      amountToStake,
      publicClient,
      walletClient,
      staker
    })

    const { balance: stakeAfter } = await staker.getStake({
      delegatorAddress,
      validatorAddress
    })

    // Take into account 1 wei assets conversion issues on the contract
    assert.closeTo(Number(parseEther(stakeAfter)), Number(amountToStake), 1)
  })
})
