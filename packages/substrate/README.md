# Chorus One SDK: Substrate

All-in-one toolkit for building staking dApps on Substrate Network SDK blockchains(Polkadot, Kusama, etc.).

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK for Substrate staking, please visit our [main documentation](https://chorus-one.gitbook.io/sdk/build-your-staking-dapp/polkadot-substrate/overview).

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/substrate --save
```

## Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction using Fireblocks as the signer.

```javascript
// Configuration
// -------------

import { SubstrateStaker, RewardDestination, CHORUS_ONE_SUBSTRATE_VALIDATORS } from '@chorus-one/substrate'

import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const staker = new SubstrateStaker({
  rpcUrl: 'wss://rpc.polkadot.io',
  denomMultiplier: 1000000000000,
  rewardDestination: RewardDestination.STASH
})

await staker.init()

// Building the transactions
// -------------------------

const delegatorAddress = '5CavrskYZHeLxTwERikgZDCZPmhpsM7oXZQmL6rkNryDD8FwN'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_SUBSTRATE_VALIDATORS.POLKADOT[0]
// '16XF84j2wQ9wjkqRM2Y8ceCaw8dQu7t3ve9P9XbBj5kaRZxY'

const { tx: stakeTx } = await staker.buildStakeTx({
  amount: '1' // 1 DOT
})

const { tx: nominateTx } = await staker.buildNominateTx({
  validatorAddress
})

// Signing the transactions with Fireblocks
// ----------------------------------------

const { signedTx: signedStakeTx } = await staker.sign({
  signerAddress: delegatorAddress,
  tx: stakeTx
})

const { signedTx: signedNominateTx } = await staker.sign({
  signer,
  tx: nominateTx
})

// Broadcasting the transactions
// -----------------------------

const { txHash } = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({ txHash })

console.log(status) // 'success'

// Closing the connection
// ----------------------

await staker.close()
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
