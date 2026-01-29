# Chorus One SDK: Polygon

All-in-one toolkit for building staking dApps on Polygon network.

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK for Polygon staking, please visit our [main documentation](https://chorus-one.gitbook.io/sdk/build-your-staking-dapp/polygon/overview).

## Installation

In the project's root directory, run the following command:

```bash
npm install @chorus-one/polygon
```

## Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction using Fireblocks as the signer.

```javascript
// Configuration
// -------------

import { PolygonStaker } from '@chorus-one/polygon'

const staker = new PolygonStaker({
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY'
})

await staker.init()

// Approving POL tokens
// --------------------

const delegatorAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const validatorShareAddress = '0x...' // Validator's share contract address

const { tx: approveTx } = await staker.buildApproveTx({
  amount: '1000' // Amount in POL
})

// Building the staking transaction
// ---------------------------------

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorShareAddress,
  amount: '1000' // Amount in POL
})

// Signing the transaction with Fireblocks
// ----------------------------------------

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
