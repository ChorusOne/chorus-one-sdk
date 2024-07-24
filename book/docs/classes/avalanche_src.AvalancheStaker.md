This class provides the functionality to stake, import, and export assets on the Avalanche network.

It also provides the ability to retrieve staking information and rewards for a delegator.

# Table of contents

## Constructors

- [constructor](avalanche_src.AvalancheStaker.md#constructor)

## Methods

- [getAddressDerivationFn](avalanche_src.AvalancheStaker.md#getaddressderivationfn)
- [init](avalanche_src.AvalancheStaker.md#init)
- [buildStakeTx](avalanche_src.AvalancheStaker.md#buildstaketx)
- [buildExportTx](avalanche_src.AvalancheStaker.md#buildexporttx)
- [buildImportTx](avalanche_src.AvalancheStaker.md#buildimporttx)
- [getStake](avalanche_src.AvalancheStaker.md#getstake)
- [sign](avalanche_src.AvalancheStaker.md#sign)
- [broadcast](avalanche_src.AvalancheStaker.md#broadcast)
- [getTxStatus](avalanche_src.AvalancheStaker.md#gettxstatus)

# Constructors

## constructor

• **new AvalancheStaker**(`params`): [`AvalancheStaker`](avalanche_src.AvalancheStaker.md)

This creates a new AvalancheStaker instance.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Initialization parameters |
| `params.rpcUrl` | `string` | RPC URL (e.g. https://api.avax.network) |
| `params.hrp?` | `string` | (Optional) Address prefix (e.g. avax) |
| `params.asset?` | `AvalancheAsset` | (Optional) Asset ID used for transactions (e.g. staking) |
| `params.fee?` | `AvalancheFee` | (Optional) The fee used to pay for the transaction processing |
| `params.denomMultiplier?` | `string` | (Optional) Multiplier to convert the base coin unit to its smallest subunit (e.g., `1000000000` for 1 AVAX = 1000000 nAVAX) |

### Returns

[`AvalancheStaker`](avalanche_src.AvalancheStaker.md)

An instance of AvalancheStaker.

# Methods

## getAddressDerivationFn

▸ **getAddressDerivationFn**(`params`): (`publicKey`: `Uint8Array`, `_derivationPath`: `string`) => `Promise`\<`string`[]\>

This **static** method is used to derive an address from a public key.

It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the address derivation |
| `params.hrp?` | `string` | Address prefix (e.g. avax) |

### Returns

`fn`

Returns an array containing the derived C, P, X and Ethereum addresses.

▸ (`publicKey`, `_derivationPath`): `Promise`\<`string`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `Uint8Array` |
| `_derivationPath` | `string` |

#### Returns

`Promise`\<`string`[]\>

___

## init

▸ **init**(): `Promise`\<`void`\>

Initializes the AvalancheStaker instance and connects to the blockchain.

### Returns

`Promise`\<`void`\>

A promise which resolves once the AvalancheStaker instance has been initialized.

___

## buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds a staking (delegation) transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | `string` | The delegator (wallet) address to stake from |
| `params.validatorAddress` | `string` | The validator address to stake to |
| `params.amount` | `string` | The amount to stake, specified in `AVAX` |
| `params.daysCount` | `number` | The number of days to stake for |

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a Avalanche staking transaction.

___

## buildExportTx

▸ **buildExportTx**(`params`): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds a transaction to export assets to another chain.

This is the first step of the transferring tokens from one chain to another.
After the export transaction is issued on the source chain, call `buildImportTx` to finalize the transfer.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.address` | `AvalancheAddressSet` | The source address to export from and the destination address to export to |
| `params.srcChain` | `string` | The source chain to export from e.g. 'C', 'P' |
| `params.dstChain` | `string` | The destination chain to export to e.g. 'C', 'P' |
| `params.amount` | `string` | The amount to export, specified in `AVAX` |

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a Avalanche export transaction.

___

## buildImportTx

▸ **buildImportTx**(`params`): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds a transaction to import assets from another chain.

This is the last step of the transferring tokens from one chain to another.

Call `buildExportTx` on the source chain first, then call this method to finalize the transfer.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.address` | `AvalancheAddressSet` | The source address to import from and the destination address to import to |
| `params.srcChain` | `string` | The source chain to import from e.g. 'C', 'P' |
| `params.dstChain` | `string` | The destination chain to import to e.g. 'C', 'P' |

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a Avalanche import transaction.

___

## getStake

▸ **getStake**(`params`): `Promise`\<\{ `balance`: `string`  }\>

Retrieves the staking information for a specified delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.delegatorAddress` | `string` | The delegator (wallet) address |

### Returns

`Promise`\<\{ `balance`: `string`  }\>

Returns a promise that resolves to the staking information for the specified delegator.

___

## sign

▸ **sign**(`params`): `Promise`\<\{ `signedTx`: `SignedTx`  }\>

Signs a transaction using the provided signer.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the signing process |
| `params.signer` | `Signer` | Signer instance |
| `params.signerAddress` | `string` | The address of the signer |
| `params.tx` | `UnsignedTx` | The transaction to sign |

### Returns

`Promise`\<\{ `signedTx`: `SignedTx`  }\>

A promise that resolves to an object containing the signed transaction.

___

## broadcast

▸ **broadcast**(`params`): `Promise`\<`IssueTxResponse`\>

This method is used to broadcast a signed transaction to the Avalanche network.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the broadcast |
| `params.signedTx` | `SignedTx` | The signed transaction to be broadcasted |
| `params.dstChain` | `string` | The destination chain for the transaction - 'C', 'P', or 'X' |

### Returns

`Promise`\<`IssueTxResponse`\>

Returns a promise that resolves to the response of the transaction that was broadcast to the network.

___

## getTxStatus

▸ **getTxStatus**(`params`): `Promise`\<`AvalancheTxStatus`\>

Retrieves the status of a transaction using the transaction hash.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the transaction status request |
| `params.txId` | `string` | The transaction hash to query |
| `params.chain` | `string` | The chain to query the transaction status from - 'C', 'P', or 'X' |

### Returns

`Promise`\<`AvalancheTxStatus`\>

A promise that resolves to an object containing the transaction status.
