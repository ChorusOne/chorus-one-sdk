# Table of contents

## Constructors

- [constructor](signer_fireblocks_src.FireblocksSigner.md#constructor)

## Methods

- [init](signer_fireblocks_src.FireblocksSigner.md#init)
- [sign](signer_fireblocks_src.FireblocksSigner.md#sign)
- [contractCall](signer_fireblocks_src.FireblocksSigner.md#contractcall)
- [getPublicKey](signer_fireblocks_src.FireblocksSigner.md#getpublickey)

# Constructors

## constructor

• **new FireblocksSigner**(`params`): [`FireblocksSigner`](signer_fireblocks_src.FireblocksSigner.md)

Constructs a new FireblocksSigner.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | The parameters required to initialize the FireblocksSigner |
| `params.apiSecretKey` | `string` | Fireblocks API Secret key |
| `params.apiKey` | `string` | Fireblocks API Key |
| `params.vaultName` | `string` | The name of the Fireblocks vault where the assets are stored |
| `params.assetId` | `string` | The identifier for the asset you intend to manage |
| `params.addressDerivationFn` | `AddressDerivationFn` | A function that derives the address from the public key |
| `params.timeout?` | `number` | (Optional) The maximum time (in ms) to wait for the Fireblocks API sign request to complete |
| `params.pollInterval?` | `number` | (Optional) The interval (in ms) at which the signer polls the Fireblocks API to check if the sign request has completed |
| `params.apiUrl?` | `string` | (Optional) The URL of the Fireblocks API, defaults to `https://api.fireblocks.io` |
| `params.logger?` | `Logger` | (Optional) A logger to use for logging messages, i.e `console` |

### Returns

[`FireblocksSigner`](signer_fireblocks_src.FireblocksSigner.md)

A new instance of FireblocksSigner.

# Methods

## init

▸ **init**(): `Promise`\<`void`\>

Initializes the signer, performing any necessary setup or configuration.

### Returns

`Promise`\<`void`\>

A promise that resolves once the initialization is complete.

___

## sign

▸ **sign**(`signerAddress`, `signerData`, `options?`): `Promise`\<\{ `sig`: `Signature` ; `pk`: `Uint8Array`  }\>

Signs the provided data using the private key associated with the signer's address.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signerAddress` | `string` | The address of the signer |
| `signerData` | `SignerData` | The data to be signed, which can be a raw message or custom data |
| `options?` | `Object` | Additional options |
| `options.note?` | `string` | An optional note to include with the transaction |

### Returns

`Promise`\<\{ `sig`: `Signature` ; `pk`: `Uint8Array`  }\>

A promise that resolves to an object containing the signature and public key.

___

## contractCall

▸ **contractCall**(`params`): `Promise`\<`FireblocksTxStatus`\>

Signs an Ethereum contract call transaction using Fireblocks.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the contract call |
| `params.to` | \`0x$\{string}\` | The destination contract address |
| `params.value?` | `bigint` | The amount to send in wei (optional) |
| `params.data` | \`0x$\{string}\` | The contract call data |
| `params.gas` | `bigint` | - |
| `params.maxFeePerGas` | `bigint` | Maximum fee per gas in wei (optional) |
| `params.maxPriorityFeePerGas` | `bigint` | Maximum priority fee per gas in wei (optional) |
| `params.gasPrice` | `bigint` | - |
| `params.note?` | `string` | Optional note for the transaction |

### Returns

`Promise`\<`FireblocksTxStatus`\>

A promise that resolves to the transaction response from Fireblocks.

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
