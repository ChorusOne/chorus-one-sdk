The `LocalSigner` in the **Chorus One SDK** is a specialized implementation of the `Signer` interface that utilizes a BIP39 mnemonic for signing operations.

This signer is ideal for local environments where you need a straightforward and secure method to generate and manage cryptographic keys from mnemonic phrases.

## Obtaining the Mnemonic and HD Path

Before initializing the `LocalSigner` you will need to prepare a BIP39 mnemonic and define the hierarchical deterministic (HD) path for key derivation.

Let's look at what these two key concepts are below:

- **mnemonic**: A string containing your BIP39 mnemonic phrase. This should be stored securely and kept private as it controls access to all addresses derived from it.
- **hdPath**: The BIP39 address derivation path, which is used to derive the specific key pair needed for signing. Commonly, this path follows the format `m/44'/60'/0'/0/0` for Ethereum-compatible addresses.
- **addressDerivationFn**: A function that derives the address from the public key, implementing the `AddressDerivationFn` type and provided by Staker classes as static methods, e.g. `SolanaStaker.getAddressDerivationFn`, `NearStaker.getAddressDerivationFn`, etc.

```typescript
type AddressDerivationFn = (publicKey: Uint8Array, hdPath: string) => Array<string>
```

{% hint style="info" %}

Address derivation processes across different blockchains typically involve a combination of elliptic curve cryptography (like `secp256k1` used in Ethereum, Cosmos, and Avalanche’s C-Chain, and `ed25519` used in NEAR) and specific cryptographic transformations such as hashing (Keccak-256 for Ethereum, SHA-256 for Cosmos, and various for Avalanche depending on the chain), truncating, and encoding (Bech32 for Cosmos and Avalanche, Base58 for NEAR).

{% endhint %}

## Setting Up the LocalSigner

With your mnemonic and HD path ready, you can now configure and initialize the LocalSigner:

```javascript
import { SolanaStaker } from '@chorus-one/solana'
import { LocalSigner } from '@chorus-one/signer-local'

const signer = new LocalSigner({
  mnemonic: 'your-mnemonic-phrase',
  accounts: [{ hdPath: 'your-hd-path' }],
  addressDerivationFn: SolanaStaker.getAddressDerivationFn()
})

await signer.init()
```

## Further Reading

- [BIP39 Mnemonic Code](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP32 HD Wallets](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [LocalSigner API Reference](../../docs/classes/signer_local_src.LocalSigner.md)
