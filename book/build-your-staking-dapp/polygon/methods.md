# Methods

This section provides an overview of the key methods available in the **Chorus One Polygon SDK** for staking operations.

The Chorus One SDK supports various staking operations including delegating, undelegating, withdrawing, claiming rewards, and compounding. Below, we explore each method with practical examples to help you get started.

## buildApproveTx

### Description

The `buildApproveTx` method creates a transaction to approve the StakeManager contract to spend POL tokens on behalf of the delegator.

This approval must be executed before staking if the current allowance is insufficient.

### How to Use

To build an approval transaction, you need to specify the amount of POL tokens to approve. You can pass `"max"` for unlimited approval.

### Example

```javascript
const { tx } = await staker.buildApproveTx({
  amount: '1000' // Approve 1000 POL
})

// Or for unlimited approval:
const { tx: unlimitedTx } = await staker.buildApproveTx({
  amount: 'max'
})
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildapprovetx)

---

## buildStakeTx

### Description

The `buildStakeTx` method allows you to create a transaction for staking (delegating) POL tokens with a validator.

Staking tokens involves delegating them to a validator via their ValidatorShare contract, supporting the network's security, and in return, you earn rewards.

### How to Use

To build a staking transaction, you will need to specify the delegator's address, the validator's ValidatorShare contract address, and the amount to stake.

### Example

```javascript
import { CHORUS_ONE_POLYGON_VALIDATORS } from '@chorus-one/polygon'

const { tx } = await staker.buildStakeTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
  amount: '100' // 100 POL
})
```

In this example, we're staking 100 POL with the Chorus One validator.

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildstaketx)

---

## buildUnstakeTx

### Description

The `buildUnstakeTx` method creates a transaction to unstake POL tokens from a validator.

After unstaking, there is an unbonding period of approximately 80 checkpoints (around 3-4 days days) before the tokens can be withdrawn.

### How to Use

To build an unstaking transaction, you need to specify the delegator's address, the validator's ValidatorShare contract address, and the amount to unstake.

### Example

```javascript
const { tx } = await staker.buildUnstakeTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
  amount: '50' // 50 POL
})
```

In this example, we are creating an unbond request to unstake 50 POL.

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildunstaketx)

---

## buildWithdrawTx

### Description

The `buildWithdrawTx` method creates a transaction to claim unstaked POL tokens after the unbonding period has elapsed.

You can use `getUnbond()` to check if the unbonding period is complete and `getUnbondNonce()` to get the latest unbond nonce.

### Understanding Unbond Nonces

Each unstake operation creates a **separate unbond request** with its own nonce. Unbonds are NOT batched together.

- Nonces are incremental per delegator, starting from 1
- First unstake = nonce 1, second unstake = nonce 2, etc.
- Each unbond has its own 80-checkpoint countdown
- Withdrawals must be done separately for each nonce

**Example scenario:**

- Day 1: Unstake 100 POL → creates unbond nonce 1 (withdrawable ~Day 4)
- Day 2: Unstake 50 POL → creates unbond nonce 2 (withdrawable ~Day 5)
- Day 4: You can withdraw nonce 1, but nonce 2 is still locked
- Day 5: Now you can withdraw nonce 2

### How to Use

To build a withdrawal transaction, you need to specify the delegator's address, the validator's ValidatorShare contract address, and the specific unbond nonce to withdraw.

### Example

```javascript
// Get the latest unbond nonce
const latestNonce = await staker.getUnbondNonce({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})

// Withdraw a specific unbond (e.g., the latest one)
const { tx } = await staker.buildWithdrawTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
  unbondNonce: latestNonce
})

// To withdraw all pending unbonds, iterate through each nonce:
for (let nonce = 1n; nonce <= latestNonce; nonce++) {
  const unbond = await staker.getUnbond({
    delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
    unbondNonce: nonce
  })

  // Skip if already withdrawn (shares = 0) or not yet claimable
  if (unbond.shares === 0n) continue

  const currentEpoch = await staker.getEpoch()
  if (currentEpoch < unbond.withdrawEpoch) continue

  const { tx } = await staker.buildWithdrawTx({
    delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
    unbondNonce: nonce
  })
  // Sign and broadcast tx...
}
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildwithdrawtx)

---

## buildClaimRewardsTx

### Description

The `buildClaimRewardsTx` method creates a transaction to claim accumulated delegation rewards.

The rewards are sent directly to the delegator's wallet.

### How to Use

To build a claim rewards transaction, you need to specify the delegator's address and the validator's ValidatorShare contract address.

### Example

```javascript
const { tx } = await staker.buildClaimRewardsTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildclaimrewardstx)

---

## buildCompoundTx

### Description

The `buildCompoundTx` method creates a transaction to compound (restake) accumulated rewards.

This restakes your rewards back into the validator, increasing your delegation without requiring new tokens.

### How to Use

To build a compound transaction, you need to specify the delegator's address and the validator's ValidatorShare contract address.

### Example

```javascript
const { tx } = await staker.buildCompoundTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildcompoundtx)

---

## getStake

### Description

The `getStake` method retrieves the staking information for a specified delegator, including the amount of POL tokens currently staked with a specified validator.

### How to Use

To get staking information, you will need to provide the delegator's address and the validator's ValidatorShare contract address.

### Example

```javascript
const { balance, shares } = await staker.getStake({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})

console.log(`Staked balance: ${balance} POL`)
console.log(`Shares held: ${shares}`)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getstake)

---

## getLiquidRewards

### Description

The `getLiquidRewards` method retrieves the pending rewards available to claim for a delegator.

### How to Use

To get pending rewards, you will need to provide the delegator's address and the validator's ValidatorShare contract address.

### Example

```javascript
const rewards = await staker.getLiquidRewards({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})

console.log(`Pending rewards: ${rewards} POL`)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getliquidrewards)

---

## getUnbondNonce

### Description

The `getUnbondNonce` method retrieves the latest unbond nonce for a delegator.

The nonce represents the total number of unstake operations performed by the delegator. Each unstake creates a new unbond request with an incrementing nonce (starting from 1).

For example, if `getUnbondNonce()` returns `3n`, the delegator has performed 3 unstake operations, with unbonds stored at nonces 1, 2, and 3.

### How to Use

To get the unbond nonce, you will need to provide the delegator's address and the validator's ValidatorShare contract address.

### Example

```javascript
const latestNonce = await staker.getUnbondNonce({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})

console.log(`Total unstake operations: ${latestNonce}`)
// To check all unbonds, iterate from 1 to latestNonce
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getunbondnonce)

---

## getUnbond

### Description

The `getUnbond` method retrieves information about a specific unbond request, including the shares amount and the epoch when the unbond becomes claimable.

- `shares`: The amount pending withdrawal. Returns `0n` if the unbond has already been withdrawn or doesn't exist.
- `withdrawEpoch`: The epoch number when the unbond becomes claimable. Compare with `getEpoch()` to check if withdrawal is possible.

### How to Use

To get unbond information, you will need to provide the delegator's address, the validator's ValidatorShare contract address, and the specific unbond nonce to query.

### Example

```javascript
const unbond = await staker.getUnbond({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
  unbondNonce: 1n
})

if (unbond.shares === 0n) {
  console.log('Unbond already withdrawn or does not exist')
} else {
  const currentEpoch = await staker.getEpoch()
  if (currentEpoch >= unbond.withdrawEpoch) {
    console.log('Ready to withdraw!')
  } else {
    console.log(`Withdrawal available at epoch ${unbond.withdrawEpoch} (current: ${currentEpoch})`)
  }
}
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getunbond)

---

## getEpoch

### Description

The `getEpoch` method retrieves the current checkpoint epoch from the StakeManager contract.

This can be used to check if an unbonding period has elapsed.

### How to Use

Call the method without any parameters to get the current epoch.

### Example

```javascript
const currentEpoch = await staker.getEpoch()

console.log(`Current epoch: ${currentEpoch}`)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getepoch)

---

## getAllowance

### Description

The `getAllowance` method retrieves the current POL token allowance for the StakeManager contract.

Use this to check if approval is needed before staking.

### How to Use

To get the allowance, provide the token owner's address.

### Example

```javascript
const allowance = await staker.getAllowance('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')

console.log(`Current allowance: ${allowance} POL`)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getallowance)

---

## Further Reading

For more detailed information and additional methods, please refer to the official API reference:

- [PolygonStaker API Reference](../../docs/classes/polygon_src.PolygonStaker.md)

---

This guide aims to simplify the process of using the Chorus One Polygon SDK for staking operations.

- Please follow the provided examples to integrate these functionalities into your applications.
