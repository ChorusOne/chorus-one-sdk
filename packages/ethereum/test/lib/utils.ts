import { CHORUS_ONE_ETHEREUM_VALIDATORS, EthereumStaker } from '@chorus-one/ethereum'
import { createWalletClient, http, createPublicClient, Hex, formatEther, PublicClient, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hardhat } from 'viem/chains'

import hardhatConfig from './hardhat.json'
import { assert } from 'chai'

export const prepareTests = async () => {
  const privateKey = hardhatConfig.networks.hardhat.accounts[0].privateKey as Hex
  const account = privateKeyToAccount(privateKey)
  if (!account) throw new Error('Account not found')
  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http()
  })
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http()
  })
  const resetParams = {
    forking: {
      jsonRpcUrl: hardhatConfig.networks.hardhat.forking.url
    },
    accounts: hardhatConfig.networks.hardhat.accounts
  }

  await fetch('http://localhost:8545', {
    method: 'POST',
    body: `{"jsonrpc":"2.0","method":"hardhat_reset","params":[${JSON.stringify(resetParams)}],"id":1}`
  })

  const staker = new EthereumStaker({
    network: 'holesky',
    rpcUrl: hardhat.rpcUrls.default.http[0]
  })
  await staker.init()

  const osEthTokenAddress = '0xF603c5A3F774F05d4D848A9bB139809790890864' as const

  return {
    validatorAddress: CHORUS_ONE_ETHEREUM_VALIDATORS.holesky.mevMaxVault,
    walletClient,
    publicClient,
    staker,
    osEthTokenAddress
  }
}

export const stake = async ({
  delegatorAddress,
  validatorAddress,
  referrer,
  amountToStake,
  staker,
  walletClient,
  publicClient
}: {
  delegatorAddress: Hex
  validatorAddress: Hex
  referrer?: Hex
  amountToStake: bigint
  staker: EthereumStaker
  walletClient: WalletClient
  publicClient: PublicClient
}) => {
  const { tx } = await staker.buildStakeTx({
    delegatorAddress,
    validatorAddress,
    amount: formatEther(amountToStake),
    referrer
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

export const mint = async ({
  delegatorAddress,
  validatorAddress,
  amountToMint,
  staker,
  walletClient,
  publicClient
}: {
  delegatorAddress: Hex
  validatorAddress: Hex
  amountToMint: bigint
  staker: EthereumStaker
  walletClient: WalletClient
  publicClient: PublicClient
}) => {
  const { tx } = await staker.buildMintTx({
    delegatorAddress,
    validatorAddress,
    amount: formatEther(amountToMint)
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
}
