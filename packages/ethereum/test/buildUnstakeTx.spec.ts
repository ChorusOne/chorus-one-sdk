import { EthereumStaker } from '@chorus-one/ethereum'
import { Hex, PublicClient, WalletClient, decodeFunctionData, erc20Abi, formatEther, parseEther } from 'viem'
import { mint, prepareTests, stake } from './lib/utils'
import { assert } from 'chai'
import { restoreToInitialState } from './setup'
// Internal imports needed to test harvest encoding paths with a mocked connector.
// The public API (EthereumStaker) doesn't expose connector-level control.
import { VaultABI } from '../src/lib/contracts/vaultAbi'
import { buildUnstakeTx } from '../src/lib/methods/buildUnstakeTx'
import { StakewiseConnector } from '../src/lib/connector'

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
  afterEach(async () => {
    // Restore to clean state after each test
    await restoreToInitialState()
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

  it('encodes multicall(updateState, enterExitQueue) when canHarvest is true', async () => {
    const connector = new StakewiseConnector('ethereum', 'http://127.0.0.1:8545')
    const originalReadContract = connector.eth.readContract.bind(connector.eth)

    // Mock readContract to force canHarvest to return true
    connector.eth.readContract = (async (args: any) => {
      if (args.functionName === 'canHarvest') return true
      return originalReadContract(args)
    }) as typeof connector.eth.readContract

    const tx = await buildUnstakeTx({
      connector,
      userAccount: delegatorAddress,
      vault: validatorAddress,
      amount: amountToUnstake
    })

    const decoded = decodeFunctionData({ abi: VaultABI, data: tx.data })
    assert.equal(decoded.functionName, 'multicall')

    const calls = decoded.args[0] as Hex[]
    assert.equal(calls.length, 2)
    assert.equal(decodeFunctionData({ abi: VaultABI, data: calls[0] }).functionName, 'updateState')
    assert.equal(decodeFunctionData({ abi: VaultABI, data: calls[1] }).functionName, 'enterExitQueue')
  })

  it('encodes plain enterExitQueue when canHarvest is false', async () => {
    const connector = new StakewiseConnector('ethereum', 'http://127.0.0.1:8545')
    const originalReadContract = connector.eth.readContract.bind(connector.eth)

    // Mock readContract to force canHarvest to return false
    connector.eth.readContract = (async (args: any) => {
      if (args.functionName === 'canHarvest') return false
      return originalReadContract(args)
    }) as typeof connector.eth.readContract

    const tx = await buildUnstakeTx({
      connector,
      userAccount: delegatorAddress,
      vault: validatorAddress,
      amount: amountToUnstake
    })

    const decoded = decodeFunctionData({ abi: VaultABI, data: tx.data })
    assert.equal(decoded.functionName, 'enterExitQueue')
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
