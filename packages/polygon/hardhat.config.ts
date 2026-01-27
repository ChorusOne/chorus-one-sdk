import { type HardhatUserConfig } from 'hardhat/config'
import networkConfig from './test/lib/networks.json'

const config: HardhatUserConfig = {
  solidity: '0.8.20',
  networks: {
    hardhat: {
      type: 'edr-simulated',
      initialBaseFeePerGas: 0,
      forking: {
        url: networkConfig.networks.ethereum.url,
        enabled: true,
        blockNumber: 21500000
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
