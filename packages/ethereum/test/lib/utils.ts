import { CHORUS_ONE_ETHEREUM_VALIDATORS, EthereumStaker } from '@chorus-one/ethereum'
import { createWalletClient, http, createPublicClient, Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hardhat } from 'viem/chains'

import hardhatConfig from './hardhat.json'

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

  return {
    validatorAddress: CHORUS_ONE_ETHEREUM_VALIDATORS.holesky.mevMaxVault,
    walletClient,
    publicClient,
    staker
  }
}
