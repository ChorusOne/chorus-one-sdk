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

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction on Monad using viem.

```javascript
// Configuration
// -------------

import { MonadStaker } from '@chorus-one/monad'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const staker = new MonadStaker({
  rpcUrl: 'https://your-monad-rpc.com'
  // contractAddress: '0x0000000000000000000000000000000000001000' (optional, defaults to precompile address)
})

await staker.init()

// Building the delegation transaction
// ------------------------------------

const validatorId = 1 // Unique identifier for the validator
const amount = '1000' // Amount in MON

const tx = await staker.buildDelegateTx({
  validatorId,
  amount
})

// Signing and broadcasting the transaction with viem
// ---------------------------------------------------

const account = privateKeyToAccount('0x...')

const walletClient = createWalletClient({
  account,
  chain: {
    id: 41454, // Monad testnet chain ID
    name: 'Monad',
    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://your-monad-rpc.com'] },
      public: { http: ['https://your-monad-rpc.com'] }
    }
  },
  transport: http('https://your-monad-rpc.com')
})

const txHash = await walletClient.sendTransaction(tx)

console.log('Transaction hash:', txHash)
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
