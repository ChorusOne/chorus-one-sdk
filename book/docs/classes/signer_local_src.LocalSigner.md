The LocalSigner in the Chorus One SDK is a specialized implementation of the Signer interface that utilizes a `BIP39`
mnemonic for signing operations.

This signer is ideal for local environments where you need a straightforward and
secure method to generate and manage cryptographic keys from mnemonic phrases.

# Table of contents

## Constructors

- [constructor](signer_local_src.LocalSigner.md#constructor)

## Methods

- [init](signer_local_src.LocalSigner.md#init)
- [sign](signer_local_src.LocalSigner.md#sign)
- [getPublicKey](signer_local_src.LocalSigner.md#getpublickey)

# Constructors

## constructor

• **new LocalSigner**(`params`): [`LocalSigner`](signer_local_src.LocalSigner.md)

Constructs a new LocalSigner.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | The parameters required to initialize the LocalSigner |
| `params.mnemonic` | `string` | A string containing your `BIP39` mnemonic phrase |
| `params.accounts` | [\{ `hdPath`: `string`  }] | An array of account objects, each containing an HD path |
| `params.keyType` | `KeyType` | An enum specifying the signing key type (e.g. SECP256K1, ED25519) |
| `params.addressDerivationFn` | `AddressDerivationFn` | A function that derives the address from the public key |
| `params.mnemonicToSeedFn?` | `MnemonicToSeedFn` | - |
| `params.seedToKeypairFn?` | `SeedToKeypairFn` | - |
| `params.logger?` | `Logger` | (Optional) A logger to use for logging messages, i.e `console` |

### Returns

[`LocalSigner`](signer_local_src.LocalSigner.md)

A new instance of LocalSigner.

# Methods

## init

▸ **init**(): `Promise`\<`void`\>

Initializes the signer, performing any necessary setup or configuration.

### Returns

`Promise`\<`void`\>

A promise that resolves once the initialization is complete.

___

## sign

▸ **sign**(`signerAddress`, `signerData`): `Promise`\<\{ `sig`: `Signature` ; `pk`: `Uint8Array`  }\>

Signs the provided data using the private key associated with the signer's address.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signerAddress` | `string` | The address of the signer |
| `signerData` | `SignerData` | The data to be signed, which can be a raw message or custom data |

### Returns

`Promise`\<\{ `sig`: `Signature` ; `pk`: `Uint8Array`  }\>

A promise that resolves to an object containing the signature and public key.

___

## getPublicKey

▸ **getPublicKey**(`address`): `Promise`\<`Uint8Array`\>

Retrieves the public key associated with the signer's address.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | The address of the signer |

### Returns

`Promise`\<`Uint8Array`\>

A promise that resolves to a Uint8Array representing the public key.
