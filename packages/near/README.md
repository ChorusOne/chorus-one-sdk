# Chorus One SDK: NEAR

All-in-one toolkit for building staking dApps on NEAR Protocol.

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK for NEAR staking, please visit our [main documentation](http://example.com/todo-fix-me).

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/near --save
```

## Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction using Fireblocks as the signer.

```javascript
// Configuration
// -------------

import { NearStaker, CHORUS_ONE_NEAR_VALIDATOR } from '@chorus-one/near'

const staker = new NearStaker({
  networkId: 'mainnet',
  rpcUrl: 'https://rpc.mainnet.near.org'
})

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = 'your.near'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_NEAR_VALIDATOR
// 'chorusone.poolv1.near'

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorAddress,
  amount: '1' // 1 NEAR
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

const {
  transaction: { hash: txHash }
} = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({
  address: delegatorAddress,
  txHash
})

console.log(status) // 'success'
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
