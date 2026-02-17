MonadStaker - TypeScript SDK for Monad blockchain staking operations

This class provides the functionality to stake, unstake, compound rewards,
claim rewards, and withdraw for Monad blockchain.

Built with viem for type-safety and modern patterns.

---

**⚠️ EIP-2930 Access List Compatibility Warning**

All transaction builders include an EIP-2930 access list for referrer tracking by default.
Some wallets (e.g., Phantom) do not support EIP-2930 access lists and will fail during
gas estimation with `InvalidInputRpcError` or `InvalidParamsRpcError`.

If you need to support these wallets, implement a fallback that retries without the access list:

**`Example`**

```typescript
import { BaseError, InvalidInputRpcError, InvalidParamsRpcError } from 'viem'

const shouldRetryWithoutAccessList = (error: unknown): boolean => {
  const matches = (err: unknown) =>
    err instanceof InvalidInputRpcError || err instanceof InvalidParamsRpcError
  if (error instanceof BaseError) {
    return Boolean(error.walk(matches))
  }
  return false
}

const sendTransaction = async (tx: Transaction) => {
  try {
    return await walletClient.sendTransaction(tx)
  } catch (err) {
    if (tx.accessList && shouldRetryWithoutAccessList(err)) {
      const { accessList: _omit, ...fallbackTx } = tx
      return await walletClient.sendTransaction(fallbackTx)
    }
    throw err
  }
}
```

# Table of contents

## Constructors

- [constructor](monad_src.MonadStaker.md#constructor)

## Methods

- [getAddressDerivationFn](monad_src.MonadStaker.md#getaddressderivationfn)
- [init](monad_src.MonadStaker.md#init)
- [buildStakeTx](monad_src.MonadStaker.md#buildstaketx)
- [buildUnstakeTx](monad_src.MonadStaker.md#buildunstaketx)
- [buildWithdrawTx](monad_src.MonadStaker.md#buildwithdrawtx)
- [buildCompoundTx](monad_src.MonadStaker.md#buildcompoundtx)
- [buildClaimRewardsTx](monad_src.MonadStaker.md#buildclaimrewardstx)
- [getDelegator](monad_src.MonadStaker.md#getdelegator)
- [getWithdrawalRequest](monad_src.MonadStaker.md#getwithdrawalrequest)
- [getEpoch](monad_src.MonadStaker.md#getepoch)
- [sign](monad_src.MonadStaker.md#sign)
- [broadcast](monad_src.MonadStaker.md#broadcast)
- [getTxStatus](monad_src.MonadStaker.md#gettxstatus)

# Constructors

## constructor

• **new MonadStaker**(`params`): [`MonadStaker`](monad_src.MonadStaker.md)

Creates a MonadStaker instance

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Initialization configuration |
| `params.rpcUrl` | `string` | The URL of the Monad network RPC endpoint |

### Returns

[`MonadStaker`](monad_src.MonadStaker.md)

An instance of MonadStaker

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

Initializes the MonadStaker instance and connects to the blockchain

### Returns

`Promise`\<`void`\>

A promise which resolves once the MonadStaker instance has been initialized

___

## buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`\<\{ `tx`: `Transaction`  }\>

Builds a staking transaction

Stake becomes active in epoch n+1 (if before boundary block) or epoch n+2 (if after).

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.validatorId` | `number` | Unique identifier (uint64) for the validator. Assigned when validator joined the network. |
| `params.amount` | `string` | The amount to stake in MON (will be converted to wei internally) |
| `params.referrer?` | \`0x$\{string}\` | (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding. |

### Returns

`Promise`\<\{ `tx`: `Transaction`  }\>

Returns a promise that resolves to a Monad staking transaction

**`Remarks`**

The returned transaction includes an EIP-2930 access list for referrer tracking.
Some wallets (e.g., Phantom) do not support this. See the class documentation for a fallback pattern.

___

## buildUnstakeTx

▸ **buildUnstakeTx**(`params`): `Promise`\<\{ `tx`: `Transaction`  }\>

Builds an unstaking transaction

Creates a withdrawal request to unstake tokens from a validator.
Stake becomes inactive in epoch n+1 or n+2, then moves to pending state for WITHDRAWAL_DELAY epochs (1 epoch).
After delay, call buildWithdrawTx() to claim funds back to your wallet.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator's address that will receive funds after withdrawal |
| `params.validatorId` | `number` | Unique identifier for the validator to unstake from |
| `params.amount` | `string` | The amount to unstake in MON (will be converted to wei internally) |
| `params.withdrawalId` | `number` | User-chosen ID (0-255) to track this withdrawal request. Allows up to 256 concurrent withdrawals per (validator,delegator) tuple. Can be reused after calling withdraw(). |
| `params.referrer?` | \`0x$\{string}\` | (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding. |

### Returns

`Promise`\<\{ `tx`: `Transaction`  }\>

Returns a promise that resolves to a Monad unstaking transaction

___

## buildWithdrawTx

▸ **buildWithdrawTx**(`params`): `Promise`\<\{ `tx`: `Transaction`  }\>

Builds a withdraw transaction

Completes an unstaking by claiming the tokens back to your wallet.
Can only be executed once current epoch >= withdrawEpoch (check via getWithdrawalRequest).

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator's address that will receive the funds |
| `params.validatorId` | `number` | Unique identifier for the validator you unstaked from |
| `params.withdrawalId` | `number` | The same ID (0-255) you used when calling buildUnstakeTx. After successful withdrawal, this ID becomes available for reuse. |
| `params.referrer?` | \`0x$\{string}\` | (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding. |

### Returns

`Promise`\<\{ `tx`: `Transaction`  }\>

Returns a promise that resolves to a Monad withdrawal transaction

___

## buildCompoundTx

▸ **buildCompoundTx**(`params`): `Promise`\<\{ `tx`: `Transaction`  }\>

Builds a compound rewards transaction

Converts accumulated unclaimedRewards into additional stake (auto-restaking).
The compounded amount becomes active in epoch n+1 or n+2 (same timing as staking).

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator's address |
| `params.validatorId` | `number` | Unique identifier for the validator to compound rewards for |
| `params.referrer?` | \`0x$\{string}\` | (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding. |

### Returns

`Promise`\<\{ `tx`: `Transaction`  }\>

Returns a promise that resolves to a Monad compound transaction

___

## buildClaimRewardsTx

▸ **buildClaimRewardsTx**(`params`): `Promise`\<\{ `tx`: `Transaction`  }\>

Builds a claim rewards transaction

Claims accumulated unclaimedRewards and sends them to your wallet (not auto-restaked like compound).
Rewards are available immediately after the transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator's address that will receive the rewards |
| `params.validatorId` | `number` | Unique identifier for the validator to claim rewards from |
| `params.referrer?` | \`0x$\{string}\` | (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding. |

### Returns

`Promise`\<\{ `tx`: `Transaction`  }\>

Returns a promise that resolves to a Monad claim rewards transaction

___

## getDelegator

▸ **getDelegator**(`params`): `Promise`\<`DelegatorInfo`\>

Retrieves delegator information for a specific validator

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the query |
| `params.validatorId` | `number` | Unique identifier for the validator |
| `params.delegatorAddress` | \`0x$\{string}\` | Ethereum address of the delegator to query |

### Returns

`Promise`\<`DelegatorInfo`\>

Promise resolving to delegator information including:
  - stake: Currently active stake earning rewards right now (in wei). Does NOT include pending activations.
  - accRewardPerToken: Last checked accumulator value (internal accounting, multiplied by 1e36)
  - unclaimedRewards: Rewards earned but not yet claimed or compounded (in wei)
  - deltaStake: Pending stake activating at deltaEpoch (submitted before boundary block, in wei)
  - nextDeltaStake: Pending stake activating at nextDeltaEpoch (submitted after boundary block, in wei)
  - deltaEpoch: Epoch number when deltaStake becomes active
  - nextDeltaEpoch: Epoch number when nextDeltaStake becomes active

Note: Two pending slots exist because stakes before boundary block activate in epoch n+1 (deltaStake),
while stakes after boundary block activate in epoch n+2 (nextDeltaStake).

___

## getWithdrawalRequest

▸ **getWithdrawalRequest**(`params`): `Promise`\<`WithdrawalRequestInfo`\>

Retrieves withdrawal request information

Use this to check if your unstaked tokens are ready to withdraw.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the query |
| `params.validatorId` | `number` | Unique identifier for the validator you unstaked from |
| `params.delegatorAddress` | \`0x$\{string}\` | Address that initiated the unstaking |
| `params.withdrawalId` | `number` | The ID (0-255) you assigned when calling buildUnstakeTx |

### Returns

`Promise`\<`WithdrawalRequestInfo`\>

Promise resolving to withdrawal information:
  - withdrawalAmount: Amount in wei that will be returned when you call withdraw (0 if no request exists)
  - accRewardPerToken: Validator's accumulator value when unstaking was initiated (used for reward calculations)
  - withdrawEpoch: Epoch number when funds become withdrawable. Compare with current epoch from getEpoch() to check if ready.

To check if withdrawable: currentEpoch >= withdrawEpoch (get currentEpoch via getEpoch())

___

## getEpoch

▸ **getEpoch**(): `Promise`\<`EpochInfo`\>

Retrieves current epoch information

### Returns

`Promise`\<`EpochInfo`\>

Promise resolving to epoch timing information:
  - epoch: Current consensus epoch number. An epoch is ~5.5 hours on mainnet (50,000 blocks) during which the validator set remains unchanged.
  - inEpochDelayPeriod: Boolean indicating if we're past the "boundary block" (the last 10% of blocks in an epoch).
    false = stake changes activate in epoch n+1
    true = stake changes activate in epoch n+2

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
| `params.tx` | `Transaction` | The transaction to sign |
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

▸ **getTxStatus**(`params`): `Promise`\<`MonadTxStatus`\>

Retrieves the status of a transaction using the transaction hash.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the transaction status request |
| `params.txHash` | \`0x$\{string}\` | The transaction hash to query |

### Returns

`Promise`\<`MonadTxStatus`\>

A promise that resolves to an object containing the transaction status
