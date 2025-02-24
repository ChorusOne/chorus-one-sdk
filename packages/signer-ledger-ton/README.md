# Chorus One SDK: Ledger TON Signer

Ledger signer for the Chorus One SDK, used for signing TON transactions

## Installation

In the project’s root directory, run the following command:

```bash
npm install @chorus-one/signer-ledger-ton --save
```

## Setting Up the LedgerTonSigner

With your mnemonic and HD path ready, you can now configure and initialize the LedgerTonSigner:

```javascript
import { LedgerTonSigner } from '@chorus-one/signer-ledger-ton'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'

const signer = new LedgerTonSigner({
  transport: await TransportNodeHid.create(),
  accounts: [{ hdPath: 'your-hd-path' }],
  bounceable: true
})

await signer.init()
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
