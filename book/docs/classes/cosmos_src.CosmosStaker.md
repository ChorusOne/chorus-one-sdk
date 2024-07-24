This class provides the functionality to stake, unstake, redelegate, and withdraw rewards for Cosmos-based blockchains.

It also provides the ability to retrieve staking information and rewards for a delegator.

# Table of contents

## Constructors

- [constructor](cosmos_src.CosmosStaker.md#constructor)

## Methods

- [getAddressDerivationFn](cosmos_src.CosmosStaker.md#getaddressderivationfn)
- [init](cosmos_src.CosmosStaker.md#init)
- [buildStakeTx](cosmos_src.CosmosStaker.md#buildstaketx)
- [buildUnstakeTx](cosmos_src.CosmosStaker.md#buildunstaketx)
- [buildRedelegateTx](cosmos_src.CosmosStaker.md#buildredelegatetx)
- [buildWithdrawRewardsTx](cosmos_src.CosmosStaker.md#buildwithdrawrewardstx)
- [getStake](cosmos_src.CosmosStaker.md#getstake)
- [getRewards](cosmos_src.CosmosStaker.md#getrewards)
- [sign](cosmos_src.CosmosStaker.md#sign)
- [broadcast](cosmos_src.CosmosStaker.md#broadcast)
- [getTxStatus](cosmos_src.CosmosStaker.md#gettxstatus)

# Constructors

## constructor

• **new CosmosStaker**(`params`): [`CosmosStaker`](cosmos_src.CosmosStaker.md)

This creates a new CosmosStaker instance.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Initialization parameters |
| `params.rpcUrl` | `string` | RPC URL (e.g. https://celestia.chorus.one:443) Please note that `:port` is required |
| `params.lcdUrl` | `string` | LCD URL (e.g. https://celestia-lcd.chorus.one:443) Please note that `:port` is required |
| `params.bechPrefix` | `string` | Address prefix (e.g. celestia) |
| `params.denom` | `string` | Coin denom (e.g `utia`) |
| `params.denomMultiplier` | `string` | Multiplier to convert the base coin unit to its smallest subunit (e.g., `1000000` for 1 TIA = 1000000 utia) |
| `params.gas` | `number` | Default TX gas (e.g 200000) |
| `params.gasPrice` | `string` | Gas price (e.g "0.4") See: [Chain registry - Celestia](https://github.com/cosmos/chain-registry/blob/master/celestia/chain.json) |
| `params.fee?` | `string` | (Optional) Override with a fixed fee (e.g "5000" for "5000 uatom" or "0.005 ATOM") |
| `params.isEVM?` | `boolean` | (Optional) Use different address derivation logic for EVM compatible chains (e.g. evmos, zetachain) |

### Returns

[`CosmosStaker`](cosmos_src.CosmosStaker.md)

An instance of CosmosStaker.

# Methods

## getAddressDerivationFn

▸ **getAddressDerivationFn**(`params`): (`publicKey`: `Uint8Array`, `_derivationPath`: `string`) => `Promise`\<`string`[]\>

This **static** method is used to derive an address from a public key.

It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the address derivation |
| `params.bechPrefix` | `string` | Address prefix (e.g. celestia) |
| `params.isEVM?` | `boolean` | (Optional) Use different address derivation logic for EVM compatible chains (e.g. evmos, zetachain) |

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

Initializes the CosmosStaker instance and connects to the blockchain.

### Returns

`Promise`\<`void`\>

A promise which resolves once the CosmosStaker instance has been initialized.

___

## buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`\<\{ `tx`: `EncodeObject`  }\>

Builds a staking (delegation) transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | `string` | The delegator (wallet) address to stake from |
| `params.validatorAddress` | `string` | The validator address to stake to |
| `params.amount` | `string` | The amount to stake, specified in base units of the native token (e.g. `ATOM` for Cosmos or `TIA` for Celestia) |

### Returns

`Promise`\<\{ `tx`: `EncodeObject`  }\>

Returns a promise that resolves to a Cosmos staking transaction.

___

## buildUnstakeTx

▸ **buildUnstakeTx**(`params`): `Promise`\<\{ `tx`: `EncodeObject`  }\>

Builds an unstaking (undelegate) transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | `string` | The delegator (wallet) address that is unstaking |
| `params.validatorAddress` | `string` | The validator address to unstake from |
| `params.amount` | `string` | The amount to unstake, specified in base units of the native token (e.g. `ATOM` for Cosmos or `TIA` for Celestia) |

### Returns

`Promise`\<\{ `tx`: `EncodeObject`  }\>

Returns a promise that resolves to a Cosmos unstaking transaction.

___

## buildRedelegateTx

▸ **buildRedelegateTx**(`params`): `Promise`\<\{ `tx`: `EncodeObject`  }\>

Builds a redelegation transaction.
- This allows a wallet to redelegate staked assets to a different validator without unstaking.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | `string` | The delegator (wallet) address |
| `params.validatorSrcAddress` | `string` | The source validator address to redelegate from |
| `params.validatorDstAddress` | `string` | The destination validator address to redelgate to |
| `params.amount` | `string` | The amount to redelegate, specified in base units of the native token (e.g. `ATOM` for Cosmos or `TIA` for Celestia) |

### Returns

`Promise`\<\{ `tx`: `EncodeObject`  }\>

Returns a promise that resolves to a Cosmos redelegation transaction.

___

## buildWithdrawRewardsTx

▸ **buildWithdrawRewardsTx**(`params`): `Promise`\<\{ `tx`: `EncodeObject`  }\>

Builds a withdraw (claim) rewards transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | `string` | The delegator (wallet) address |
| `params.validatorAddress` | `string` | The validator address to withdraw (claim) rewards from |

### Returns

`Promise`\<\{ `tx`: `EncodeObject`  }\>

Returns a promise that resolves to a Cosmos withdraw (claim) rewards transaction.

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

## getRewards

▸ **getRewards**(`params`): `Promise`\<\{ `rewards`: `string`  }\>

Retrieves the rewards data for a specified delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.delegatorAddress` | `string` | The delegator (wallet) address |
| `params.validatorAddress?` | `string` | The validator address to gather rewards data from |
| `params.denom?` | `string` | (Optional) The rewards coin denominator (default is the network denom) |
| `params.denomMultiplier?` | `string` | (Optional) The rewards coin denom multiplier (default is the network denom multiplier) |

### Returns

`Promise`\<\{ `rewards`: `string`  }\>

Returns a promise that resolves to the rewards data for the specified delegator.

___

## sign

▸ **sign**(`params`): `Promise`\<\{ `signedTx`: `Uint8Array`  }\>

Signs a transaction using the provided signer.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the signing process |
| `params.signer` | `Signer` | Signer instance |
| `params.signerAddress` | `string` | The address of the signer |
| `params.tx` | `EncodeObject` | The transaction to sign |
| `params.memo?` | `string` | An optional memo to include with the transaction |

### Returns

`Promise`\<\{ `signedTx`: `Uint8Array`  }\>

A promise that resolves to an object containing the signed transaction.

___

## broadcast

▸ **broadcast**(`params`): `Promise`\<`DeliverTxResponse`\>

This method is used to broadcast a signed transaction to the Cosmos network.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the broadcast |
| `params.signedTx` | `Uint8Array` | The signed transaction to be broadcasted |

### Returns

`Promise`\<`DeliverTxResponse`\>

Returns a promise that resolves to the response of the transaction that was broadcast to the network.

___

## getTxStatus

▸ **getTxStatus**(`params`): `Promise`\<`CosmosTxStatus`\>

Retrieves the status of a transaction using the transaction hash.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the transaction status request |
| `params.txHash` | `string` | The transaction hash to query |

### Returns

`Promise`\<`CosmosTxStatus`\>

A promise that resolves to an object containing the transaction status.
