import { EthereumStaker } from '@chorus-one/ethereum'
import { Hex, PublicClient, WalletClient, erc20Abi, formatEther, parseEther } from 'viem'
import { assert } from 'chai'
import { mint, prepareTests, stake } from './lib/utils'
import { describe } from 'mocha'

const amountToStake = parseEther('20')
const amountToMint = parseEther('15')
const amountToBurn = parseEther('10')

describe('EthStaker.buildBurnTx', () => {
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

  it('should build a burning tx', async () => {
    await mint({
      delegatorAddress,
      validatorAddress,
      amountToMint,
      publicClient,
      walletClient,
      staker
    })

    const { maxMint: maxMintAfterMint } = await staker.getMint({
      delegatorAddress,
      validatorAddress
    })

    const { tx } = await staker.buildBurnTx({
      delegatorAddress,
      validatorAddress,
      amount: formatEther(amountToBurn)
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

    const { maxMint: maxMintAfterBurn } = await staker.getMint({
      delegatorAddress,
      validatorAddress
    })

    // Take into account vault fees
    assert.closeTo(
      Number(parseEther(maxMintAfterBurn)),
      Number(parseEther(maxMintAfterMint) + amountToBurn),
      Number(parseEther('0.001'))
    )

    const osEthBalance = await publicClient.readContract({
      abi: erc20Abi,
      address: osEthTokenAddress,
      functionName: 'balanceOf',
      args: [delegatorAddress]
    })
    assert.equal(osEthBalance, amountToMint - amountToBurn)
  })
})
