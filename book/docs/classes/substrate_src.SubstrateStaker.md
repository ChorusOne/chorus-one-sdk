This class provides the functionality to stake, nominate, unbond, and withdraw funds for a Substrate-based blockchains.

It also provides the ability to retrieve staking information and rewards for a delegator.

# Table of contents

## Constructors

- [constructor](substrate_src.SubstrateStaker.md#constructor)

## Methods

- [getAddressDerivationFn](substrate_src.SubstrateStaker.md#getaddressderivationfn)
- [init](substrate_src.SubstrateStaker.md#init)
- [close](substrate_src.SubstrateStaker.md#close)
- [buildStakeTx](substrate_src.SubstrateStaker.md#buildstaketx)
- [buildNominateTx](substrate_src.SubstrateStaker.md#buildnominatetx)
- [buildUnstakeTx](substrate_src.SubstrateStaker.md#buildunstaketx)
- [buildWithdrawTx](substrate_src.SubstrateStaker.md#buildwithdrawtx)
- [buildBondExtraTx](substrate_src.SubstrateStaker.md#buildbondextratx)
- [getStake](substrate_src.SubstrateStaker.md#getstake)
- [sign](substrate_src.SubstrateStaker.md#sign)
- [broadcast](substrate_src.SubstrateStaker.md#broadcast)
- [getTxStatus](substrate_src.SubstrateStaker.md#gettxstatus)

# Constructors

## constructor

• **new SubstrateStaker**(`params`): [`SubstrateStaker`](substrate_src.SubstrateStaker.md)

This creates a new SubstrateStaker instance.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Initialization parameters |
| `params.rpcUrl` | `string` | RPC URL (e.g. wss://rpc.polkadot.io) |
| `params.rewardDestination` | [`RewardDestination`](../enums/substrate_src.RewardDestination.md) | Reward destination (e.g., RewardDestination.STASH or RewardDestination.CONTROLLER) |
| `params.denomMultiplier?` | `string` | (Optional) Multiplier to convert the base coin unit to its smallest subunit (e.g., `1000000000000` for 1 DOT = 1000000000000 Planck) |
| `params.fee?` | `SubstrateFee` | (Optional) Transaction fee (e.g. '0.001' for 0.001 DOT) |
| `params.indexer?` | [`Indexer`](../interfaces/substrate_src.Indexer.md) | (Optional) Indexer instance to supplement missing node RPC features |

### Returns

[`SubstrateStaker`](substrate_src.SubstrateStaker.md)

An instance of SusbstrateStaker.

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

Initializes the SubstrateStaker instance and connects to the blockchain.

### Returns

`Promise`\<`void`\>

A promise which resolves once the Staker instance has been initialized.

___

## close

▸ **close**(): `Promise`\<`void`\>

Closes the SubstrateStaker instance and disconnects from the blockchain.

### Returns

`Promise`\<`void`\>

A promise which resolves once the Staker instance has been closed.

___

## buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds a staking (delegation) transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.amount` | `string` | The amount to stake, specified in base units of the native token (e.g. `DOT` for Polkadot) |

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a Polkadot staking transaction.

___

## buildNominateTx

▸ **buildNominateTx**(`params`): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds a nomination transaction - allows the user to pick trusted validators to delegate to.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.validatorAddresses` | `string`[] | The list of validator addresses to nominate to |

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a Substrate nomination transaction.

___

## buildUnstakeTx

▸ **buildUnstakeTx**(`params`): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds an unstaking (undelegation) transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.amount` | `string` | The amount to unstake, specified in base units of the native token (e.g. `DOT` for Polkadot) |

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a Substrate unstaking transaction.

___

## buildWithdrawTx

▸ **buildWithdrawTx**(): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds a transaction to withdraw all unstaked funds from the validator contract.

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a Substrate withdraw transaction.

___

## buildBondExtraTx

▸ **buildBondExtraTx**(`params`): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds a transaction to delegate more tokens to a validator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.amount` | `string` | The amount to stake, specified in base units of the native token (e.g. `DOT` for Polkadot) |

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a Substrate bond extra transaction.

___

## getStake

▸ **getStake**(`params`): `Promise`\<\{ `balance`: `string`  }\>

Retrieves the staking information for a specified delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.delegatorAddress` | `string` | The delegator (wallet) address |
| `params.validatorAddress?` | `string` | (Optional) The validator address to assert the delegator is staking with |
| `params.status?` | ``"active"`` \| ``"total"`` | (Optional) The status of nomination (default: 'active') |

### Returns

`Promise`\<\{ `balance`: `string`  }\>

Returns a promise that resolves to the staking information for the specified delegator.

___

## sign

▸ **sign**(`params`): `Promise`\<\{ `signedTx`: `GenericExtrinsic`\<`AnyTuple`\>  }\>

Signs a transaction using the provided signer.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the signing process |
| `params.signer` | `Signer` | Signer instance |
| `params.signerAddress` | `string` | The address of the signer |
| `params.tx` | `UnsignedTx` | The transaction to sign |
| `params.blocks?` | `number` | (Optional) The number of blocks until the transaction expires |

### Returns

`Promise`\<\{ `signedTx`: `GenericExtrinsic`\<`AnyTuple`\>  }\>

A promise that resolves to an object containing the signed transaction.

___

## broadcast

▸ **broadcast**(`params`): `Promise`\<\{ `txHash`: `string` ; `status`: `ExtrinsicStatus`  }\>

This method is used to broadcast a signed transaction to the Substrate network.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the broadcast |
| `params.signedTx` | `GenericExtrinsic`\<`AnyTuple`\> | The signed transaction to be broadcasted |

### Returns

`Promise`\<\{ `txHash`: `string` ; `status`: `ExtrinsicStatus`  }\>

Returns a promise that resolves to the response of the transaction that was broadcast to the network.

___

## getTxStatus

▸ **getTxStatus**(`params`): `Promise`\<`SubstrateTxStatus`\>

Retrieves the status of a transaction using the transaction hash.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the transaction status request |
| `params.txHash` | `string` | The transaction hash to query |

### Returns

`Promise`\<`SubstrateTxStatus`\>

A promise that resolves to an object containing the transaction status.
