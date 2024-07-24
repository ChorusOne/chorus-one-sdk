The `FireblocksSigner` in the **Chorus One SDK** is a specialized implementation of the `Signer` interface that integrates with the Fireblocks platform.

Fireblocks is known for its advanced security features, including multi-party computation (MPC) and secure wallet infrastructure, making it an ideal choice for enterprises requiring robust security and compliance.

## Obtaining Fireblocks Credentials

Before initializing the `FireblocksSigner`, you will need to acquire the necessary credentials from Fireblocks.

- This includes the `apiSecretKey`, `apiKey`, `vaultName`, and `assetId`.

Let's explain a bit more about what those are below:

- **apiSecretKey**: Fireblocks API Secret key. Generate this by creating an RSA key file as described in the [Fireblocks Quickstart Guide](https://developers.fireblocks.com/docs/quickstart#step-1-generate-a-csr-file).
- **apiKey**: Fireblocks API Key. Obtain this from the Fireblocks platform as detailed in the [Fireblocks Quickstart Guide](https://developers.fireblocks.com/docs/quickstart#step-2-create-an-api-key).
- **vaultName**: The name of the Fireblocks vault where the assets are stored.
- **assetId**: The identifier for the asset you intend to manage. You can get this from the Fireblocks platform.
- **addressDerivationFn**: A function that derives the address from the public key, implementing the `AddressDerivationFn` type and provided by Staker classes as static methods, e.g. `SolanaStaker.getAddressDerivationFn`, `NearStaker.getAddressDerivationFn`, etc.

```typescript
type AddressDerivationFn = (publicKey: Uint8Array, hdPath: string) => Array<string>
```

{% hint style="info" %}

Address derivation processes across different blockchains typically involve a combination of elliptic curve cryptography (like `secp256k1` used in Ethereum, Cosmos, and Avalanche’s C-Chain, and `ed25519` used in NEAR) and specific cryptographic transformations such as hashing (Keccak-256 for Ethereum, SHA-256 for Cosmos, and various for Avalanche depending on the chain), truncating, and encoding (Bech32 for Cosmos and Avalanche, Base58 for NEAR).

{% endhint %}

## Setting Up the FireblocksSigner

With your credentials ready, you can now configure and initialize the FireblocksSigner:

```javascript
import { SolanaStaker } from '@chorus-one/solana'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'SOL',
  addressDerivationFn: SolanaStaker.getAddressDerivationFn()
})

await signer.init()
```

## Further Reading

- [Fireblocks Documentation](https://developers.fireblocks.com/)
- [FireblocksSigner API Reference](../docs/classes/signer_fireblocks_src.FireblocksSigner.md)
