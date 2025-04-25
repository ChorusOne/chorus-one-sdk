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
  networkConfig: NetworkConfig
  accounts: Account[]
  network: keyof typeof config.networks
} => {
  const network = (process.env.NETWORK || 'ethereum') as keyof typeof config.networks

  const networkConfig = config.networks[network] as NetworkConfig

  return {
    networkConfig,
    accounts: config.accounts,
    network
  }
}
