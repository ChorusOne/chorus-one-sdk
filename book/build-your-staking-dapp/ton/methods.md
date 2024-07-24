# Methods

This section provides an overview of the key methods available in the **Chorus One SDK** for staking on the TON Network.

The Chorus One SDK supports various staking operations including staking, unstaking, withdrawing, and retrieving staking information.

Below, we explore each method with practical examples to help you get started.

---

## buildStakeNominatorPoolTx

### Description

The `buildStakeNominatorPoolTx` method helps you create a transaction for staking TON tokens with a validator using the Nominator Pool contract.

Staking tokens involves locking them up to support the network's security and operations, and in return, you earn rewards.

### How to Use

To build a staking transaction, you will need to specify the amount to stake, the delegator's address (your wallet), and the validator's address where you want to stake your tokens.

- Optionally, you can provide a Unix timestamp for when the transaction expires.

### Example

```javascript
const { tx } = await staker.buildStakeNominatorPoolTx({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP',
  amount: '1', // 1 TON
  validUntil: Math.floor(Date.now() / 1000) + 3600 // Optional, expires in 1 hour
})
```

In the above example, we're staking 1 TON with a specified validator with an optional expiration time.

- [Read more in the API Reference](../../docs/classes/ton_src.TonStaker.md#buildstakenominatorpooltx)

---

## buildUnstakeNominatorPoolTx

### Description

The `buildUnstakeNominatorPoolTx` method allows you to create a transaction for unstaking tokens from a validator using the Nominator Pool contract.

Unstaking involves withdrawing your staked tokens, which then enter a waiting period before they become available for withdrawal.

### How to Use

To build an unstaking transaction, you will need to provide the delegator's address (your wallet), and the validator's address from which you want to withdraw your tokens.

- Optionally, you can provide a Unix timestamp for when the transaction expires.

### Example

```javascript
const { tx } = await staker.buildUnstakeNominatorPoolTx({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP',
  validUntil: Math.floor(Date.now() / 1000) + 3600 // Optional, expires in 1 hour
})
```

In the above example, we are unstaking all staked TON from a specified validator, with an optional expiration time of 1 hour.

- [Read more in the API Reference](../../docs/classes/ton_src.TonStaker.md#buildunstakenominatorpooltx)

---

## buildStakeSingleNominatorPoolTx

### Description

The `buildStakeSingleNominatorPoolTx` method helps you create a transaction for staking TON tokens with a validator using the Single Nominator Pool contract.

{% hint style="info" %}
The Single Nominator Pool contract accepts only one delegator. Usually the contract is deployed by a network operator like Chorus One on demand, because there is a significant amount of stake required to get into a validator set.

The benefit of Single Pool contract is that a nominator can do partial stake withdraws. Which is not possible with Nominator Pool contract.
{% endhint %}

Staking tokens involves locking them up to support the network's security and operations, and in return, you earn rewards.

### How to Use

To build a staking transaction, you will need to specify the amount to stake, the delegator's address (your wallet), and the validator's address where you want to stake your tokens.

- Optionally, you can provide a Unix timestamp for when the transaction expires.

### Example

```javascript
const { tx } = await staker.buildSingleStakeNominatorPoolTx({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP',
  amount: '1', // 1 TON
  validUntil: Math.floor(Date.now() / 1000) + 3600 // Optional, expires in 1 hour
})
```

In the above example, we're staking 1 TON with a specified validator with an optional expiration time.

- [Read more in the API Reference](../../docs/classes/ton_src.TonStaker.md#buildstakenominatorpooltx)

---

## buildUnstakeSingleNominatorPoolTx

### Description

The `buildUnstakeSingleNominatorPoolTx` method allows you to create a transaction for unstaking tokens from a validator using the Single Nominator Pool contract.

Unstaking involves withdrawing your staked tokens, which then enter a waiting period before they become available for withdrawal.

### How to Use

To build an unstaking transaction, you will need to provide the delegator's address (your wallet), amount and the validator's address from which you want to withdraw your tokens.

- Optionally, you can provide a Unix timestamp for when the transaction expires.

### Example

```javascript
const { tx } = await staker.buildUnstakeSingleNominatorPoolTx({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP',
  amount: '1', // 1 TON
  validUntil: Math.floor(Date.now() / 1000) + 3600 // Optional, expires in 1 hour
})
```

In the above example, we are unstaking 1 TON from a specified validator, with an optional expiration time of 1 hour.

- [Read more in the API Reference](../../docs/classes/ton_src.TonStaker.md#buildunstakenominatorpooltx)

---

## buildTransferTx

### Description

The `buildTransferTx` method allows you to create a transaction for transferring tokens to another address.

### How to Use

To build a transfer transaction, you will need to specify the destination address, the amount of TON to transfer, and optionally, a Unix timestamp for when the transaction expires along with a memo to include with the transaction.

### Example

```javascript
const { tx } = await staker.buildTransferTx({
  destinationAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  amount: '1', // 1 TON
  validUntil: Math.floor(Date.now() / 1000) + 3600, // Optional, expires in 1 hour
  memo: 'Staking with Chorus One' // Optional
})
```

In the above example, we are transferring 1 TON to a specified address, with an optional expiration time of 1 hour and memo that reads "Staking with Chorus One".

- [Read more in the API Reference](../../docs/classes/ton_src.TonStaker.md#buildtransfertx)

---

## buildDeployWalletTx

### Description

The `buildDeployWalletTx` method allows you to create a transaction for deploying a wallet contract to a specified address.

### How to Use

To build a wallet deployment transaction, you will need to specify the address you wish to deploy the wallet contract to, and optionally, a Unix timestamp for when the transaction expires.

### Example

```javascript
const { tx } = await staker.buildDeployWalletTx({
  address: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validUntil: Math.floor(Date.now() / 1000) + 3600 // Optional, expires in 1 hour
})
```

Here we can see we are deploying a wallet contract to a specified address, with an optional expiration time of 1 hour.

- [Read more in the API Reference](../../docs/classes/ton_src.TonStaker.md#builddeploywallettx)

---

## getPoolContractNominators

### Description

The `getPoolContractNominators` method retrieves the active nominators for a specified Nominator Pool contract.

- This includes information on the nominators who have staked tokens with a specific validator.

### How to Use

To get this information, you will need to provide the validator's address.

### Example

```javascript
const { nominators } = await staker.getPoolContractNominators({
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP'
})
console.log(`Active nominators: ${nominators}`)
```

In this example, we are retrieving the active nominators for the specified validator.

- [Read more in the API Reference](../../docs/classes/ton_src.TonStaker.md#getpoolcontractnominators)

---

## getBalance

### Description

The `getBalance` method retrieves the account balance for a specified address.

### How to Use

To retrieve the balance data, you will need to provide the address for which you want to retrieve the balance.

### Example

```javascript
const { amount } = await staker.getBalance({
  address: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr'
})
console.log(`Account balance: ${amount}`)
```

In the above example, we are retrieving the account balance for a specified address.

- [Read more in the API Reference](../../docs/classes/ton_src.TonStaker.md#getbalance)

---

## getStake

## Description

The `getStake` method retrieves the staking information from a delegator.

- This includes the amount of tokens currently staked with a validator.

## How to Use

To get staking information, you need to provide the delegator's address (your wallet), the validator's address, and the contract type (Nominator Pool or Single Nominator Pool).

## Example

```javascript
const { balance } = await staker.getStake({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP',
  contractType: 'nominator-pool'
})
console.log(`Staked balance: ${balance}`)
```

In this example, we're retrieving the staked balance for a given delegator and validator.

- [Read more in the API Reference](../../docs/classes/ton_src.TonStaker.md#getstake)

---

## Further Reading

For more detailed information and additional methods please refer to the official API reference:

- [TON SDK API Reference](../../docs/classes/ton_src.TonStaker.md)
