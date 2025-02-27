# Chorus One SDK: TON

All-in-one toolkit for building staking dApps on TON.

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK for TON staking, please visit our [main documentation](https://chorus-one.gitbook.io/sdk/build-your-staking-dapp/ton/overview).

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/ton --save
```

## Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction using Fireblocks as the signer.

```javascript
// Configuration
// -------------

import { TonPoolStaker } from '@chorus-one/ton'

const staker = new TonPoolStaker({
  rpcUrl: 'https://toncenter.com/api/v2/jsonRPC'
})

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr'

// You can use the Chorus One validator address or specify your own
const validatorAddressPair = [
  'kQAHBakDk_E7qLlNQZxJDsqj_ruyAFpqarw85tO-c03fK26F',
  'kQCltujow9Sq3ZVPPU6CYGfqwDxYwjlmFGZ1Wt0bAYebio4o'
]

const { tx } = await staker.buildStakeTx({
  validatorAddressPair,
  amount: '1' // 1 TON
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

const txHash = await staker.broadcast({ signedTx })

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
