import { PolygonStaker, CHORUS_ONE_POLYGON_VALIDATORS, NETWORK_CONTRACTS } from '@chorus-one/polygon'
import {
  createWalletClient,
  createPublicClient,
  http,
  erc20Abi,
  encodeFunctionData,
  parseEther,
  toHex,
  type PublicClient,
  type WalletClient,
  type Hex,
  type Address
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hardhat } from 'viem/chains'
import { assert } from 'chai'
import networkConfig from '../lib/networks.json'

export interface TestSetup {
  validatorShareAddress: Address
  walletClient: WalletClient
  publicClient: PublicClient
  staker: PolygonStaker
  delegatorAddress: Address
}

export const prepareTests = async (): Promise<TestSetup> => {
  const privateKey = networkConfig.accounts[0].privateKey as Hex
  const account = privateKeyToAccount(privateKey)

  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http()
  })

  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http()
  })

  const staker = new PolygonStaker({
    network: 'mainnet',
    rpcUrl: hardhat.rpcUrls.default.http[0]
  })

  return {
    validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
    walletClient,
    publicClient,
    staker,
    delegatorAddress: account.address
  }
}

export const fundWithStakingToken = async ({
  publicClient,
  recipientAddress,
  amount
}: {
  publicClient: PublicClient
  recipientAddress: Address
  amount: bigint
}): Promise<void> => {
  await publicClient.request({
    method: 'hardhat_impersonateAccount',
    params: [NETWORK_CONTRACTS.mainnet.stakeManagerAddress]
  } as any)

  await publicClient.request({
    method: 'hardhat_setBalance',
    params: [NETWORK_CONTRACTS.mainnet.stakeManagerAddress, toHex(parseEther('1'))]
  } as any)

  const impersonatedClient = createWalletClient({
    account: NETWORK_CONTRACTS.mainnet.stakeManagerAddress,
    chain: hardhat,
    transport: http()
  })

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [recipientAddress, amount]
  })

  const hash = await impersonatedClient.sendTransaction({
    to: NETWORK_CONTRACTS.mainnet.stakingTokenAddress,
    data,
    chain: null
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error('Failed to fund test account with staking token')
  }

  await publicClient.request({
    method: 'hardhat_stopImpersonatingAccount',
    params: [NETWORK_CONTRACTS.mainnet.stakeManagerAddress]
  } as any)
}

export const approve = async ({
  delegatorAddress,
  amount,
  staker,
  walletClient,
  publicClient
}: {
  delegatorAddress: Address
  amount: string
  staker: PolygonStaker
  walletClient: WalletClient
  publicClient: PublicClient
}): Promise<void> => {
  const { tx } = await staker.buildApproveTx({ amount })

  const request = await walletClient.prepareTransactionRequest({
    ...tx,
    chain: undefined
  })

  const hash = await walletClient.sendTransaction({
    ...request,
    account: delegatorAddress
  })

  const receipt = await publicClient.getTransactionReceipt({ hash })
  assert.equal(receipt.status, 'success')
}

export const stake = async ({
  delegatorAddress,
  validatorShareAddress,
  amount,
  staker,
  walletClient,
  publicClient
}: {
  delegatorAddress: Address
  validatorShareAddress: Address
  amount: string
  staker: PolygonStaker
  walletClient: WalletClient
  publicClient: PublicClient
}): Promise<void> => {
  const { tx } = await staker.buildStakeTx({
    delegatorAddress,
    validatorShareAddress,
    amount
  })

  const request = await walletClient.prepareTransactionRequest({
    ...tx,
    chain: undefined
  })

  const hash = await walletClient.sendTransaction({
    ...request,
    account: delegatorAddress
  })

  const receipt = await publicClient.getTransactionReceipt({ hash })
  assert.equal(receipt.status, 'success')
}
