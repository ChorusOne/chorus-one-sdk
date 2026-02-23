# Table of contents

## Constructors

- [constructor](polygon_src.PolygonStaker.md#constructor)

## Methods

- [getAddressDerivationFn](polygon_src.PolygonStaker.md#getaddressderivationfn)
- [init](polygon_src.PolygonStaker.md#init)
- [buildApproveTx](polygon_src.PolygonStaker.md#buildapprovetx)
- [buildStakeTx](polygon_src.PolygonStaker.md#buildstaketx)
- [buildUnstakeTx](polygon_src.PolygonStaker.md#buildunstaketx)
- [buildWithdrawTx](polygon_src.PolygonStaker.md#buildwithdrawtx)
- [buildClaimRewardsTx](polygon_src.PolygonStaker.md#buildclaimrewardstx)
- [buildCompoundTx](polygon_src.PolygonStaker.md#buildcompoundtx)
- [getStake](polygon_src.PolygonStaker.md#getstake)
- [getUnbondNonce](polygon_src.PolygonStaker.md#getunbondnonce)
- [getUnbond](polygon_src.PolygonStaker.md#getunbond)
- [getUnbonds](polygon_src.PolygonStaker.md#getunbonds)
- [getLiquidRewards](polygon_src.PolygonStaker.md#getliquidrewards)
- [getAllowance](polygon_src.PolygonStaker.md#getallowance)
- [getEpoch](polygon_src.PolygonStaker.md#getepoch)
- [getWithdrawalDelay](polygon_src.PolygonStaker.md#getwithdrawaldelay)
- [getExchangeRatePrecision](polygon_src.PolygonStaker.md#getexchangerateprecision)
- [sign](polygon_src.PolygonStaker.md#sign)
- [broadcast](polygon_src.PolygonStaker.md#broadcast)
- [getTxStatus](polygon_src.PolygonStaker.md#gettxstatus)

# Constructors

## constructor

• **new PolygonStaker**(`params`): [`PolygonStaker`](polygon_src.PolygonStaker.md)

Creates a PolygonStaker instance

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | [`PolygonNetworkConfig`](../interfaces/polygon_src.PolygonNetworkConfig.md) | Initialization configuration |

### Returns

[`PolygonStaker`](polygon_src.PolygonStaker.md)

An instance of PolygonStaker

# Methods

## getAddressDerivationFn

▸ **getAddressDerivationFn**(): (`publicKey`: `Uint8Array`) => `Promise`\<`string`[]\>

This **static** method is used to derive an address from a public key.

It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.

### Returns

`fn`

Returns an array containing the derived address.

▸ (`publicKey`): `Promise`\<`string`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `Uint8Array` |

#### Returns

`Promise`\<`string`[]\>

___

## init

▸ **init**(): `Promise`\<`void`\>

### Returns

`Promise`\<`void`\>

**`Deprecated`**

No longer required. Kept for backward compatibility.

___

## buildApproveTx

▸ **buildApproveTx**(`params`): `Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Builds a token approval transaction

Approves the StakeManager contract to spend POL tokens on behalf of the delegator.
This must be called before staking if the current allowance is insufficient.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.amount` | `string` | The amount to approve in POL (will be converted to wei internally). Pass "max" for unlimited approval. |

### Returns

`Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Returns a promise that resolves to an approval transaction

___

## buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Builds a staking (delegation) transaction

Delegates POL tokens to a validator via their ValidatorShare contract.
Requires prior token approval to the StakeManager contract.

**Slippage requirement:** Exactly one of `slippageBps` or `minSharesToMint` must be provided.
There is no default value. Providing neither or both will throw an error.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator's Ethereum address |
| `params.validatorShareAddress` | \`0x$\{string}\` | The validator's ValidatorShare contract address |
| `params.amount` | `string` | The amount to stake in POL |
| `params.slippageBps?` | `number` | Slippage tolerance in basis points (e.g., 50 = 0.5%). Used to calculate minSharesToMint. Exactly one of `slippageBps` or `minSharesToMint` must be provided (not both, no default). |
| `params.minSharesToMint?` | `bigint` | Minimum validator shares to receive. Exactly one of `slippageBps` or `minSharesToMint` must be provided (not both, no default). |
| `params.referrer?` | `string` | (Optional) Custom referrer string for tracking. If not provided, uses 'sdk-chorusone-staking'. |

### Returns

`Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Returns a promise that resolves to a Polygon staking transaction

___

## buildUnstakeTx

▸ **buildUnstakeTx**(`params`): `Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Builds an unstaking transaction

Creates an unbond request to unstake POL tokens from a validator.
After the unbonding period (~80 checkpoints, approximately 3-4 days), call buildWithdrawTx() to claim funds.

**Slippage requirement:** Exactly one of `slippageBps` or `maximumSharesToBurn` must be provided.
There is no default value. Providing neither or both will throw an error.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator's address |
| `params.validatorShareAddress` | \`0x$\{string}\` | The validator's ValidatorShare contract address |
| `params.amount` | `string` | The amount to unstake in POL (will be converted to wei internally) |
| `params.slippageBps?` | `number` | Slippage tolerance in basis points (e.g., 50 = 0.5%). Used to calculate maximumSharesToBurn. Exactly one of `slippageBps` or `maximumSharesToBurn` must be provided (not both, no default). |
| `params.maximumSharesToBurn?` | `bigint` | Maximum validator shares willing to burn. Exactly one of `slippageBps` or `maximumSharesToBurn` must be provided (not both, no default). |
| `params.referrer?` | `string` | (Optional) Custom referrer string for tracking. If not provided, uses 'sdk-chorusone-staking'. |

### Returns

`Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Returns a promise that resolves to a Polygon unstaking transaction

___

## buildWithdrawTx

▸ **buildWithdrawTx**(`params`): `Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Builds a withdraw transaction

Claims unstaked POL tokens after the unbonding period has elapsed.
Use getUnbond() to check if the unbonding period is complete.

Note: Each unstake creates a separate unbond with its own nonce (1, 2, 3, etc.).
Withdrawals must be done per-nonce. To withdraw all pending unbonds, iterate
through nonces from 1 to getUnbondNonce() and withdraw each eligible one.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator's address that will receive the funds |
| `params.validatorShareAddress` | \`0x$\{string}\` | The validator's ValidatorShare contract address |
| `params.unbondNonce` | `bigint` | The specific unbond nonce to withdraw |

### Returns

`Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Returns a promise that resolves to a Polygon withdrawal transaction

___

## buildClaimRewardsTx

▸ **buildClaimRewardsTx**(`params`): `Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Builds a claim rewards transaction

Claims accumulated delegation rewards and sends them to the delegator's wallet.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator's address that will receive the rewards |
| `params.validatorShareAddress` | \`0x$\{string}\` | The validator's ValidatorShare contract address |
| `params.referrer?` | `string` | (Optional) Custom referrer string for tracking. If not provided, uses 'sdk-chorusone-staking'. |

### Returns

`Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Returns a promise that resolves to a Polygon claim rewards transaction

___

## buildCompoundTx

▸ **buildCompoundTx**(`params`): `Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Builds a compound (restake) rewards transaction

Restakes accumulated rewards back into the validator, increasing delegation without new tokens.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator's address |
| `params.validatorShareAddress` | \`0x$\{string}\` | The validator's ValidatorShare contract address |
| `params.referrer?` | `string` | (Optional) Custom referrer string for tracking. If not provided, uses 'sdk-chorusone-staking'. |

### Returns

`Promise`\<\{ `tx`: [`Transaction`](../interfaces/polygon_src.Transaction.md)  }\>

Returns a promise that resolves to a Polygon compound transaction

___

## getStake

▸ **getStake**(`params`): `Promise`\<[`StakeInfo`](../interfaces/polygon_src.StakeInfo.md)\>

Retrieves the delegator's staking information for a specific validator

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the query |
| `params.delegatorAddress` | \`0x$\{string}\` | Ethereum address of the delegator |
| `params.validatorShareAddress` | \`0x$\{string}\` | The validator's ValidatorShare contract address |

### Returns

`Promise`\<[`StakeInfo`](../interfaces/polygon_src.StakeInfo.md)\>

Promise resolving to stake information:
  - balance: Total staked amount formatted in POL
  - shares: Total shares held by the delegator
  - exchangeRate: Current exchange rate between shares and POL

___

## getUnbondNonce

▸ **getUnbondNonce**(`params`): `Promise`\<`bigint`\>

Retrieves the latest unbond nonce for a delegator

Each unstake operation creates a new unbond request with an incrementing nonce.
Nonces start at 1 and increment with each unstake.
Note: a nonce having existed does not mean it is still pending —
claimed unbonds are deleted, but the counter is never decremented.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the query |
| `params.delegatorAddress` | \`0x$\{string}\` | Ethereum address of the delegator |
| `params.validatorShareAddress` | \`0x$\{string}\` | The validator's ValidatorShare contract address |

### Returns

`Promise`\<`bigint`\>

Promise resolving to the latest unbond nonce (0n if no unstakes performed)

___

## getUnbond

▸ **getUnbond**(`params`): `Promise`\<[`UnbondInfo`](../interfaces/polygon_src.UnbondInfo.md)\>

Retrieves unbond request information for a specific nonce

Use this to check the status of individual unbond requests.
For fetching multiple unbonds efficiently, use getUnbonds() instead.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the query |
| `params.delegatorAddress` | \`0x$\{string}\` | Ethereum address of the delegator |
| `params.validatorShareAddress` | \`0x$\{string}\` | The validator's ValidatorShare contract address |
| `params.unbondNonce` | `bigint` | The specific unbond nonce to query (1, 2, 3, etc.) |

### Returns

`Promise`\<[`UnbondInfo`](../interfaces/polygon_src.UnbondInfo.md)\>

Promise resolving to unbond information:
  - amount: Amount pending unbonding in POL
  - isWithdrawable: Whether the unbond can be withdrawn now
  - shares: Shares amount pending unbonding (0n if already withdrawn or doesn't exist)
  - withdrawEpoch: Epoch number when the unbond started

___

## getUnbonds

▸ **getUnbonds**(`params`): `Promise`\<[`UnbondInfo`](../interfaces/polygon_src.UnbondInfo.md)[]\>

Retrieves unbond request information for multiple nonces efficiently

This method batches all contract reads into a single RPC call, making it
much more efficient than calling getUnbond() multiple times.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the query |
| `params.delegatorAddress` | \`0x$\{string}\` | Ethereum address of the delegator |
| `params.validatorShareAddress` | \`0x$\{string}\` | The validator's ValidatorShare contract address |
| `params.unbondNonces` | `bigint`[] | Array of unbond nonces to query (1, 2, 3, etc.) |

### Returns

`Promise`\<[`UnbondInfo`](../interfaces/polygon_src.UnbondInfo.md)[]\>

Promise resolving to array of unbond information (same order as input nonces)

___

## getLiquidRewards

▸ **getLiquidRewards**(`params`): `Promise`\<`string`\>

Retrieves pending liquid rewards for a delegator

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the query |
| `params.delegatorAddress` | \`0x$\{string}\` | Ethereum address of the delegator |
| `params.validatorShareAddress` | \`0x$\{string}\` | The validator's ValidatorShare contract address |

### Returns

`Promise`\<`string`\>

Promise resolving to the pending rewards in POL

___

## getAllowance

▸ **getAllowance**(`ownerAddress`): `Promise`\<`string`\>

Retrieves the current POL allowance for the StakeManager contract

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `ownerAddress` | \`0x$\{string}\` | The token owner's address |

### Returns

`Promise`\<`string`\>

Promise resolving to the current allowance in POL

___

## getEpoch

▸ **getEpoch**(): `Promise`\<`bigint`\>

Retrieves the current checkpoint epoch from the StakeManager

### Returns

`Promise`\<`bigint`\>

Promise resolving to the current epoch number

___

## getWithdrawalDelay

▸ **getWithdrawalDelay**(): `Promise`\<`bigint`\>

Retrieves the withdrawal delay from the StakeManager

The withdrawal delay is the number of epochs that must pass after an unbond
request before the funds can be withdrawn (~80 checkpoints, approximately 3-4 days).

### Returns

`Promise`\<`bigint`\>

Promise resolving to the withdrawal delay in epochs

___

## getExchangeRatePrecision

▸ **getExchangeRatePrecision**(`validatorShareAddress`): `Promise`\<`bigint`\>

Retrieves the exchange rate precision for a validator

Foundation validators (ID < 8) use precision of 100, others use 10^29.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `validatorShareAddress` | \`0x$\{string}\` | The validator's ValidatorShare contract address |

### Returns

`Promise`\<`bigint`\>

Promise resolving to the precision constant

___

## sign

▸ **sign**(`params`): `Promise`\<\{ `signedTx`: \`0x$\{string}\`  }\>

Signs a transaction using the provided signer.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the signing process |
| `params.signer` | `Signer` | A signer instance |
| `params.signerAddress` | \`0x$\{string}\` | The address of the signer |
| `params.tx` | [`Transaction`](../interfaces/polygon_src.Transaction.md) | The transaction to sign |
| `params.baseFeeMultiplier?` | `number` | (Optional) The multiplier for fees, which is used to manage fee fluctuations, is applied to the base fee per gas from the latest block to determine the final `maxFeePerGas`. The default value is 1.2 |
| `params.defaultPriorityFee?` | `string` | (Optional) This overrides the `maxPriorityFeePerGas` estimated by the RPC |

### Returns

`Promise`\<\{ `signedTx`: \`0x$\{string}\`  }\>

A promise that resolves to an object containing the signed transaction

___

## broadcast

▸ **broadcast**(`params`): `Promise`\<\{ `txHash`: \`0x$\{string}\`  }\>

Broadcasts a signed transaction to the network.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the broadcast process |
| `params.signedTx` | \`0x$\{string}\` | The signed transaction to broadcast |

### Returns

`Promise`\<\{ `txHash`: \`0x$\{string}\`  }\>

A promise that resolves to the transaction hash

___

## getTxStatus

▸ **getTxStatus**(`params`): `Promise`\<[`PolygonTxStatus`](../interfaces/polygon_src.PolygonTxStatus.md)\>

Retrieves the status of a transaction using the transaction hash.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the transaction status request |
| `params.txHash` | \`0x$\{string}\` | The transaction hash to query |

### Returns

`Promise`\<[`PolygonTxStatus`](../interfaces/polygon_src.PolygonTxStatus.md)\>

A promise that resolves to an object containing the transaction status
