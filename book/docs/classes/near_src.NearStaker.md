This class provides the functionality to stake, unstake, and withdraw for NEAR-based blockchains.

It also provides the ability to retrieve staking information for an account.

# Table of contents

## Constructors

- [constructor](near_src.NearStaker.md#constructor)

## Methods

- [getAddressDerivationFn](near_src.NearStaker.md#getaddressderivationfn)
- [init](near_src.NearStaker.md#init)
- [buildStakeTx](near_src.NearStaker.md#buildstaketx)
- [buildUnstakeTx](near_src.NearStaker.md#buildunstaketx)
- [buildWithdrawTx](near_src.NearStaker.md#buildwithdrawtx)
- [getStake](near_src.NearStaker.md#getstake)
- [sign](near_src.NearStaker.md#sign)
- [broadcast](near_src.NearStaker.md#broadcast)
- [getTxStatus](near_src.NearStaker.md#gettxstatus)

# Constructors

## constructor

• **new NearStaker**(`params`): [`NearStaker`](near_src.NearStaker.md)

Creates a NearStaker instance.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Initialization configuration |
| `params.networkId` | `string` | The network ID of the NEAR network (e.g., `mainnet`, `testnet`) |
| `params.rpcUrl` | `string` | The URL of the NEAR network RPC endpoint |
| `params.denomMultiplier?` | `string` | Multiplier to convert the base coin unit to its smallest subunit (e.g., `10^24` for 1 NEAR = 1000000000000000000000000 yoctoNear) |
| `params.resolveAddress?` | `boolean` | Converts human-readable NEAR account ID (e.g. `alice.near`) to public key. Enable this option if signer requires the public key but you only expect names from NEAR registry |
| `params.gas?` | `string` | Amount of gas to be sent with the function calls (e.g "30000000000000" yoctoNear) |

### Returns

[`NearStaker`](near_src.NearStaker.md)

An instance of NearStaker.

# Methods

## getAddressDerivationFn

▸ **getAddressDerivationFn**(): (`publicKey`: `Uint8Array`, `_derivationPath`: `string`) => `Promise`\<`string`[]\>

This **static** method is used to derive an address from a public key.

It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.

### Returns

`fn`

Returns an array containing the derived address.

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

Initializes the NearStaker instance and connects to the Near network.

### Returns

`Promise`\<`void`\>

A promise which resolves once the NearStaker instance has been initialized.

___

## buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`\<\{ `tx`: `Transaction`  }\>

Builds a staking transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | `string` | The delegator (wallet) address to stake from |
| `params.validatorAddress` | `string` | The validator address to stake with |
| `params.amount` | `string` | The amount to stake, specified in `NEAR` |

### Returns

`Promise`\<\{ `tx`: `Transaction`  }\>

Returns a promise that resolves to a NEAR staking transaction.

___

## buildUnstakeTx

▸ **buildUnstakeTx**(`params`): `Promise`\<\{ `tx`: `Transaction`  }\>

Builds an unstaking transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | `string` | The delegator (wallet) address that is unstaking |
| `params.validatorAddress` | `string` | The validator address to unstake from |
| `params.amount` | `string` | The amount to unstake, specified in `NEAR` |

### Returns

`Promise`\<\{ `tx`: `Transaction`  }\>

Returns a promise that resolves to a NEAR unstaking transaction.

___

## buildWithdrawTx

▸ **buildWithdrawTx**(`params`): `Promise`\<\{ `tx`: `Transaction`  }\>

Builds a withdrawal transaction.

**The amount to be withdrawn must be previously unstaked.**
- If the amount is not specified, all the available unstaked amount will be withdrawn.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | `string` | The delegator (wallet) address |
| `params.validatorAddress` | `string` | The validator address to withdraw from |
| `params.amount` | `string` | The amount to withdraw, specified in `NEAR` |

### Returns

`Promise`\<\{ `tx`: `Transaction`  }\>

Returns a promise that resolves to a NEAR withdrawal transaction.

___

## getStake

▸ **getStake**(`params`): `Promise`\<\{ `balance`: `string`  }\>

Retrieves the staking information for a specified delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.delegatorAddress` | `string` | The delegator (wallet) address |
| `params.validatorAddress?` | `string` | (Optional) The validator address to gather staking information from |

### Returns

`Promise`\<\{ `balance`: `string`  }\>

Returns a promise that resolves to the staking information for the specified delegator.

___

## sign

▸ **sign**(`params`): `Promise`\<\{ `signedTx`: `SignedTransaction`  }\>

Signs a transaction using the provided signer.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the signing process |
| `params.signer` | `Signer` | A signer instance. |
| `params.signerAddress` | `string` | The address of the signer |
| `params.tx` | `Transaction` | The transaction to sign |

### Returns

`Promise`\<\{ `signedTx`: `SignedTransaction`  }\>

A promise that resolves to an object containing the signed transaction.

___

## broadcast

▸ **broadcast**(`params`): `Promise`\<`FinalExecutionOutcome`\>

Broadcasts a signed transaction to the network.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the broadcast process |
| `params.signedTx` | `SignedTransaction` | The signed transaction to broadcast |

### Returns

`Promise`\<`FinalExecutionOutcome`\>

A promise that resolves to the final execution outcome of the broadcast transaction.

___

## getTxStatus

▸ **getTxStatus**(`params`): `Promise`\<`NearTxStatus`\>

Retrieves the status of a transaction using the transaction hash.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the transaction status request |
| `params.txHash` | `string` | The transaction hash to query |
| `params.address` | `string` | The NEAR account that signed the transaction |

### Returns

`Promise`\<`NearTxStatus`\>

A promise that resolves to an object containing the transaction status.
