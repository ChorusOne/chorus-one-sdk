# Chorus One SDK: Ledger Cosmos Signer

Ledger signer for the Chorus One SDK, used for signing Cosmos transactions

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/signer-ledger-cosmos --save
```

## Setting Up the LedgerCosmosSigner

With your mnemonic and HD path ready, you can now configure and initialize the LedgerCosmosSigner:

```javascript
import { LedgerCosmosSigner } from '@chorus-one/signer-ledger-cosmos'

const signer = new LedgerCosmosSigner({
  accounts: [{ hdPath: 'your-hd-path' }],
  bechPrefix: 'cosmos'
})

await signer.init()
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
