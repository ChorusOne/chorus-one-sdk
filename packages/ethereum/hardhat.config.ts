import { type HardhatUserConfig } from 'hardhat/config'
import networkConfig from './test/lib/networks.json'

const config: HardhatUserConfig = {
  solidity: '0.8.20',
  networks: {
    hardhat: {
      type: 'edr-simulated',
      forking: {
        url: process.env.NETWORK === 'hoodi' ? networkConfig.networks.hoodi.url : networkConfig.networks.ethereum.url,
        enabled: true,
        blockNumber: 22217318
      },
      accounts: networkConfig.accounts.map((acc) => ({
        privateKey: acc.privateKey,
        balance: acc.balance
      }))
    },
    localhost: {
      type: 'http',
      url: 'http://127.0.0.1:8545'
    }
  }
}

export default config
