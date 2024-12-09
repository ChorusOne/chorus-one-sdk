# FireblocksSigner

The FireblocksSigner in the Chorus One SDK is a specialized implementation of the Signer interface that integrates with the Fireblocks platform.

Fireblocks is known for its advanced security features, including multi-party computation (MPC) and secure wallet infrastructure, making it an ideal choice for enterprises requiring robust security and compliance.

## Table of contents

### Constructors

* [constructor](signer_fireblocks_src.FireblocksSigner.md#constructor)

### Methods

* [init](signer_fireblocks_src.FireblocksSigner.md#init)
* [sign](signer_fireblocks_src.FireblocksSigner.md#sign)
* [getPublicKey](signer_fireblocks_src.FireblocksSigner.md#getpublickey)

## Constructors

### constructor

• **new FireblocksSigner**(`params`): [`FireblocksSigner`](signer_fireblocks_src.FireblocksSigner.md)

Constructs a new FireblocksSigner.

#### Parameters

| Name                         | Type                  | Description                                                    |
| ---------------------------- | --------------------- | -------------------------------------------------------------- |
| `params`                     | `Object`              | The parameters required to initialize the FireblocksSigner     |
| `params.apiSecretKey`        | `string`              | Fireblocks API Secret key                                      |
| `params.apiKey`              | `string`              | Fireblocks API Key                                             |
| `params.vaultName`           | `string`              | The name of the Fireblocks vault where the assets are stored   |
| `params.assetId`             | `string`              | The identifier for the asset you intend to manage              |
| `params.addressDerivationFn` | `AddressDerivationFn` | A function that derives the address from the public key        |
| `params.logger?`             | `Logger`              | (Optional) A logger to use for logging messages, i.e `console` |

#### Returns

[`FireblocksSigner`](signer_fireblocks_src.FireblocksSigner.md)

A new instance of FireblocksSigner.

## Methods

### init

▸ **init**(): `Promise`<`void`>

Initializes the signer, performing any necessary setup or configuration.

#### Returns

`Promise`<`void`>

A promise that resolves once the initialization is complete.

***

### sign

▸ **sign**(`signerAddress`, `signerData`, `options?`): `Promise`<{ `sig`: [`Signature`](../interfaces/signer_src.Signature.md) ; `pk`: `Uint8Array` }>

Signs the provided data using the private key associated with the signer's address.

#### Parameters

| Name            | Type                                                   | Description                                                      |
| --------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| `signerAddress` | `string`                                               | The address of the signer                                        |
| `signerData`    | [`SignerData`](../interfaces/signer_src.SignerData.md) | The data to be signed, which can be a raw message or custom data |
| `options?`      | `Object`                                               | Additional options                                               |
| `options.note?` | `string`                                               | An optional note to include with the transaction                 |

#### Returns

`Promise`<{ `sig`: [`Signature`](../interfaces/signer_src.Signature.md) ; `pk`: `Uint8Array` }>

A promise that resolves to an object containing the signature and public key.

***

### getPublicKey

▸ **getPublicKey**(`address`): `Promise`<`Uint8Array`>

Retrieves the public key associated with the signer's address.

#### Parameters

| Name      | Type     | Description               |
| --------- | -------- | ------------------------- |
| `address` | `string` | The address of the signer |

#### Returns

`Promise`<`Uint8Array`>

A promise that resolves to a Uint8Array representing the public key.
