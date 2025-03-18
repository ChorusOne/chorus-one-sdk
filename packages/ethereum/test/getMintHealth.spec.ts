import { EthereumStaker } from '@chorus-one/ethereum'
import { Hex, PublicClient, WalletClient, formatEther, parseEther } from 'viem'
import { assert } from 'chai'
import { prepareTests, stake } from './lib/utils'

const amountToStake = parseEther('20')

describe('EthereumStaker.getMintHealth', () => {
  let delegatorAddress: Hex
  let validatorAddress: Hex
  let publicClient: PublicClient
  let walletClient: WalletClient
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

  it('returns health of mint', async () => {
    const { maxMint } = await staker.getMint({
      delegatorAddress,
      validatorAddress
    })

    const amountToMintHealthy = parseEther(maxMint)

    const { health: healthy } = await staker.getMintHealth({
      mintAmount: formatEther(amountToMintHealthy),
      stakeAmount: formatEther(amountToStake),
      validatorAddress
    })

    const amountToMintRisky = parseEther(maxMint) + parseEther('1')

    const { health: _risky } = await staker.getMintHealth({
      mintAmount: formatEther(amountToMintRisky),
      stakeAmount: formatEther(amountToStake),
      validatorAddress
    })

    assert.equal(healthy, 'healthy')
    // assert.equal(risky, 'risky')
  })
})
