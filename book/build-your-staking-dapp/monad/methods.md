# Methods

This section provides an overview of the key methods available in the **Chorus One SDK** for staking on the Monad network.

The Chorus One SDK supports a range of staking operations including delegating, undelegating, claiming rewards, compounding rewards, and withdrawing. Below, we explore each method with practical examples to help you get started.

---

## buildStakeTx

### Description

The `buildStakeTx` method helps you create a transaction for delegating MON tokens to a validator. Delegating tokens involves locking them up to support the validator's operations, and in return you earn staking rewards.

The delegated stake becomes active:

- In epoch N+1 if the delegation is submitted **before the boundary block**
- In epoch N+2 if the delegation is submitted **during the epoch delay period** (after the boundary block)

### How to Use

To build a delegation transaction, you need to specify the validator ID and the amount of MON to delegate.

### Parameters

- **validatorId** (number): Unique identifier for the validator (0 to 2^64-1)
- **amount** (string): Amount to delegate in MON (e.g., "1000" for 1000 MON)

### Example

```javascript
const { tx } = await staker.buildStakeTx({
  validatorId: 1,
  amount: '1000' // 1000 MON
})

// Sign and send using viem wallet client
const hash = await walletClient.sendTransaction(tx)
console.log('Delegation transaction sent:', hash)
```

In this example, we are delegating 1000 MON to validator ID 1. The MON tokens are sent with the transaction and will become active stake in the next epoch or the one after, depending on the current block position in the epoch.

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#buildstaketx)

---

## buildUnstakeTx

### Description

The `buildUnstakeTx` method allows you to create a transaction for undelegating tokens from a validator. This creates a **withdrawal request** that you can complete later using `buildWithdrawTx`.

Undelegating involves deactivating your staked tokens:

- The stake becomes **inactive** in the validator set in epoch N+1 (before boundary block) or N+2 (during epoch delay period)
- Upon becoming inactive, it enters a **pending state** for `WITHDRAWAL_DELAY` epochs (currently 1 epoch)
- After the delay, you can call `withdraw()` to receive your tokens

### How to Use

To build an undelegation transaction, you need to provide:

- Your delegator address
- The validator ID
- The amount to undelegate
- A withdrawal ID (0-255) to track this request

### Parameters

- **delegatorAddress** (Address): Your wallet address that will receive funds after withdrawal
- **validatorId** (number): Unique identifier for the validator
- **amount** (string): Amount to undelegate in MON
- **withdrawalId** (number): User-chosen ID (0-255) to track this withdrawal request

### Example

```javascript
const { tx } = await staker.buildUnstakeTx({
  delegatorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  validatorId: 1,
  amount: '500', // 500 MON
  withdrawalId: 0 // Use ID 0 to track this withdrawal
})

const hash = await walletClient.sendTransaction(tx)
console.log('Undelegation transaction sent:', hash)
```

Here, we're undelegating 500 MON from validator 1 and tracking it with withdrawal ID 0.

{% hint style="warning" %}

**Withdrawal IDs**: You can have up to 256 concurrent withdrawal requests per (validator, delegator) pair. Make sure the withdrawal ID you choose is not already in use. After you complete a withdrawal, the ID becomes available for reuse.

{% endhint %}

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#buildunstaketx)

---

## buildWithdrawTx

### Description

The `buildWithdrawTx` method allows you to complete a withdrawal by claiming your undelegated tokens back to your wallet.

You can only withdraw after the withdrawal delay period has passed (current epoch > withdrawal epoch + withdraw delay).

### How to Use

To build a withdrawal transaction, you need to provide the same validator ID and withdrawal ID you used when undelegating.

### Parameters

- **delegatorAddress** (Address): Your wallet address that will receive the funds
- **validatorId** (number): Unique identifier for the validator you undelegated from
- **withdrawalId** (number): The same ID (0-255) you used when calling undelegate

### Example

```javascript
const { tx } = await staker.buildWithdrawTx({
  delegatorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  validatorId: 1,
  withdrawalId: 0
})
```

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#buildwithdrawtx)

---

## buildCompoundTx

### Description

The `buildCompoundTx` method allows you to convert your accumulated rewards into additional stake (auto-restaking). This increases your total stake and future reward rate.

The compounded rewards follow the same activation timing as regular delegation:

- Epoch N+1 if submitted before the boundary block
- Epoch N+2 if submitted during the epoch delay period

### How to Use

To build a compound transaction, provide your delegator address and the validator ID.

### Parameters

- **delegatorAddress** (Address): Your wallet address
- **validatorId** (number): Unique identifier for the validator to compound rewards for

### Example

```javascript
const { tx } = await staker.buildCompoundTx({
  delegatorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  validatorId: 1
})
```

{% hint style="info" %}

**Validation**: The SDK validates that you have unclaimed rewards > 0 before building the transaction.

{% endhint %}

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#buildcompoundtx)

---

## buildClaimRewardsTx

### Description

The `buildClaimRewardsTx` method allows you to claim your accumulated staking rewards and send them to your wallet as liquid MON tokens.

Rewards are available immediately after the transaction is confirmed.

### How to Use

To build a claim rewards transaction, provide your delegator address and the validator ID.

### Parameters

- **delegatorAddress** (Address): Your wallet address that will receive the rewards
- **validatorId** (number): Unique identifier for the validator to claim rewards from

### Example

```javascript
const { tx } = await staker.buildClaimRewardsTx({
  delegatorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  validatorId: 1
})
```

Here, we claim all available rewards and send them to the wallet address.

{% hint style="info" %}

**Validation**: The SDK validates that you have unclaimed rewards > 0 before building the transaction.

{% endhint %}

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#buildclaimrewardstx)

---

## getDelegator

### Description

The `getDelegator` method retrieves complete information about your delegation to a specific validator.

This is a read-only method that doesn't cost gas.

### How to Use

Provide the validator ID and your delegator address to query your staking information.

### Parameters

- **validatorId** (number): Unique identifier for the validator
- **delegatorAddress** (Address): Your wallet address

### Returns

Returns the delegator's `DelInfo` with the following fields:

- **stake** (bigint): Currently active stake earning rewards right now (in wei)
- **unclaimedRewards** (bigint): Rewards available to claim or compound (in wei)
- **deltaStake** (bigint): Pending stake activating at deltaEpoch (in wei)
- **nextDeltaStake** (bigint): Pending stake activating at nextDeltaEpoch (in wei)
- **deltaEpoch** (bigint): Epoch number when deltaStake becomes active
- **nextDeltaEpoch** (bigint): Epoch number when nextDeltaStake becomes active
- **accRewardPerToken** (bigint): Internal accounting value

### Example

```javascript
const delegatorInfo = await staker.getDelegator({
  validatorId: 1,
  delegatorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
})
```

{% hint style="info" %}

**Understanding Pending Stakes**: The two pending slots (`deltaStake` and `nextDeltaStake`) exist because Monad has a boundary block system. Stakes submitted before the boundary activate in epoch N+1 (deltaStake), while stakes submitted after the boundary activate in epoch N+2 (nextDeltaStake).

{% endhint %}

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#getdelegator)

---

## getWithdrawalRequest

### Description

The `getWithdrawalRequest` method retrieves information about a specific withdrawal request.

Use this to check if your undelegated tokens are ready to withdraw.

### How to Use

Provide the validator ID, your delegator address, and the withdrawal ID you used when undelegating.

### Parameters

- **validatorId** (number): Unique identifier for the validator you undelegated from
- **delegatorAddress** (Address): Your wallet address
- **withdrawalId** (number): The ID (0-255) you assigned when calling undelegate

### Returns

Returns the pending `WithdrawalRequest` with:

- **withdrawalAmount** (bigint): Amount in wei that will be returned when you call withdraw (0 if no request exists)
- **withdrawEpoch** (bigint): Epoch when undelegate stake deactivates
- **accRewardPerToken** (bigint): Internal accounting value

### Example

```javascript
const withdrawalRequest = await staker.getWithdrawalRequest({
  validatorId: 1,
  delegatorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  withdrawalId: 0
})
```

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#getwithdrawalrequest)

---

## getEpoch

### Description

The `getEpoch` method retrieves current epoch information from the Monad network.

This is useful for understanding when your stake changes will activate and when withdrawals will be ready.

### How to Use

No parameters needed - just call the method.

### Returns

Returns an `EpochInfo` object with:

- **epoch** (bigint): Current epoch number
- **inEpochDelayPeriod** (boolean): Whether we're in the epoch delay period (after the boundary block)

### Understanding inEpochDelayPeriod

- **false**: Before the boundary block → stake changes activate in epoch N+1
- **true**: During the epoch delay period (after boundary block) → stake changes activate in epoch N+2

The **epoch delay period** is the time between the boundary block and the start of the next epoch.

### Example

```javascript
const { epoch, inEpochDelayPeriod } = await staker.getEpoch()
```

{% hint style="info" %}

**Note**: Epochs are measured in consensus rounds, not blocks. Rounds increment even when block proposals timeout, so epoch duration can vary based on network conditions.

{% endhint %}

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#getepoch)

---

## sign

### Description

The `sign` method signs a transaction using the provided signer (e.g., Fireblocks, local mnemonic).

### How to Use

To sign a transaction, you need to provide a signer instance, the signer's address, and the transaction object from any `build*Tx` method.

### Parameters

- **signer** (Signer): A signer instance (e.g., `FireblocksSigner`, `LocalSigner`)
- **signerAddress** (Address): The address of the signer
- **tx** (Transaction): The transaction to sign (from any `build*Tx` method)
- **baseFeeMultiplier** (number, optional): Multiplier applied to the base fee per gas from the latest block to determine `maxFeePerGas`. Defaults to `1.2`.
- **defaultPriorityFee** (string, optional): Overrides the `maxPriorityFeePerGas` estimated by the RPC.

### Example

```javascript
const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  tx
})
```

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#sign)

---

## broadcast

### Description

The `broadcast` method broadcasts a signed transaction to the Monad network.

### How to Use

Pass the signed transaction hex string returned by the `sign` method.

### Parameters

- **signedTx** (Hex): The signed transaction to broadcast

### Example

```javascript
const { txHash } = await staker.broadcast({ signedTx })

console.log('Transaction hash:', txHash)
```

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#broadcast)

---

## getTxStatus

### Description

The `getTxStatus` method retrieves the status of a transaction using the transaction hash.

### How to Use

Provide the transaction hash received from the `broadcast` method.

### Parameters

- **txHash** (Hex): The transaction hash to query

### Returns

Returns the transaction status including:

- **status** (string): Transaction status (`'success'`, `'failure'`, or `'unknown'`)
- **receipt** (object): The full transaction receipt (when available)

### Example

```javascript
const txStatus = await staker.getTxStatus({ txHash })

console.log('Transaction status:', txStatus.status)
```

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#gettxstatus)

---

## getAddressDerivationFn

### Description

The `getAddressDerivationFn` is a **static** method used to derive an address from a public key. It is used for signer initialization with `FireblocksSigner` or `LocalSigner`.

### How to Use

Call the static method on the `MonadStaker` class and pass it to your signer's `addressDerivationFn` parameter.

### Example

```javascript
import { MonadStaker } from '@chorus-one/monad'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret',
  apiKey: 'your-api-key',
  vaultName: 'your-vault',
  assetId: 'ETH',
  addressDerivationFn: MonadStaker.getAddressDerivationFn()
})

await signer.init()
```

- [Read more in the API Reference](../../docs/classes/monad_src.MonadStaker.md#getaddressderivationfn)

---

## Further Reading

For more detailed information and additional methods, please refer to the official API reference:

- [MonadStaker API Reference](../../docs/classes/monad_src.MonadStaker.md)
- [Monad Staking Documentation](https://docs.monad.xyz/developer-essentials/staking/staking-precompile)
