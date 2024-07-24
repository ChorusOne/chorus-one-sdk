# Chorus One SDK: Fireblocks Signer

Fireblocks signer for Chorus One SDK.

## Documentation

For detailed instructions on how to set up and use Fireblocks Signer with Chorus One SDK, please visit our [main documentation](https://chorus-one.gitbook.io/sdk/signers-explained/fireblocks).

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/signer-fireblocks --save
```

## Usage

Here is a basic example of how to configure and initialize the FireblocksSigner:

```javascript
import { SolanaStaker } from '@chorus-one/solana';
import { FireblocksSigner } from '@chorus-one/signer-fireblocks';

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'SOL'
  addressDerivationFn: SolanaStaker.getAddressDerivationFn()
});

await signer.init();
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
