# Methods

This section provides an overview of the key methods available in the **Chorus One SDK** for staking on the Cosmos network.

The SDK supports a range of staking operations including staking, unstaking, redelegating, and withdrawing rewards. Below, we explore each method with practical examples to help you get started.

### buildStakeTx

#### Description

The `buildStakeTx` method helps you create a transaction for staking tokens with a validator. Staking tokens involves locking them up to support the network's security and operations, and in return you earn rewards.

#### How to Use

To build a staking transaction, you need to specify the amount to stake, the delegator's address (your wallet), and the validator's address where you want to stake your tokens.

#### Example

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: 'cosmos1xyz...',
  validatorAddress: 'cosmosvaloper1xyz...',
  amount: '1', // 1 ATOM
});
```

In this example, we're staking 1 ATOM with a specified validator.

* [Read more in the API Reference](../../docs/classes/cosmos_src.CosmosStaker.md#buildstaketx)

***

### buildUnstakeTx

#### Description

The `buildUnstakeTx` method allows you to create a transaction for unstaking tokens from a validator.

Unstaking involves withdrawing your staked tokens, during which they enter an unbonding period. On the Cosmos network, the unbonding period typically lasts 21 days, during which your tokens are not earning rewards and cannot be transferred.

After the unbonding period, the tokens become available in your wallet.

#### How to Use

To build an unstaking transaction, you need to provide the amount to unstake, the delegator's address, and the validator's address from where you want to withdraw your tokens.

#### Example

```javascript
const { tx } = await staker.buildUnstakeTx({
  delegatorAddress: 'cosmos1xyz...',
  validatorAddress: 'cosmosvaloper1xyz...',
  amount: '1', // 1 ATOM
});
```

Here, we're unstaking 1 ATOM from a specified validator.

* [Read more in the API Reference](../../docs/classes/cosmos_src.CosmosStaker.md#buildunstaketx)

***

### buildRedelegateTx

#### Description

The `buildRedelegateTx` method helps you create a transaction for redelegating tokens from one validator to another.

This is useful if you want to move your staked tokens to a different validator instantly instead of unstaking, waiting for the unbonding period to complete, then staking them with a different validator.

#### How to Use

To build a redelegation transaction, you need to specify the amount to redelegate, the delegator's address, the source validator's address, and the destination validator's address.

#### Example

```javascript
const { tx } = await staker.buildRedelegateTx({
  delegatorAddress: 'cosmos1xyz...',
  validatorSrcAddress: 'cosmosvaloper1src...',
  validatorDstAddress: 'cosmosvaloper1dst...',
  amount: '1', // 1 ATOM
});
```

In this example, we're moving 1 ATOM from one validator to another.

* [Read more in the API Reference](../../docs/classes/cosmos_src.CosmosStaker.md#buildredelegatetx)

***

### buildWithdrawRewardsTx

#### Description

The `buildWithdrawRewardsTx` method allows you to create a transaction for withdrawing staking rewards from a validator.

Staking rewards accumulate over time and you can withdraw them periodically.

#### How to Use

To build a rewards withdrawal transaction, you need to provide the delegator's address and the validator's address that you want to withdraw your rewards from.

#### Example

```javascript
const { tx } = await staker.buildWithdrawRewardsTx({
  delegatorAddress: 'cosmos1xyz...',
  validatorAddress: 'cosmosvaloper1xyz...',
});
```

Here, we're withdrawing rewards from a specified validator.

* [Read more in the API Reference](../../docs/classes/cosmos_src.CosmosStaker.md#buildwithdrawrewardstx)

***

### getStake

#### Description

The `getStake` method retrieves the staking information from a delegator.

* This includes the amount of tokens currently staked with a validator.

#### How to Use

To get staking information, you need to provide the delegator's address and the validator's address.

#### Example

```javascript
const { balance } = await staker.getStake({
  delegatorAddress: 'cosmos1xyz...',
  validatorAddress: 'cosmosvaloper1xyz...',
});
console.log(`Staked balance: ${balance}`);
```

In this example, we're retrieving the staked balance for a given delegator and validator.

* [Read more in the API Reference](../../docs/classes/cosmos_src.CosmosStaker.md#getstake)

***

### getRewards

#### Description

The `getRewards` method fetches the rewards data accumulated for a delegator.

This shows the total rewards earned from staking with a specific validator.

#### How to Use

To get rewards data, you need to provide the delegator's address and the validator's address.

#### Example

```javascript
const { rewards } = await staker.getRewards({
  delegatorAddress: 'cosmos1xyz...',
  validatorAddress: 'cosmosvaloper1xyz...',
});
console.log(`Rewards: ${rewards}`);
```

Here, we're fetching the rewards earned by a delegator from a specific validator.

* [Read more in the API Reference](../../docs/classes/cosmos_src.CosmosStaker.md#getrewards)

***

### Further Reading

For more detailed information and additional methods, please refer to the official API reference:

* [CosmosStaker API Reference](../../docs/classes/cosmos_src.CosmosStaker.md)
