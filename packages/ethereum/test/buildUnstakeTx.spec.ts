import { EthereumStaker } from '@chorus-one/ethereum'
import { Hex, PublicClient, WalletClient, erc20Abi, formatEther, parseEther } from 'viem'
import { mint, prepareTests, stake } from './lib/utils'
import { assert } from 'chai'

const amountToStake = parseEther('5')
const amountToUnstake = parseEther('4')

describe('EthereumStaker.buildUnstakeTx', () => {
  let delegatorAddress: Hex
  let validatorAddress: Hex
  let walletClient: WalletClient
  let publicClient: PublicClient
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

  it('performs a full cycle of stake, mint, burn, and unstake max', async () => {
    const { maxMint } = await staker.getMint({
      delegatorAddress,
      validatorAddress
    })

    const amountToMint = parseEther(maxMint)

    await mint({
      delegatorAddress,
      validatorAddress,
      amountToMint,
      publicClient,
      walletClient,
      staker
    })

    const osEthBalance = await publicClient.readContract({
      abi: erc20Abi,
      address: osEthTokenAddress,
      functionName: 'balanceOf',
      args: [delegatorAddress]
    })

    const { balance: mintedBalance } = await staker.getMint({
      delegatorAddress,
      validatorAddress
    })

    const mintedBalanceBigInt = parseEther(mintedBalance)

    const unstakeAmount = mintedBalanceBigInt > osEthBalance ? osEthBalance : mintedBalanceBigInt

    const { tx: burnTx } = await staker.buildBurnTx({
      delegatorAddress,
      validatorAddress,
      amount: formatEther(unstakeAmount)
    })

    const burnRequest = await walletClient.prepareTransactionRequest({
      ...burnTx,
      chain: undefined
    })

    const burnHash = await walletClient.sendTransaction({
      ...burnRequest,
      account: delegatorAddress
    })

    const burnReceipt = await publicClient.waitForTransactionReceipt({ hash: burnHash })
    assert.equal(burnReceipt.status, 'success')

    const osEthBalanceAfterBurn = await publicClient.readContract({
      abi: erc20Abi,
      address: osEthTokenAddress,
      functionName: 'balanceOf',
      args: [delegatorAddress]
    })

    assert.closeTo(Number(osEthBalanceAfterBurn), 0, 1)

    const { maxUnstake: maxUnstakeAfterBurn } = await staker.getStake({
      delegatorAddress,
      validatorAddress
    })

    const { tx: unstakeTx } = await staker.buildUnstakeTx({
      delegatorAddress,
      validatorAddress,
      amount: maxUnstakeAfterBurn
    })

    const unstakeRequest = await walletClient.prepareTransactionRequest({
      ...unstakeTx,
      chain: undefined
    })

    const unstakeHash = await walletClient.sendTransaction({
      ...unstakeRequest,
      account: delegatorAddress
    })

    const unstakeReceipt = await publicClient.waitForTransactionReceipt({ hash: unstakeHash })
    assert.equal(unstakeReceipt.status, 'success')
  })
})
