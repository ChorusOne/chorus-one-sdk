# Chorus One SDK: Avalanche

All-in-one toolkit for building staking dApps on Avalanche.

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK for Avalanche staking, please visit our [main documentation](http://example.com/todo-fix-me).

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/avalanche --save
```

## Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction using Fireblocks as the signer.

```javascript
// Configuration
// -------------

import { AvalancheStaker, CHORUS_ONE_AVALANCHE_VALIDATORS } from '@chorus-one/avalanche'

const staker = new AvalancheStaker({
  rpcUrl: 'https://api.avax.network',
  hrp: 'avax'
})

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = 'P-avax10uzff2f0u8hstlr5ywt2x4lactmn28c5y9uddv'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_AVALANCHE_VALIDATORS[0]
// 'NodeID-LkDLSLrAW1E7Sga1zng17L1AqrtkyWTGg'

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorAddress,
  amount: '1' // 1 AVAX,
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

const { txId } = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({ txId, chain: 'P' })

console.log(status) // 'success'
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
