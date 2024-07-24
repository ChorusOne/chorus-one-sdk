# Chorus One SDK: Cosmos

All-in-one toolkit for building staking dApps on Cosmos SDK based networks.

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK for Cosmos staking, please visit our [main documentation](http://example.com/todo-fix-me).

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/cosmos --save
```

## Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction using Fireblocks as the signer.

```javascript
// Configuration
// -------------

import { CosmosStaker, CHORUS_ONE_COSMOS_VALIDATORS, CosmosConfigurator } from '@chorus-one/cosmos'

const networkConfig = await CosmosConfigurator.genNetworkConfig('cosmoshub')

const staker = new CosmosStaker(networkConfig)

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = 'cosmos1x88j7vp2xnw3zec8ur3g4waxycyz7m0mahdv3p'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_COSMOS_VALIDATORS.COSMOS
// 'cosmosvaloper15urq2dtp9qce4fyc85m6upwm9xul3049e02707'

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorAddress,
  amount: '1' // 1 ATOM
})

// Signing the transaction with Fireblocks
// ---------------------------------------

import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx,
  memo: 'Staking 1 ATOM'
})

// Broadcasting the transaction
// ----------------------------

const { transactionHash: txHash } = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({ txHash })

console.log(status) // 'success'
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
