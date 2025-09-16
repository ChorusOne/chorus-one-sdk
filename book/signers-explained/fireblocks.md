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

## Ethereum Contract Call Signing

The `contractCall` method on `FireblocksSigner` enables secure Ethereum smart contract interactions via Fireblocks, supporting both native and pooled staking flows.

### How `contractCall` Works

`contractCall` submits your contract call as a Fireblocks transaction and manages the signing and execution process end-to-end:

```javascript
const result = await signer.contractCall({
  to: '0x...',                        // Contract address
  value: BigInt('32000000000000000000'), // Amount in wei
  data: '0x...',                      // Encoded contract call data
  gas: BigInt(21000),                 // Gas limit
  maxFeePerGas: BigInt(20000000000),  // EIP-1559 max fee per gas
  maxPriorityFeePerGas: BigInt(2000000000), // EIP-1559 priority fee
  gasPrice: BigInt(20000000000),      // Legacy gas price
  note: 'Ethereum validator deposit'   // Optional note
})
```

### Under the Hood

- **Creates Fireblocks Transaction**: Builds a transaction with `CONTRACT_CALL` operation, placing your contract call data in `extraParameters.contractCallData`.
- **Polls for Status**: Continuously checks Fireblocks for transaction completion or failure.
- **Returns Status**: Responds with:
  - `status`: 'success' or 'failure'
  - `receipt`: Full Fireblocks transaction details
  - `reason`: Error description if failed

### Error States

Possible failure statuses include:
- `BLOCKED`: Blocked by Fireblocks policy
- `FAILED`: Execution failed
- `CANCELLED`: Transaction cancelled
- `REJECTED`: Rejected by policy
- `TIMEOUT`: Transaction exceeded allowed time (configurable via `timeout` parameter)

## Further Reading

- [Fireblocks Documentation](https://developers.fireblocks.com/)
- [FireblocksSigner API Reference](../docs/classes/signer_fireblocks_src.FireblocksSigner.md)
