# Hierarchy

- `TonBaseStaker`

  ↳ **`TonSingleNominatorPoolStaker`**

# Table of contents

## Constructors

- [constructor](ton_src.TonSingleNominatorPoolStaker.md#constructor)

## Methods

- [getAddressDerivationFn](ton_src.TonSingleNominatorPoolStaker.md#getaddressderivationfn)
- [getMnemonicToSeedFn](ton_src.TonSingleNominatorPoolStaker.md#getmnemonictoseedfn)
- [getSeedToKeypairFn](ton_src.TonSingleNominatorPoolStaker.md#getseedtokeypairfn)
- [buildStakeTx](ton_src.TonSingleNominatorPoolStaker.md#buildstaketx)
- [buildUnstakeTx](ton_src.TonSingleNominatorPoolStaker.md#buildunstaketx)
- [getStake](ton_src.TonSingleNominatorPoolStaker.md#getstake)
- [getPoolContractNominators](ton_src.TonSingleNominatorPoolStaker.md#getpoolcontractnominators)
- [init](ton_src.TonSingleNominatorPoolStaker.md#init)
- [buildDeployWalletTx](ton_src.TonSingleNominatorPoolStaker.md#builddeploywallettx)
- [sign](ton_src.TonSingleNominatorPoolStaker.md#sign)
- [broadcast](ton_src.TonSingleNominatorPoolStaker.md#broadcast)
- [getTxStatus](ton_src.TonSingleNominatorPoolStaker.md#gettxstatus)

# Constructors

## constructor

• **new TonSingleNominatorPoolStaker**(`params`): [`TonSingleNominatorPoolStaker`](ton_src.TonSingleNominatorPoolStaker.md)

This creates a new TonStaker instance.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Initialization parameters |
| `params.rpcUrl` | `string` | RPC URL (e.g. https://toncenter.com/api/v2/jsonRPC) |
| `params.allowSeamlessWalletDeployment?` | `boolean` | (Optional) If enabled, the wallet contract is deployed automatically when needed |
| `params.allowTransferToInactiveAccount?` | `boolean` | (Optional) Allow token transfers to inactive accounts |
| `params.minimumExistentialBalance?` | `string` | (Optional) The amount of TON to keep in the wallet |
| `params.addressDerivationConfig?` | [`AddressDerivationConfig`](../interfaces/ton_src.AddressDerivationConfig.md) | (Optional) TON address derivation configuration |

### Returns

[`TonSingleNominatorPoolStaker`](ton_src.TonSingleNominatorPoolStaker.md)

An instance of TonStaker.

### Inherited from

TonBaseStaker.constructor

# Methods

## getAddressDerivationFn

▸ **getAddressDerivationFn**(`params?`): (`publicKey`: `Uint8Array`, `_derivationPath`: `string`) => `Promise`\<`string`[]\>

This **static** method is used to derive an address from a public key.

It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params?` | `Object` | Parameters for the address derivation |
| `params.addressDerivationConfig` | [`AddressDerivationConfig`](../interfaces/ton_src.AddressDerivationConfig.md) | TON address derivation configuration |

### Returns

`fn`

Returns a single address derived from the public key

▸ (`publicKey`, `_derivationPath`): `Promise`\<`string`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `Uint8Array` |
| `_derivationPath` | `string` |

#### Returns

`Promise`\<`string`[]\>

### Inherited from

TonBaseStaker.getAddressDerivationFn

___

## getMnemonicToSeedFn

▸ **getMnemonicToSeedFn**(`params?`): (`mnemonic`: `string`, `password?`: `string`) => `Promise`\<`Uint8Array`\>

This **static** method is used to convert BIP39 mnemonic to seed. In TON
network the seed is used as a private key.

It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params?` | `Object` | - |
| `params.addressDerivationConfig` | [`AddressDerivationConfig`](../interfaces/ton_src.AddressDerivationConfig.md) | TON address derivation configuration |

### Returns

`fn`

Returns a seed derived from the mnemonic

▸ (`mnemonic`, `password?`): `Promise`\<`Uint8Array`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `mnemonic` | `string` |
| `password?` | `string` |

#### Returns

`Promise`\<`Uint8Array`\>

### Inherited from

TonBaseStaker.getMnemonicToSeedFn

___

## getSeedToKeypairFn

▸ **getSeedToKeypairFn**(`params?`): (`seed`: `Uint8Array`, `hdPath?`: `string`) => `Promise`\<\{ `publicKey`: `Uint8Array` ; `privateKey`: `Uint8Array`  }\>

This **static** method is used to convert a seed to a keypair. Note that
TON network doesn't use BIP44 HD Path for address derivation.

It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params?` | `Object` | - |
| `params.addressDerivationConfig` | [`AddressDerivationConfig`](../interfaces/ton_src.AddressDerivationConfig.md) | TON address derivation configuration |

### Returns

`fn`

Returns a public and private keypair derived from the seed

▸ (`seed`, `hdPath?`): `Promise`\<\{ `publicKey`: `Uint8Array` ; `privateKey`: `Uint8Array`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `seed` | `Uint8Array` |
| `hdPath?` | `string` |

#### Returns

`Promise`\<\{ `publicKey`: `Uint8Array` ; `privateKey`: `Uint8Array`  }\>

### Inherited from

TonBaseStaker.getSeedToKeypairFn

___

## buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`\<\{ `tx`: [`UnsignedTx`](../interfaces/ton_src.UnsignedTx.md)  }\>

Builds a staking (delegation) transaction for Single Nominator Pool contract.
For more information see: https://github.com/orbs-network/single-nominator/tree/main

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | `string` | The delegator address to stake from |
| `params.validatorAddress` | `string` | The validator address to stake to |
| `params.amount` | `string` | The amount to stake, specified in `TON` |
| `params.validUntil?` | `number` | (Optional) The Unix timestamp when the transaction expires |

### Returns

`Promise`\<\{ `tx`: [`UnsignedTx`](../interfaces/ton_src.UnsignedTx.md)  }\>

Returns a promise that resolves to a TON nominator pool staking transaction.

___

## buildUnstakeTx

▸ **buildUnstakeTx**(`params`): `Promise`\<\{ `tx`: [`UnsignedTx`](../interfaces/ton_src.UnsignedTx.md)  }\>

Builds a unstaking (withdraw nominator) transaction for Single Nominator Pool contract.
For more information see: https://github.com/orbs-network/single-nominator/tree/main

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | `string` | The delegator address |
| `params.validatorAddress` | `string` | The validator address to unstake from |
| `params.amount` | `string` | The amount to unstake, specified in `TON` |
| `params.validUntil?` | `number` | (Optional) The Unix timestamp when the transaction expires |

### Returns

`Promise`\<\{ `tx`: [`UnsignedTx`](../interfaces/ton_src.UnsignedTx.md)  }\>

Returns a promise that resolves to a TON nominator pool unstaking transaction.

___

## getStake

▸ **getStake**(`params`): `Promise`\<\{ `balance`: `string`  }\>

Retrieves the staking information for a specified delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.delegatorAddress` | `string` | The delegator (wallet) address |
| `params.validatorAddress` | `string` | The validator address to gather rewards data from |

### Returns

`Promise`\<\{ `balance`: `string`  }\>

Returns a promise that resolves to the staking information for the specified delegator.

___

## getPoolContractNominators

▸ **getPoolContractNominators**(`params`): `Promise`\<\{ `nominators`: [`NominatorInfo`](../interfaces/ton_src.NominatorInfo.md)[]  }\>

Retrieves the active nominators for a Nominator Pool contract.
For more information see: https://github.com/ton-blockchain/nominator-pool

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.validatorAddress` | `string` | The validator address to gather rewards data from |

### Returns

`Promise`\<\{ `nominators`: [`NominatorInfo`](../interfaces/ton_src.NominatorInfo.md)[]  }\>

Returns a promise that resolves to the nominator data for the validator address.

___

## init

▸ **init**(): `Promise`\<`void`\>

Initializes the TonStaker instance and connects to the blockchain.

### Returns

`Promise`\<`void`\>

A promise which resolves once the TonStaker instance has been initialized.

### Inherited from

TonBaseStaker.init

___

## buildDeployWalletTx

▸ **buildDeployWalletTx**(`params`): `Promise`\<\{ `tx`: [`UnsignedTx`](../interfaces/ton_src.UnsignedTx.md)  }\>

Builds a wallet deployment transaction

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.address` | `string` | The address to deploy the wallet contract to |
| `params.validUntil?` | `number` | (Optional) The Unix timestamp when the transaction expires |

### Returns

`Promise`\<\{ `tx`: [`UnsignedTx`](../interfaces/ton_src.UnsignedTx.md)  }\>

Returns a promise that resolves to a TON wallet deployment transaction.

### Inherited from

TonBaseStaker.buildDeployWalletTx

___

## sign

▸ **sign**(`params`): `Promise`\<[`SignedTx`](../interfaces/ton_src.SignedTx.md)\>

Signs a transaction using the provided signer.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the signing process |
| `params.signer` | `Signer` | Signer instance |
| `params.signerAddress` | `string` | The address of the signer |
| `params.tx` | [`UnsignedTx`](../interfaces/ton_src.UnsignedTx.md) | The transaction to sign |

### Returns

`Promise`\<[`SignedTx`](../interfaces/ton_src.SignedTx.md)\>

A promise that resolves to an object containing the signed transaction.

### Inherited from

TonBaseStaker.sign

___

## broadcast

▸ **broadcast**(`params`): `Promise`\<`string`\>

This method is used to broadcast a signed transaction to the TON network.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the broadcast |
| `params.signedTx` | [`SignedTx`](../interfaces/ton_src.SignedTx.md) | The signed transaction to be broadcasted |

### Returns

`Promise`\<`string`\>

Returns a promise that resolves to the response of the transaction that was broadcast to the network.

### Inherited from

TonBaseStaker.broadcast

___

## getTxStatus

▸ **getTxStatus**(`params`): `Promise`\<`TonTxStatus`\>

Retrieves the status of a transaction using the transaction hash.

This method is intended to check for transactions made recently (within limit) and not for historical transactions.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the transaction status request |
| `params.address` | `string` | The account address to query |
| `params.txHash` | `string` | The transaction hash to query |
| `params.limit?` | `number` | (Optional) The maximum number of transactions to fetch |

### Returns

`Promise`\<`TonTxStatus`\>

A promise that resolves to an object containing the transaction status.

### Inherited from

TonBaseStaker.getTxStatus
