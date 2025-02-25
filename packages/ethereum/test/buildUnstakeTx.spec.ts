import { EthereumStaker } from '@chorus-one/ethereum'
import { Hex, PublicClient, WalletClient, formatEther, parseEther } from 'viem'
import { prepareTests, stake } from './lib/utils'
import { assert } from 'chai'

const amountToStake = parseEther('5')
const amountToUnstake = parseEther('4')

describe('EthereumStaker.buildUnstakeTx', () => {
  let delegatorAddress: Hex
  let validatorAddress: Hex
  let walletClient: WalletClient
  let publicClient: PublicClient
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()

    delegatorAddress = setup.walletClient.account.address
    validatorAddress = setup.validatorAddress
    publicClient = setup.publicClient
    walletClient = setup.walletClient
    staker = setup.staker

    await stake({
      delegatorAddress,
      validatorAddress,
      amountToStake,
      publicClient,
      walletClient,
      staker
    })
  })

  it('builds an unstaking tx', async () => {
    const { maxUnstake: maxUnstake, balance: assetsAfterStaking } = await staker.getStake({
      delegatorAddress,
      validatorAddress
    })

    // Take into account 1 wei assets conversion issues on the contract
    assert.closeTo(Number(parseEther(maxUnstake)), Number(amountToStake), 1)

    const { tx } = await staker.buildUnstakeTx({
      delegatorAddress,
      validatorAddress,
      amount: formatEther(amountToUnstake)
    })

    const request = await walletClient.prepareTransactionRequest({
      ...tx,
      chain: undefined
    })
    const hash = await walletClient.sendTransaction({
      ...request,
      account: delegatorAddress
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    assert.equal(receipt.status, 'success')

    const { balance: assetsAfterUnstaking } = await staker.getStake({
      delegatorAddress,
      validatorAddress
    })

    // Take into account 1 wei assets conversion issues on the contract
    assert.closeTo(
      Number(parseEther(assetsAfterUnstaking)),
      Number(parseEther(assetsAfterStaking) - amountToUnstake),
      1
    )
  })
})
