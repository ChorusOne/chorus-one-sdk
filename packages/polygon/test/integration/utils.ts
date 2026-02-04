import { PolygonStaker, CHORUS_ONE_POLYGON_VALIDATORS, NETWORK_CONTRACTS, type Transaction } from '@chorus-one/polygon'
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

export interface StakingParams {
  delegatorAddress: Address
  validatorShareAddress: Address
  amount: string
  maximumSharesToBurn?: bigint
  staker: PolygonStaker
  walletClient: WalletClient
  publicClient: PublicClient
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
  await impersonate({ publicClient, address: NETWORK_CONTRACTS.mainnet.stakeManagerAddress })

  const impersonatedClient = createWalletClient({
    account: NETWORK_CONTRACTS.mainnet.stakeManagerAddress,
    chain: hardhat,
    transport: http()
  })

  await sendTx({
    tx: {
      to: NETWORK_CONTRACTS.mainnet.stakingTokenAddress,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipientAddress, amount]
      }),
      value: 0n
    },
    walletClient: impersonatedClient,
    publicClient,
    delegatorAddress: NETWORK_CONTRACTS.mainnet.stakeManagerAddress
  })
}

export const approve = async ({
  delegatorAddress,
  amount,
  staker,
  walletClient,
  publicClient
}: Omit<StakingParams, 'validatorShareAddress'>): Promise<void> => {
  const { tx } = await staker.buildApproveTx({ amount })
  await sendTx({ tx, walletClient, publicClient, delegatorAddress })
}

export const stake = async ({
  delegatorAddress,
  validatorShareAddress,
  amount,
  staker,
  walletClient,
  publicClient
}: StakingParams): Promise<void> => {
  const { tx } = await staker.buildStakeTx({ delegatorAddress, validatorShareAddress, amount })
  await sendTx({ tx, walletClient, publicClient, delegatorAddress })
}

export const approveAndStake = async (params: StakingParams): Promise<void> => {
  await approve(params)
  await stake(params)
}

export const sendTx = async ({
  tx,
  walletClient,
  publicClient,
  delegatorAddress
}: {
  tx: Transaction
  walletClient: WalletClient
  publicClient: PublicClient
  delegatorAddress: Address
}): Promise<void> => {
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

export const unstake = async ({
  delegatorAddress,
  validatorShareAddress,
  amount,
  maximumSharesToBurn,
  staker,
  walletClient,
  publicClient
}: Required<StakingParams>): Promise<void> => {
  const { tx } = await staker.buildUnstakeTx({ delegatorAddress, validatorShareAddress, amount, maximumSharesToBurn })
  await sendTx({ tx, walletClient, publicClient, delegatorAddress })
}

export const getStakingTokenBalance = async ({
  publicClient,
  address
}: {
  publicClient: PublicClient
  address: Address
}): Promise<bigint> => {
  return publicClient.readContract({
    address: NETWORK_CONTRACTS.mainnet.stakingTokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address]
  })
}

export const getWithdrawalDelay = async ({ publicClient }: { publicClient: PublicClient }): Promise<bigint> => {
  return publicClient.readContract({
    address: NETWORK_CONTRACTS.mainnet.stakeManagerAddress,
    abi: [
      {
        type: 'function',
        name: 'withdrawalDelay',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
      }
    ] as const,
    functionName: 'withdrawalDelay'
  })
}

export const impersonate = async ({
  publicClient,
  address
}: {
  publicClient: PublicClient
  address: Address
}): Promise<void> => {
  await publicClient.request({
    method: 'hardhat_impersonateAccount',
    params: [address]
  } as any)

  await publicClient.request({
    method: 'hardhat_setBalance',
    params: [address, toHex(parseEther('10'))]
  } as any)
}

// Reference: https://etherscan.io/address/0x6e7a5820baD6cebA8Ef5ea69c0C92EbbDAc9CE48
const GOVERNANCE_ADDRESS = '0x6e7a5820baD6cebA8Ef5ea69c0C92EbbDAc9CE48' as Address

// Reference: https://github.com/0xPolygon/pos-contracts/blob/main/contracts/staking/stakeManager/StakeManager.sol
const SET_CURRENT_EPOCH_ABI = [
  {
    type: 'function',
    name: 'setCurrentEpoch',
    inputs: [{ name: '_currentEpoch', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const

export const advanceEpoch = async ({
  publicClient,
  staker,
  targetEpoch
}: {
  publicClient: PublicClient
  staker: PolygonStaker
  targetEpoch: bigint
}): Promise<void> => {
  const currentEpoch = await staker.getEpoch()
  if (currentEpoch >= targetEpoch) return

  await impersonate({ publicClient, address: GOVERNANCE_ADDRESS })

  const governanceWallet = createWalletClient({
    account: GOVERNANCE_ADDRESS,
    chain: hardhat,
    transport: http()
  })

  await sendTx({
    tx: {
      to: NETWORK_CONTRACTS.mainnet.stakeManagerAddress,
      data: encodeFunctionData({
        abi: SET_CURRENT_EPOCH_ABI,
        functionName: 'setCurrentEpoch',
        args: [targetEpoch]
      }),
      value: 0n
    },
    walletClient: governanceWallet,
    publicClient,
    delegatorAddress: GOVERNANCE_ADDRESS
  })
}
