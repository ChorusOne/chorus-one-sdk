# Chorus One SDK: Monad

All-in-one toolkit for building staking dApps on Monad network.

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK for Monad staking, please visit our [main documentation](https://chorus-one.gitbook.io/sdk/build-your-staking-dapp/monad/overview).

## Installation

In the project's root directory, run the following command:

```bash
npm install @chorus-one/monad
```

## Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction using Fireblocks as the signer.

```javascript
// Configuration
// -------------

import { MonadStaker } from '@chorus-one/monad'

const staker = new MonadStaker({
  rpcUrl: 'https://testnet-rpc.monad.xyz'
})

await staker.init()

// Building the staking transaction
// ---------------------------------

const delegatorAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const validatorId = 1 // Unique identifier for the validator
const amount = '1000' // Amount in MON

const { tx } = await staker.buildStakeTx({
  validatorId,
  amount
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

## Running Integration Tests

Integration tests make multiple RPC calls and may hit rate limits (HTTP 429 errors). To avoid this:

```bash
# Run tests one by one using .only
it.only('should stake and increase pending stake', async function () { ... })
```

Change `describe.skip` to `describe` in the test file, then add `.only` to individual tests to run them separately.

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
