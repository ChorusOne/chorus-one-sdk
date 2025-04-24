/* eslint-disable */
/** @type import('hardhat/config').HardhatUserConfig */
const config = require('./test/lib/networks.json')

module.exports = {
  solidity: '0.8.20',
  networks: {
    hardhat: {
      forking: {
        url: process.env.NETWORK === 'ethereum' ? config.networks.ethereum.url : config.networks.hoodi.url
      },
      accounts: config.accounts
    }
  }
}
