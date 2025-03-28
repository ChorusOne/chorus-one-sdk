# Chorus One SDK: Cactus Signer

Cactus signer for the Chorus One SDK, used for signing Cosmos transactions.

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/signer-cactus-cosmos --save
```

## Usage

Here is a basic example of how to configure and initialize the CactusSigner:

```javascript
import { CactusSigner } from '@chorus-one/signer-cactus-cosmos'

const signer = new CactusSigner({
  signer: window.cactuslink_cosmos,
  chainId: 'cosmoshub-4'
})

await signer.init()
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
