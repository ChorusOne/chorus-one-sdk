import { EthereumStaker } from '@chorus-one/ethereum'
import { Hex, parseEther, PublicClient, WalletClient } from 'viem'
import { mint, prepareTests, stake } from './lib/utils'
import { assert } from 'chai'
import { restoreToInitialState } from './setup'

const amountToStake = parseEther('20')
const amountToMint = parseEther('1')

describe('EthereumStaker.getMint', () => {
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

  it('returns minted balance and maxMint', async () => {
    await stake({
      delegatorAddress,
      validatorAddress,
      amountToStake,
      publicClient,
      walletClient,
      staker
    })

    await mint({
      delegatorAddress,
      validatorAddress,
      amountToMint,
      publicClient,
      walletClient,
      staker
    })

    const { balance, maxMint } = await staker.getMint({
      delegatorAddress,
      validatorAddress
    })

    assert(parseEther(maxMint) > parseEther('10'))
    assert(parseEther(maxMint) < amountToStake - amountToMint)
    assert.equal(parseEther(balance), amountToMint)
  })
})
