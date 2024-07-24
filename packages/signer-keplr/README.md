# Chorus One SDK: Keplr Signer

Keplr signer for the Chorus One SDK, used for signing Cosmos transactions.

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/signer-keplr --save
```

## Usage

Here is a basic example of how to configure and initialize the KeplrSigner:

```javascript
import { KeplrSigner } from '@chorus-one/signer-keplr'

const signer = new KeplrSigner({
  signer: window.keplr,
  chainId: 'cosmoshub-4'
})

await signer.init()
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
