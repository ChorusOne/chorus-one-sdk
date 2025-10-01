# Chorus One SDK: SOLANA

All-in-one toolkit for building staking dApps on SOLANA Protocol.

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK for SOLANA staking, please visit our [main documentation](https://chorus-one.gitbook.io/sdk/build-your-staking-dapp/solana/overview).

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/solana --save
```

## Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction using Fireblocks as the signer.

```javascript
// Configuration
// -------------

import { SolanaStaker, CHORUS_ONE_SOLANA_VALIDATOR } from '@chorus-one/solana'

const staker = new SolanaStaker({
  rpcUrl: 'https://api.mainnet-beta.solana.com'
})

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = '3Ps2hwsgGMSuqxAwjcGJHiEpMsSTZcxrCGprHgxWkfma'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_SOLANA_VALIDATOR

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorAddress,
  amount: '1' // 1 SOL
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
