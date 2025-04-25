/* eslint-disable */
/** @type import('hardhat/config').HardhatUserConfig */
const config = require('./test/lib/networks.json')

module.exports = {
  solidity: '0.8.20',
  networks: {
    hardhat: {
      forking: {
        url: process.env.NETWORK === 'hoodi' ? config.networks.hoodi.url : config.networks.ethereum.url
      },
      accounts: config.accounts
    }
  }
}
