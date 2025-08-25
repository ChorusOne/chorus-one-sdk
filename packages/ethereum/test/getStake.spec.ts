import { EthereumStaker } from '@chorus-one/ethereum'
import { Hex, parseEther, PublicClient, WalletClient } from 'viem'
import { prepareTests, stake } from './lib/utils'
import { assert } from 'chai'
import { restoreToInitialState } from './setup'

const amountToStake = parseEther('2')

describe('EthereumStaker.getStake', () => {
  let validatorAddress: Hex
  let delegatorAddress: Hex
  let walletClient: WalletClient
  let publicClient: PublicClient
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()
    validatorAddress = setup.validatorAddress
    delegatorAddress = setup.walletClient.account.address
    walletClient = setup.walletClient
    publicClient = setup.publicClient
    staker = setup.staker
  })
  afterEach(async () => {
    // Restore to clean state after each test
    await restoreToInitialState()
  })
  it('returns staked balance and maxUnstake', async () => {
    const { balance: stakebefore } = await staker.getStake({
      delegatorAddress,
      validatorAddress
    })
    console.log(`Stake before: ${stakebefore}`)

    await stake({
      delegatorAddress,
      validatorAddress,
      amountToStake,
      publicClient,
      walletClient,
      staker
    })

    const { balance: stakeAfter, maxUnstake } = await staker.getStake({
      delegatorAddress,
      validatorAddress
    })
    console.log(`Stake after: ${stakeAfter}, maxUnstake: ${maxUnstake}`)

    // Take into account gas fees
    assert.closeTo(Number(parseEther(stakeAfter) - amountToStake), 0, 1)
    assert.closeTo(Number(parseEther(maxUnstake) - amountToStake), 0, 1)
  })
})
