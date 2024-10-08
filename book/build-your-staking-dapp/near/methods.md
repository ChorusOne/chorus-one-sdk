This section provides an overview of the key methods available in the **Chorus One SDK** for staking on the NEAR network.

The SDK supports various staking operations including staking, unstaking, withdrawing, and retrieving staking information. Below, we explore each method with practical examples to help you get started.

---

## buildStakeTx

### Description

The `buildStakeTx` method helps you create a transaction for staking tokens with a validator. Staking tokens involves locking them up to support the network's security and operations, and in return you earn rewards.

### How to Use

To build a staking transaction, you will need to specify the amount to stake, the delegator's address (your wallet), and validator's address where you want to stake your tokens.

### Example

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: 'your.near',
  validatorAddress: 'chorusone.poolv1.near',
  amount: '1' // 1 NEAR
})
```

In this example, we're staking 1 NEAR with a specified validator.

- [Read more in the API Reference](../../docs/classes/near_src.NearStaker.md#buildstaketx)

---

## buildUnstakeTx

### Description

The `buildUnstakeTx` method allows you to create a transaction for unstaking tokens from a validator.

Unstaking involves withdrawing your staked tokens, which then enter a waiting period (typically 2-3 days) before they become available for withdrawal.

### How to Use

To build an unstaking transaction, you will need to provide the amount to unstake, the delegator's address (your wallet), and validator's address you want to withdraw your tokens from.

### Example

```javascript
const { tx } = await staker.buildUnstakeTx({
  delegatorAddress: 'your.near',
  validatorAddress: 'chorusone.poolv1.near',
  amount: '1' // 1 NEAR
})
```

Here, we're unstaking 1 NEAR from a specified validator.

- [Read more in the API Reference](../../docs/classes/near_src.NearStaker.md#buildunstaketx)

---

## buildWithdrawTx

### Description

The `buildWithdrawTx` method allows you to create a transaction for withdrawing previously unstaked tokens.

After the unstaking period has finished, the tokens become available as your "unstaked balance" and must be explicitly withdrawn in order to be returned to your wallet.

### How to Use

To build a withdrawal transaction, you will need to specify the amount to withdraw, the delegator's address (your wallet), and validator's address.

- If you do not specify the amount the entire unstaked balance will be withdrawn.

### Example

```javascript
const { tx } = await staker.buildWithdrawTx({
  amount: '1', // 1 NEAR
  validatorAddress: 'chorusone.poolv1.near'
})
```

Here, we're withdrawing 1 NEAR from a specified validator.

- [Read more in the API Reference](../../docs/classes/near_src.NearStaker.md#buildwithdrawtx)

---

## getStake

### Description

The `getStake` method retrieves the staking information for a delegator. This includes the amount of tokens currently staked with a validator.

### How to Use

To get staking information, you need to provide the delegator's address (your wallet), and optionally the validator's address. If the validator's address is not provided, the method returns rewards from all validators.

### Example

```javascript
const { balance } = await staker.getStake({
  delegatorAddress: 'your.near',
  validatorAddress: 'chorusone.poolv1.near'
})
console.log(`Staked balance: ${balance}`)
```

In this example, we're retrieving the staked balance for a given validator.

- [Read more in the API Reference](../../docs/classes/near_src.NearStaker.md#getstake)

---

## Further Reading

For more detailed information and additional methods please refer to the official API reference:

- [NearStaker API Reference](../../docs/classes/near_src.NearStaker.md)
