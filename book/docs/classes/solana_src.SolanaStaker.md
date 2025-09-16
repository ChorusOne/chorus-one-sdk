This class provides the functionality to stake, unstake, and withdraw for Solana blockchains.

It also provides the ability to retrieve staking information and rewards for an account.

# Table of contents

## Constructors

- [constructor](solana_src.SolanaStaker.md#constructor)

## Methods

- [getAddressDerivationFn](solana_src.SolanaStaker.md#getaddressderivationfn)
- [init](solana_src.SolanaStaker.md#init)
- [buildCreateStakeAccountTx](solana_src.SolanaStaker.md#buildcreatestakeaccounttx)
- [buildStakeTx](solana_src.SolanaStaker.md#buildstaketx)
- [buildUnstakeTx](solana_src.SolanaStaker.md#buildunstaketx)
- [buildPartialUnstakeTx](solana_src.SolanaStaker.md#buildpartialunstaketx)
- [buildWithdrawStakeTx](solana_src.SolanaStaker.md#buildwithdrawstaketx)
- [buildMergeStakesTx](solana_src.SolanaStaker.md#buildmergestakestx)
- [buildSplitStakeTx](solana_src.SolanaStaker.md#buildsplitstaketx)
- [getStake](solana_src.SolanaStaker.md#getstake)
- [sign](solana_src.SolanaStaker.md#sign)
- [broadcast](solana_src.SolanaStaker.md#broadcast)
- [getTxStatus](solana_src.SolanaStaker.md#gettxstatus)
- [getStakeAccounts](solana_src.SolanaStaker.md#getstakeaccounts)

# Constructors

## constructor

• **new SolanaStaker**(`params`): [`SolanaStaker`](solana_src.SolanaStaker.md)

Creates a SolanaStaker instance.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Initialization configuration |
| `params.rpcUrl` | `string` | The URL of the SOLANA network RPC endpoint |
| `params.commitment?` | `Commitment` | (Optional) The level of commitment desired when querying the blockchain. Default is 'confirmed'. |

### Returns

[`SolanaStaker`](solana_src.SolanaStaker.md)

An instance of SolanaStaker.

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

Initializes the SolanaStaker instance and connects to the blockchain.

### Returns

`Promise`\<`void`\>

A promise which resolves once the SolanaStaker instance has been initialized.

___

## buildCreateStakeAccountTx

▸ **buildCreateStakeAccountTx**(`params`): `Promise`\<\{ `tx`: `SolanaTransaction` ; `stakeAccountAddress`: `string`  }\>

Builds a new stake account transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.ownerAddress` | `string` | The stake account owner's address |
| `params.amount` | `string` | The amount to stake, specified in `SOL` |

### Returns

`Promise`\<\{ `tx`: `SolanaTransaction` ; `stakeAccountAddress`: `string`  }\>

Returns a promise that resolves to new stake account transaction.

___

## buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`\<\{ `tx`: `SolanaTransaction` ; `stakeAccountAddress`: `string`  }\>

Builds a staking transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.ownerAddress` | `string` | The stake account owner's address |
| `params.validatorAddress` | `string` | The validatiors vote account address to delegate the stake to |
| `params.stakeAccountAddress?` | `string` | The stake account address to delegate from. If not provided, a new stake account will be created. |
| `params.amount?` | `string` | The amount to stake, specified in `SOL`. If `stakeAccountAddress` is not provided, this parameter is required. |
| `params.referrer?` | `string` | (Optional) A custom tracking reference. If not provided, the default tracking reference will be used. |

### Returns

`Promise`\<\{ `tx`: `SolanaTransaction` ; `stakeAccountAddress`: `string`  }\>

Returns a promise that resolves to a SOLANA staking transaction.

___

## buildUnstakeTx

▸ **buildUnstakeTx**(`params`): `Promise`\<\{ `tx`: `SolanaTransaction`  }\>

Builds an unstaking transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.ownerAddress` | `string` | The stake account owner's address |
| `params.stakeAccountAddress` | `string` | The stake account address to deactivate |
| `params.referrer?` | `string` | (Optional) A custom tracking reference. If not provided, the default tracking reference will be used. |

### Returns

`Promise`\<\{ `tx`: `SolanaTransaction`  }\>

Returns a promise that resolves to a SOLANA unstaking transaction.

___

## buildPartialUnstakeTx

▸ **buildPartialUnstakeTx**(`params`): `Promise`\<\{ `transactions`: `SolanaTransaction`[] ; `accounts`: `StakeAccount`[]  }\>

Builds a partial unstake transaction.

This method allows for unstaking a specific amount from multiple stake accounts.
It will split the stake accounts if necessary to achieve the desired unstake amount.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.ownerAddress` | `string` | The stake account owner's address |
| `params.amount` | `string` | The amount to unstake, specified in `SOL` |
| `params.referrer?` | `string` | (Optional) A custom tracking reference. If not provided, the default tracking reference will be used. |

### Returns

`Promise`\<\{ `transactions`: `SolanaTransaction`[] ; `accounts`: `StakeAccount`[]  }\>

Returns a promise that resolves to an array of SOLANA transactions for partial unstaking and the affected stake accounts.

___

## buildWithdrawStakeTx

▸ **buildWithdrawStakeTx**(`params`): `Promise`\<\{ `tx`: `SolanaTransaction`  }\>

Builds a withdraw stake transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.ownerAddress` | `string` | The stake account owner's address |
| `params.stakeAccountAddress` | `string` | The stake account address to withdraw funds from |
| `params.amount?` | `string` | The amount to withdraw, specified in `SOL`. If not provided, the entire stake amount will be withdrawn. |

### Returns

`Promise`\<\{ `tx`: `SolanaTransaction`  }\>

Returns a promise that resolves to a SOLANA withdraw stake transaction.

___

## buildMergeStakesTx

▸ **buildMergeStakesTx**(`params`): `Promise`\<\{ `tx`: `SolanaTransaction`  }\>

Builds a merge stake transaction.

Please note there are conditions for merging stake accounts:
https://docs.solana.com/staking/stake-accounts#merging-stake-accounts

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.ownerAddress` | `string` | The stake account owner's address |
| `params.sourceAddress` | `string` | The stake account address to merge funds from |
| `params.destinationAddress` | `string` | The stake account address to merge funds to |

### Returns

`Promise`\<\{ `tx`: `SolanaTransaction`  }\>

Returns a promise that resolves to a SOLANA merge stake transaction.

___

## buildSplitStakeTx

▸ **buildSplitStakeTx**(`params`): `Promise`\<\{ `tx`: `SolanaTransaction` ; `stakeAccountAddress`: `string`  }\>

Builds a split stake transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.ownerAddress` | `string` | The stake account owner's address |
| `params.stakeAccountAddress` | `string` | The stake account address to split funds from |
| `params.amount` | `string` | The amount to transfer from stakeAccountAddress to new staking account, specified in `SOL` |

### Returns

`Promise`\<\{ `tx`: `SolanaTransaction` ; `stakeAccountAddress`: `string`  }\>

Returns a promise that resolves to a SOLANA split stake transaction.

___

## getStake

▸ **getStake**(`params`): `Promise`\<\{ `balance`: `string`  }\>

Retrieves the staking information for a specified delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.ownerAddress` | `string` | The stake account owner's address |
| `params.validatorAddress?` | `string` | (Optional) The validator address to gather staking information from |
| `params.state?` | ``"delegated"`` \| ``"undelegated"`` \| ``"deactivating"`` \| ``"all"`` | (Optional) The stake account state to filter by (default: 'delegated') |

### Returns

`Promise`\<\{ `balance`: `string`  }\>

Returns a promise that resolves to the staking information for the specified delegator.

___

## sign

▸ **sign**(`params`): `Promise`\<\{ `signedTx`: `VersionedTransaction`  }\>

Signs a transaction using the provided signer.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the signing process |
| `params.signer` | `Signer` | A signer instance. |
| `params.signerAddress` | `string` | The address of the signer |
| `params.tx` | `SolanaTransaction` | The transaction to sign |

### Returns

`Promise`\<\{ `signedTx`: `VersionedTransaction`  }\>

A promise that resolves to an object containing the signed transaction.

___

## broadcast

▸ **broadcast**(`params`): `Promise`\<\{ `txHash`: `string` ; `slot`: `number` ; `error`: `any`  }\>

Broadcasts a signed transaction to the network.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the broadcast process |
| `params.signedTx` | `VersionedTransaction` | The signed transaction to broadcast |

### Returns

`Promise`\<\{ `txHash`: `string` ; `slot`: `number` ; `error`: `any`  }\>

A promise that resolves to the final execution outcome of the broadcast transaction.

___

## getTxStatus

▸ **getTxStatus**(`params`): `Promise`\<`SolanaTxStatus`\>

Retrieves the status of a transaction using the transaction hash.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the transaction status request |
| `params.txHash` | `string` | The transaction hash to query |

### Returns

`Promise`\<`SolanaTxStatus`\>

A promise that resolves to an object containing the transaction status.

___

## getStakeAccounts

▸ **getStakeAccounts**(`params`): `Promise`\<\{ `accounts`: `StakeAccount`[]  }\>

Retrieves the stake accounts associated with an owner address.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the broadcast process |
| `params.ownerAddress` | `string` | The stake account owner's address |
| `params.validatorAddress?` | `string` | (Optional) The validator address to filter the stake accounts by |
| `params.withStates?` | `boolean` | (Optional) If true, the state of the stake account will be included in the response |
| `params.withMacroDenom?` | `boolean` | (Optional) If true, the stake account balance will be returned in `SOL` denomination |

### Returns

`Promise`\<\{ `accounts`: `StakeAccount`[]  }\>

A promise that resolves to stake account list.
