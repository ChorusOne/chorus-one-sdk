import { EthereumStaker } from '@chorus-one/ethereum'
import { Hex, PublicClient, WalletClient, formatEther, parseEther } from 'viem'
import { mine } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { assert } from 'chai'
import { prepareTests } from './lib/utils'

const AMOUNT_TO_STAKE = parseEther('2')

describe('EthereumStaker.buildStakeTx', () => {
  let USER_ADDRESS: Hex
  let VAULT_ADDRESS: Hex
  let walletClientWithBalance: WalletClient
  let publicClient: PublicClient
  let staker: EthereumStaker

  beforeEach(async () => {
    const {
      validatorAddress,
      walletClient,
      publicClient: initialPublicClient,
      staker: initialStaker
    } = await prepareTests()
    USER_ADDRESS = walletClient.account.address
    VAULT_ADDRESS = validatorAddress
    walletClientWithBalance = walletClient
    publicClient = initialPublicClient
    staker = initialStaker
  })

  it('Should build staking tx', async () => {
    const balanceBefore = await publicClient.getBalance({
      address: USER_ADDRESS
    })

    const { balance: stakeBefore } = await staker.getStake({
      delegatorAddress: USER_ADDRESS,
      validatorAddress: VAULT_ADDRESS
    })

    const { tx } = await staker.buildStakeTx({
      delegatorAddress: USER_ADDRESS,
      validatorAddress: VAULT_ADDRESS,
      amount: formatEther(AMOUNT_TO_STAKE)
    })

    const request = await walletClientWithBalance.prepareTransactionRequest({
      ...tx,
      chain: undefined
    })
    const hash = await walletClientWithBalance.sendTransaction({
      ...request,
      account: USER_ADDRESS
    })
    await mine(10)

    const receipt = await publicClient.getTransactionReceipt({ hash })
    assert.equal(receipt.status, 'success')

    const balanceAfter = await publicClient.getBalance({
      address: USER_ADDRESS
    })

    const { balance: stakeAfter } = await staker.getStake({
      delegatorAddress: USER_ADDRESS,
      validatorAddress: VAULT_ADDRESS
    })

    // Take into account gas fees
    assert.isTrue(balanceAfter < balanceBefore - AMOUNT_TO_STAKE)
    assert.equal(parseEther(stakeAfter), parseEther(stakeBefore) + AMOUNT_TO_STAKE)
  })

  it('Should build stake tx with referrer', async () => {
    const { balance: stakeBefore } = await staker.getStake({
      delegatorAddress: USER_ADDRESS,
      validatorAddress: VAULT_ADDRESS
    })

    const { tx } = await staker.buildStakeTx({
      delegatorAddress: USER_ADDRESS,
      validatorAddress: VAULT_ADDRESS,
      amount: formatEther(AMOUNT_TO_STAKE),
      referrer: '0x4242424242424242424242424242424242424242'
    })
    const request = await walletClientWithBalance.prepareTransactionRequest({
      ...tx,
      chain: undefined
    })
    const hash = await walletClientWithBalance.sendTransaction({
      ...request,
      account: USER_ADDRESS
    })
    await mine(10)

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    assert.equal(receipt.status, 'success')

    const { balance: stakeAfter } = await staker.getStake({
      delegatorAddress: USER_ADDRESS,
      validatorAddress: VAULT_ADDRESS
    })
    assert.equal(parseEther(stakeAfter), parseEther(stakeBefore) + AMOUNT_TO_STAKE)
  })
})
