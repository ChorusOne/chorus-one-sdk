# Chorus One SDK: Ethereum

All-in-one toolkit for building staking dApps on Ethereum Protocol.

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK for Ethereum staking, please visit our [main documentation](https://chorus-one.gitbook.io/sdk/build-your-staking-dapp/ethereum/overview).

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/ethereum --save
```

## Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction using Fireblocks as the signer.

```javascript
// Configuration
// -------------

import { EthereumStaker, CHORUS_ONE_ETHEREUM_VALIDATORS } from '@chorus-one/solana'

const staker = new EthereumStaker({
  network: 'ethereum'})

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = '0xe6d8d8ac54461b1c5ed15740eee322043f696c08'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_ETHEREUM_VALIDATORS.ethereum.mevMaxVault

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorAddress,
  amount: '1' // 1 ETH
})

// Signing the transaction with Fireblocks
// ---------------------------------------

import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

// Broadcasting the transaction
// ----------------------------

const { txHash } = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({ txHash })

console.log(status) // 'success'
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
