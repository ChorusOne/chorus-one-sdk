This section provides an overview of the key methods available in the **Substrate Network SDK** for staking on networks like Polkadot. The SDK supports various staking operations, including staking, nominating validators, unstaking, withdrawing funds, and bonding extra tokens. Below, we explore each method with practical examples to help you get started.

## buildStakeTx

### Description

The `buildStakeTx` method helps you create a transaction for staking tokens with a validator. Staking tokens involves locking them up to support the network's security and operations, and in return, you earn rewards.

### How to Use

To build a staking transaction, you need to specify the amount to stake.

### Example

```javascript
const { tx } = await staker.buildStakeTx({
  amount: '1' // 1 DOT
})
```

In this example, we're staking 1 DOT with a specified validator.

- [Read more in the API Reference](../../docs/classes/substrate_src.SubstrateStaker.md#buildstaketx)

---

## buildNominateTx

### Description

The `buildNominateTx` method allows you to create a transaction to nominate a validator. Nominating validators allows you to delegate your staked tokens to trusted validators.

### How to Use

To build a nomination transaction, you need to specify the validator's address.

### Example

```javascript
const { tx } = await staker.buildNominateTx({
  validatorAddresses: ['16XF84j2wQ9wjkqRM2Y8ceCaw8dQu7t3ve9P9XbBj5kaRZxY']
})
```

In this example, we're nominating a list of validators.

- [Read more in the API Reference](../../docs/classes/substrate_src.SubstrateStaker.md#buildnominatetx)

---

## buildUnstakeTx

### Description

The `buildUnstakeTx` method helps you create a transaction for unstaking tokens. Unstaking involves withdrawing your staked tokens, which typically undergo a bonding period before they can be fully withdrawn.

### How to Use

To build an unstaking transaction, you need to specify the amount to unstake.

### Example

```javascript
const { tx } = await staker.buildUnstakeTx({
  amount: '1' // 1 DOT
})
```

In this example, we're unstaking 1 DOT.

- [Read more in the API Reference](../../docs/classes/substrate_src.SubstrateStaker.md#buildunstaketx)

---

## buildWithdrawTx

### Description

The `buildWithdrawTx` method allows you to create a transaction to withdraw all unstaked funds from the validator contract. This transaction is used to move your tokens back to your wallet after they have been unstaked and the bonding period has completed.

### How to Use

To build a withdrawal transaction, you do not need to provide any parameters.

### Example

```javascript
const { tx } = await staker.buildWithdrawTx()
```

In this example, we're withdrawing all unstaked funds.

- [Read more in the API Reference](../../docs/classes/substrate_src.SubstrateStaker.md#buildwithdrawtx)

---

## buildBondExtraTx

### Description

The `buildBondExtraTx` method helps you create a transaction to delegate additional tokens to a validator. This is useful if you want to increase your stake without creating a new staking transaction.

### How to Use

To build a bond extra transaction, you need to specify the amount to bond.

### Example

```javascript
const { tx } = await staker.buildBondExtraTx({
  amount: '1' // 1 DOT
})
```

In this example, we're bonding an additional 1 DOT to the current stake.

- [Read more in the API Reference](../../docs/classes/substrate_src.SubstrateStaker.md#buildbondextratx)

---

## getStake

### Description

The `getStake` method retrieves the staking information for a specified delegator. This includes the amount of tokens currently staked with a validator.

### How to Use

To get staking information, you need to provide the delegator's address (your wallet), and optionally the validator's address. If the validator's address is not provided, the method returns rewards from all validators.

You can also specify the status of the nomination ('active' or 'total'). Active nominations are those that are currently actively used to secure the network and earn rewards, while total nominations include all nominations made by the delegator. Default is 'active'.

### Example

```javascript
const { balance } = await staker.getStake({
  delegatorAddress: '5CavrskYZHeLxTwERikgZDCZPmhpsM7oXZQmL6rkNryDD8FwN',
  validatorAddress: '16XF84j2wQ9wjkqRM2Y8ceCaw8dQu7t3ve9P9XbBj5kaRZxY'
})
console.log(`Staked balance: ${balance}`)
```

In this example, we're retrieving the staked balance for a given delegator and validator.

- [Read more in the API Reference](../../docs/classes/substrate_src.SubstrateStaker.md#getstake)

---

## Further Reading

For more detailed information and additional methods, please refer to the official API reference:

- [SubstrateStaker API Reference](../../docs/classes/substrate_src.SubstrateStaker.md)
