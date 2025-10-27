HyperliquidStaker - TypeScript SDK for Hyperliquid staking operations

This class provides the functionality to stake, delegate, and manage staking on Hyperliquid.
It uses the Hyperliquid REST API for both read and write operations, with EIP-712 signing for transactions.

# Table of contents

## Constructors

- [constructor](hyperliquid_src.HyperliquidStaker.md#constructor)

## Methods

- [getAddressDerivationFn](hyperliquid_src.HyperliquidStaker.md#getaddressderivationfn)
- [getStakingSummary](hyperliquid_src.HyperliquidStaker.md#getstakingsummary)
- [getDelegations](hyperliquid_src.HyperliquidStaker.md#getdelegations)
- [getDelegatorRewards](hyperliquid_src.HyperliquidStaker.md#getdelegatorrewards)
- [getDelegatorHistory](hyperliquid_src.HyperliquidStaker.md#getdelegatorhistory)
- [getSpotBalances](hyperliquid_src.HyperliquidStaker.md#getspotbalances)
- [buildSpotToStakingTx](hyperliquid_src.HyperliquidStaker.md#buildspottostakingtx)
- [buildWithdrawFromStakingTx](hyperliquid_src.HyperliquidStaker.md#buildwithdrawfromstakingtx)
- [buildStakeTx](hyperliquid_src.HyperliquidStaker.md#buildstaketx)
- [buildUnstakeTx](hyperliquid_src.HyperliquidStaker.md#buildunstaketx)
- [sign](hyperliquid_src.HyperliquidStaker.md#sign)
- [broadcast](hyperliquid_src.HyperliquidStaker.md#broadcast)

# Constructors

## constructor

• **new HyperliquidStaker**(`«destructured»`): [`HyperliquidStaker`](hyperliquid_src.HyperliquidStaker.md)

Creates a HyperliquidStaker instance.

chain - The Hyperliquid chain to use ('Mainnet' or 'Testnet')

### Parameters

| Name | Type |
| :------ | :------ |
| `«destructured»` | `Object` |
| › `chain` | `HyperliquidChain` |

### Returns

[`HyperliquidStaker`](hyperliquid_src.HyperliquidStaker.md)

An instance of HyperliquidStaker.

# Methods

## getAddressDerivationFn

▸ **getAddressDerivationFn**(): (`publicKey`: `Uint8Array`) => `Promise`\<`string`[]\>

This **static** method is used to derive an address from a public key.

It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.

### Returns

`fn`

Returns an array containing the derived address with '0x' prefix.

▸ (`publicKey`): `Promise`\<`string`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `Uint8Array` |

#### Returns

`Promise`\<`string`[]\>

___

## getStakingSummary

▸ **getStakingSummary**(`params`): `Promise`\<`DelegatorSummary`\>

Gets the staking summary for a delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Query parameters |
| `params.delegatorAddress` | `string` | The delegator's address |

### Returns

`Promise`\<`DelegatorSummary`\>

A promise that resolves to the delegator's staking summary,
including delegated and undelegated amounts

___

## getDelegations

▸ **getDelegations**(`params`): `Promise`\<`Delegation`[]\>

Gets all active delegations for a delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Query parameters |
| `params.delegatorAddress` | `string` | The delegator's address |

### Returns

`Promise`\<`Delegation`[]\>

A promise that resolves to an array of active delegations

___

## getDelegatorRewards

▸ **getDelegatorRewards**(`params`): `Promise`\<`StakingReward`[]\>

Gets the staking rewards history for a delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Query parameters |
| `params.delegatorAddress` | `string` | The delegator's address |

### Returns

`Promise`\<`StakingReward`[]\>

A promise that resolves to an array of staking rewards

___

## getDelegatorHistory

▸ **getDelegatorHistory**(`params`): `Promise`\<`DelegationHistoryEvent`[]\>

Gets the delegation history for a delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Query parameters |
| `params.delegatorAddress` | `string` | The delegator's address |

### Returns

`Promise`\<`DelegationHistoryEvent`[]\>

A promise that resolves to an array of delegation history events

___

## getSpotBalances

▸ **getSpotBalances**(`params`): `Promise`\<\{ `balances`: `SpotBalance`[]  }\>

Gets the spot account balances for a user.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Query parameters |
| `params.delegatorAddress` | `string` | The user's address |

### Returns

`Promise`\<\{ `balances`: `SpotBalance`[]  }\>

A promise that resolves to an array of spot balances for different assets(e.g. HYPE, USDC)

___

## buildSpotToStakingTx

▸ **buildSpotToStakingTx**(`params`): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds a transaction to move tokens from spot account to staking balance.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Transaction parameters |
| `params.amount` | `string` | Amount to deposit in HYPE (e.g., "1.5") |
| `params.nonce?` | `number` | Optional nonce for the transaction |

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a DepositToStakingAction

___

## buildWithdrawFromStakingTx

▸ **buildWithdrawFromStakingTx**(`params`): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds a transaction to withdraw tokens from staking balance to spot account.
Note: Withdrawals go through a 7-day unstaking queue.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Transaction parameters |
| `params.amount` | `string` | Amount to withdraw in tokens (e.g., "1.5") |
| `params.nonce?` | `number` | Optional nonce for the transaction |

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a WithdrawFromStakingAction

___

## buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds a transaction to delegate tokens to a validator.
Note: Delegations have a 1-day lockup period per validator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Transaction parameters |
| `params.validatorAddress` | `string` | The validator's address |
| `params.amount` | `string` | Amount to delegate in HYPE (e.g., "1.5") |
| `params.nonce?` | `number` | Optional nonce for the transaction |

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a DelegateAction

___

## buildUnstakeTx

▸ **buildUnstakeTx**(`params`): `Promise`\<\{ `tx`: `UnsignedTx`  }\>

Builds a transaction to undelegate tokens from a validator.
Note: Undelegations have a 1-day lockup period.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Transaction parameters |
| `params.validatorAddress` | `string` | The validator's address |
| `params.amount` | `string` | Amount to undelegate in HYPE (e.g., "1.5") |
| `params.nonce?` | `number` | Optional nonce for the transaction |

### Returns

`Promise`\<\{ `tx`: `UnsignedTx`  }\>

Returns a promise that resolves to a DelegateAction

___

## sign

▸ **sign**(`params`): `Promise`\<\{ `signedTx`: `string`  }\>

Signs a transaction using EIP-712 structured data signing.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Signing parameters |
| `params.signer` | `Signer` | The signer instance |
| `params.signerAddress` | `string` | The address of the signer |
| `params.tx` | `UnsignedTx` | The unsigned transaction |

### Returns

`Promise`\<\{ `signedTx`: `string`  }\>

A promise that resolves to the signed transaction

___

## broadcast

▸ **broadcast**(`params`): `Promise`\<\{ `txHash`: `string`  }\>

Broadcasts a signed transaction to the Hyperliquid network.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Broadcasting parameters |
| `params.signedTx` | `string` | The signed transaction (JSON string) |
| `params.delegatorAddress` | \`0x$\{string}\` | - |

### Returns

`Promise`\<\{ `txHash`: `string`  }\>

A promise that resolves to the transaction hash
