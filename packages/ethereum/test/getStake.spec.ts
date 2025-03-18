import { EthereumStaker } from '@chorus-one/ethereum'
import { Hex, parseEther, PublicClient, WalletClient } from 'viem'
import { prepareTests, stake } from './lib/utils'
import { assert } from 'chai'

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

  it('returns staked balance and maxUnstake', async () => {
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

    // Take into account gas fees
    assert.closeTo(Number(parseEther(stakeAfter) - amountToStake), 0, 1)
    assert.closeTo(Number(parseEther(maxUnstake) - amountToStake), 0, 1)
  })
})
