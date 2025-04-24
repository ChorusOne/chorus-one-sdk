import { Hex } from 'viem'
import config from './networks.json'

interface NetworkConfig {
  name: keyof typeof config.networks
  url: string
  addresses: {
    osEthToken: Hex
  }
}

interface Account {
  privateKey: string
  balance: string
}

export const getConfig = (): {
  network: NetworkConfig
  accounts: Account[]
} => {
  if (!process.env.NETWORK || !(process.env.NETWORK in config.networks)) {
    throw new Error('NETWORK is not set')
  }

  const networkConfig = config.networks[process.env.NETWORK as keyof typeof config.networks] as NetworkConfig

  return {
    network: networkConfig,
    accounts: config.accounts
  }
}
