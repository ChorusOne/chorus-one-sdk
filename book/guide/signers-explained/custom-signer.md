# Implementing a Custom Signer

The **Chorus One SDK** provides flexibility for developers to implement custom signers tailored to their specific requirements.

A custom signer can be integrated by conforming to the `Signer` interface, which ensures compatibility with the SDK's transaction management processes.

It utilizes raw signing with the Elliptic Curve Digital Signature Algorithm (ECDSA).

### Signer Interface

To create a custom signer, you will first need to implement the `Signer` interface, provided by `@chorus-one/signer` ([📦 npm package](https://www.npmjs.com/package/@chorus-one/signer))

* This interface defines three essential methods: `sign`, `getPublicKey`, and `init`.

Here is the interface definition for a signer in TypeScript:

```typescript
interface Signer {
  sign: (signerAddress: string, signerData: SignerData, options: { note?: string }) => Promise<{ sig: Signature, pk: Uint8Array }>
  getPublicKey: (address: string) => Promise<Uint8Array>
  init: () => Promise<void>
}
```

***

### Method Descriptions

1. **sign**(`signerAddress`: `string`, `signerData`: `SignerData`, `options?`: `{ note?: string }`): `Promise`<{ `sig`: `Signature`, `pk`: `Uint8Array` }>

A `Signer` represents a single private key, multiple (BIP-44) addresses signer. The `signerAddress` defines the private key used to sign `SigningData` that comes in two flavors:

1. `message` - `sha256` serialized transaction data. Use this for raw `secp256k1` signing
2. `data` - flexible network specific data passed from `Staker`. Use this with web wallets (e.g Keplr Wallet) that don't expose raw signing, but instead require blockchain specific objects, such as `SignDoc` for Cosmos networks

Optional `note` can be used by underlying signer for troubleshooting purposes.

It returns a Promise that resolves to an object containing:

* `sig`: The signature, adhering to the `Signature` interface.
* `pk`: The public key as a `Uint8Array`.

2. **getPublicKey**(`address`: `string`): `Promise`<`Uint8Array`>\`

This retrieves the public key associated with the signer address.

It returns a Promise that resolves to a `Uint8Array` representing the public key.

3. **init**(): `Promise`<`void`>

This initializes the signer, performing any necessary setup or configuration.

It returns a Promise that resolves once the initialization is complete.

***

### Signature Interface

The `Signature` interface defines the structure of the signature object returned by the `sign` method:

```typescript
interface Signature {
  fullSig: string
  r?: string
  s?: string
  v?: number
}
```

#### Properties:

* **fullSig**: A string representing the complete signature, often a concatenation of the `r` and `s` values.
* **r**: (Optional) A hexadecimal string representing the first part of the ECDSA signature.
* **s**: (Optional) A hexadecimal string representing the second part of the ECDSA signature.
* **v**: (Optional) An integer representing the recovery id, which is used in some blockchains to recover the public key from the signature. **This value can be either 0 or 1.**

{% hint style="info" %}
#### Raw Signing

Raw signing is the process of generating a cryptographic signature directly from the transaction data, without any additional formatting.

In the context of ECDSA, the signature consists of two components: ( r ) and ( s ).

* The recovery id ( v ) is used to recover the public key from the signature.

The ECDSA algorithm is widely used in various security protocols and standards due to its strong security properties and efficiency.

It relies on the mathematics of elliptic curves, which provide a high level of security with relatively small key sizes compared to other cryptographic algorithms.

* You can find more information about ECDSA at [RFC 6979](https://tools.ietf.org/html/rfc6979).
{% endhint %}

***

### Example: Custom Signer Implementation

Below is an example of a custom signer implementation using a simple signing mechanism:

```typescript
import { Signer, Signature, SignerData } from '@chorus-one/signer';

class CustomSigner implements Signer {
  private privateKey: Uint8Array;
  private publicKey: Uint8Array;

  constructor(privateKey: Uint8Array) {
    this.privateKey = privateKey;
    this.publicKey = this.computePublicKey(privateKey);
  }

  async init(): Promise<void> {
    // Perform any necessary initialization here
    return Promise.resolve();
  }

  async sign(signerAddress: string, signerData: SignerData, options?: { note?: string }): Promise<{ sig: Signature, pk: Uint8Array }> {
    const { r, s, v, fullSig } = this.createSignature(signerData.message);
    return Promise.resolve({
      sig: { fullSig, r, s, v },
      pk: this.publicKey
    });
  }

  async getPublicKey(): Promise<Uint8Array> {
    return Promise.resolve(this.publicKey);
  }

  private computePublicKey(privateKey: Uint8Array): Uint8Array {
    // Implement the logic to compute the public key from the private key
    return new Uint8Array(); // Placeholder
  }

  private createSignature(content: string): Signature {
    // Implement the logic to create an ECDSA signature from the content
    const r = 'r_value'; // Placeholder
    const s = 's_value'; // Placeholder
    const v = 1; // Placeholder
    const fullSig = r + s; // Placeholder
    return { r, s, v, fullSig };
  }
}
```

***

### Integrating the Custom Signer

Once you have implemented the custom signer, you can then integrate it with the Chorus One SDK just like any other signer:

```javascript
const signer = new CustomSigner(yourPrivateKey);

await signer.init();

const staker = new CosmosStaker({
  signer: signer,
  ...
});
```

***

### Further Reading

* [Elliptic Curve Digital Signature Algorithm (ECDSA)](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)
* [RFC 6979: Deterministic Usage of DSA and ECDSA](https://tools.ietf.org/html/rfc6979)
