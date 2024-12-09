# Signer

Defines the interface for a signer that can sign data, retrieve its public key.

### Table of contents

#### Properties

* [init](signer_src.Signer.md#init)
* [sign](signer_src.Signer.md#sign)
* [getPublicKey](signer_src.Signer.md#getpublickey)

### Properties

#### init

• **init**: () => `Promise`<`void`>

Initializes the signer, performing any necessary setup or configuration.

**Type declaration**

▸ (): `Promise`<`void`>

**Returns**

`Promise`<`void`>

***

#### sign

• **sign**: (`signerAddress`: `string`, `signerData`: [`SignerData`](signer_src.SignerData.md), `options`: { `note?`: `string` }) => `Promise`<{ `sig`: [`Signature`](signer_src.Signature.md) ; `pk`: `Uint8Array` }>

Signs the provided data using the private key associated with the signer's address.

**Type declaration**

▸ (`signerAddress`, `signerData`, `options`): `Promise`<{ `sig`: [`Signature`](signer_src.Signature.md) ; `pk`: `Uint8Array` }>

**Parameters**

| Name            | Type                                     | Description                                                      |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| `signerAddress` | `string`                                 | The address of the signer                                        |
| `signerData`    | [`SignerData`](signer_src.SignerData.md) | The data to be signed, which can be a raw message or custom data |
| `options`       | `Object`                                 | Additional options                                               |
| `options.note?` | `string`                                 | An optional note to include with the transaction                 |

**Returns**

`Promise`<{ `sig`: [`Signature`](signer_src.Signature.md) ; `pk`: `Uint8Array` }>

***

#### getPublicKey

• **getPublicKey**: (`address`: `string`) => `Promise`<`Uint8Array`>

Retrieves the public key associated with the signer's address.

**Type declaration**

▸ (`address`): `Promise`<`Uint8Array`>

**Parameters**

| Name      | Type     | Description               |
| --------- | -------- | ------------------------- |
| `address` | `string` | The address of the signer |

**Returns**

`Promise`<`Uint8Array`>
