import { describe, it, before } from 'mocha'
import { expect } from 'chai'
import { MonadStaker } from '../../src/staker'
import { createWalletClient, http, parseEther, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

describe('MonadStaker - Integration Tests', () => {
  let staker: MonadStaker
  let walletClient: ReturnType<typeof createWalletClient>
  let delegatorAddress: Address
  const validatorId = 1
  const contractAddress: Address = '0x0000000000000000000000000000000000001000'

  before(async function () {
    this.timeout(30000)

    const privateKey = process.env.TEST_MONAD_PRIVATE_KEY
    if (!privateKey) {
      throw new Error('TEST_MONAD_PRIVATE_KEY environment variable is not set')
    }

    const rpcUrl = process.env.TEST_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'

    staker = new MonadStaker({
      rpcUrl,
      contractAddress
    })

    await staker.init()

    const account = privateKeyToAccount(privateKey as `0x${string}`)
    delegatorAddress = account.address

    walletClient = createWalletClient({
      account,
      chain: (staker as any).chain,
      transport: http(rpcUrl)
    })

    console.log(`Using delegator address: ${delegatorAddress}`)
    console.log(`Using validator ID: ${validatorId}`)
  })

  it('should successfully delegate tokens to validator', async function () {
    this.timeout(120000)

    const delegateAmount = '0.01'

    console.log(`\nBuilding delegate transaction for ${delegateAmount} MON...`)
    const tx = await staker.buildDelegateTx({
      validatorId,
      amount: delegateAmount
    })

    expect(tx.to).to.equal(contractAddress)
    expect(tx.value).to.equal(parseEther(delegateAmount))
    expect(tx.data).to.be.a('string')

    console.log('Fetching delegator info before delegation...')
    const delegatorInfoBefore = await staker.getDelegator({
      validatorId,
      delegatorAddress
    })
    console.log(`Stake before: ${delegatorInfoBefore.stake} wei`)

    console.log('Signing and broadcasting transaction...')
    const txHash = await walletClient.sendTransaction({
      ...tx,
      account: walletClient.account!,
      chain: walletClient.chain
    })

    console.log(`Transaction hash: ${txHash}`)
    expect(txHash).to.match(/^0x[a-fA-F0-9]{64}$/)

    console.log('Waiting for confirmation (this may take a while)...')
    const publicClient = (staker as any).publicClient
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`)
    expect(receipt.status).to.equal('success')

    console.log('Verifying delegation...')
    const delegatorInfoAfter = await staker.getDelegator({
      validatorId,
      delegatorAddress
    })

    console.log(`Stake after: ${delegatorInfoAfter.stake} wei`)
    console.log(`Delta stake: ${delegatorInfoAfter.deltaStake} wei`)
    console.log(`Next delta stake: ${delegatorInfoAfter.nextDeltaStake} wei`)

    const totalStake = delegatorInfoAfter.stake + delegatorInfoAfter.deltaStake + delegatorInfoAfter.nextDeltaStake
    expect(Number(totalStake)).to.be.greaterThan(Number(delegatorInfoBefore.stake))

    console.log('✅ Delegation successful!')
  })
})
