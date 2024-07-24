# Chorus One SDK: Local Signer

Local signer for Chorus One SDK that utilizes a BIP39 mnemonic for signing operations.

## Documentation

For detailed instructions on how to set up and use Local Signer with Chorus One SDK, please visit our [main documentation](https://chorus-one.gitbook.io/sdk/signers-explained/local).

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/signer-local --save
```

## Usage

Here is a basic example of how to configure and initialize the LocalSigner:

```javascript
import { SolanaStaker } from '@chorus-one/solana';
import { LocalSigner } from '@chorus-one/signer-local';

const signer = new LocalSigner({
  mnemonic: 'your-mnemonic-phrase',
  accounts: [{ hdPath: 'your-hd-path' }]
  addressDerivationFn: SolanaStaker.getAddressDerivationFn()
});

await signer.init();
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
