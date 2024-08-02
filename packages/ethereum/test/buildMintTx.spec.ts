import { EthereumStaker } from '@chorus-one/ethereum'
import { Hex, PublicClient, WalletClient, erc20Abi, parseEther } from 'viem'
import { assert } from 'chai'
import { mint, prepareTests, stake } from './lib/utils'

const amountToStake = parseEther('20')
const amountToMint = parseEther('1')

describe('EthereumStaker.buildMintTx', () => {
  let delegatorAddress: Hex
  let validatorAddress: Hex
  let publicClient: PublicClient
  let walletClient: WalletClient
  let staker: EthereumStaker
  let osEthTokenAddress: Hex

  beforeEach(async () => {
    const setup = await prepareTests()

    delegatorAddress = setup.walletClient.account.address
    validatorAddress = setup.validatorAddress
    publicClient = setup.publicClient
    walletClient = setup.walletClient
    staker = setup.staker
    osEthTokenAddress = setup.osEthTokenAddress

    await stake({
      delegatorAddress,
      validatorAddress,
      amountToStake,
      publicClient,
      walletClient,
      staker
    })
  })

  it('should build a minting tx', async () => {
    const { maxMint } = await staker.getMint({
      delegatorAddress,
      validatorAddress
    })

    assert(parseEther(maxMint) > 0n)
    assert(parseEther(maxMint) > amountToMint)

    await mint({
      delegatorAddress,
      validatorAddress,
      amountToMint,
      publicClient,
      walletClient,
      staker
    })

    const { maxMint: maxMintAfter } = await staker.getMint({
      delegatorAddress,
      validatorAddress
    })

    // Take into account vault fees
    assert.closeTo(
      Number(parseEther(maxMintAfter)),
      Number(parseEther(maxMint) - amountToMint),
      Number(parseEther('0.001'))
    )

    const osEthBalance = await publicClient.readContract({
      abi: erc20Abi,
      address: osEthTokenAddress,
      functionName: 'balanceOf',
      args: [delegatorAddress]
    })
    assert.equal(osEthBalance, amountToMint)
  })
})
