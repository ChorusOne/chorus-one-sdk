A signer in the context of the **Chorus One SDK** is an essential component responsible for managing cryptographic signing operations.

It handles the creation of digital signatures that verify the authenticity and integrity of transactions or messages, utilizing raw signing with the Elliptic Curve Digital Signature Algorithm (ECDSA).

## Supported Signers

The Chorus One SDK provides built-in support for two primary types of signers:

1. **Fireblocks Signer**

   - Integrates with the Fireblocks platform, leveraging secure multi-party computation (MPC) for signing operations.
   - This is ideal for enterprise use cases where enhanced security and compliance are paramount.

2. **Local Signer**

   - Uses a provided private key to sign transactions locally.
   - Suitable for individual developers or smaller projects where simplicity and direct control are prioritized.

3. **Ledger Cosmos Signer**

   - Utilizes a Ledger device to sign transactions for Cosmos SDK-based networks.
   - Ideal for users who prefer hardware wallets for enhanced security.

4. **Keplr Signer**

   - Integrates with the Keplr wallet extension to sign transactions for Cosmos SDK-based networks.
   - Suitable for web-based wallet interfaces.

## Custom Signers

The flexible design of the Chorus One SDK allows developers to implement their own custom signers.

By conforming to the `Signer` interface, you can integrate various signing mechanisms, whether they involve hardware wallets, custom cryptographic algorithms, or third-party services.

## Example Usage

Below is an example of how a signer is used in conjunction with the Cosmos blockchain within the Chorus One SDK:

```javascript
import { SolanaStaker } from '@chorus-one/solana'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'ATOM',
  addressDerivationFn: SolanaStaker.getAddressDerivationFn()
})

await signer.init()

// Use staker to sign a transaction
const { signedTx } = await staker.sign({
  signer
  ...
})
```

By abstracting the signing logic the Chorus One SDK ensures that staking operations remain secure and developer-friendly, regardless of the underlying blockchain or signing method.

This modular and flexible approach allows seamless integration and customization, enabling developers to select or create the most suitable signer for their specific use case.

## Next Steps

We learned about the role of signers in blockchain transactions and how the Chorus One SDK uses raw signing with ECDSA.

We also explored the built-in support for Fireblocks and Local signers and the flexibility to implement custom signers.

To continue, explore the following guides below:

<table data-view="cards">
  <thead>
    <tr>
      <th></th>
      <th data-hidden data-card-cover data-type="files"></th>
      <th data-hidden data-card-target data-type="content-ref"></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Signing with Fireblocks</strong></td>
      <td></td>
      <td><a href="fireblocks.md">..</a></td>
    </tr>
    <tr>
      <td><strong>Signing with a Mnemonic</strong></td>
      <td></td>
      <td><a href="local.md">..</a></td>
    </tr>
    <tr>
      <td><strong>Implementing a Custom Signer</strong></td>
      <td></td>
      <td><a href="custom-signer.md">..</a></td>
    </tr>
    <tr>
      <td><strong>Signing with a Browser Extension Wallet</strong></td>
      <td></td>
      <td><a href="signing-with-a-browser-extension-wallet.md">..</a></td>
    </tr>
    <tr>
      <td><strong>Signing with a Ledger Device</strong></td>
      <td></td>
      <td><a href="signing-with-a-ledger-device.md">..</a></td>
    </tr>
  </tbody>
</table>

## Further Reading

- [Elliptic Curve Digital Signature Algorithm (ECDSA)](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)
- [RFC 6979: Deterministic Usage of DSA and ECDSA](https://tools.ietf.org/html/rfc6979)
