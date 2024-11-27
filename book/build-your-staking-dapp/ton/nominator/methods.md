# Nominator Pool: Methods

This section provides an overview of the key methods available in the **Chorus One SDK** for staking on the TON Network via the **Nominator Pool** contract.

The Chorus One SDK supports various staking operations including staking, unstaking, withdrawing, and retrieving staking information.

Below, we explore each method with practical examples to help you get started.

---

## buildStakeTx

### Description

The `buildStakeTx` method helps you create a transaction for staking TON tokens with a validator using the Nominator Pool contract.

Staking tokens involves locking them up to support the network's security and operations, and in return, you earn rewards.

### How to Use

To build a staking transaction, you will need to specify the amount to stake, the delegator's address (your wallet), and the validator's address where you want to stake your tokens.

- Optionally, you can provide a Unix timestamp for when the transaction expires.

### Example

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP',
  amount: '1', // 1 TON
  validUntil: Math.floor(Date.now() / 1000) + 3600 // Optional, expires in 1 hour
})
```

In the above example, we're staking 1 TON with a specified validator with an optional expiration time.

- [Read more in the API Reference](../../../docs/classes/ton_src.TonNominatorPoolStaker.md#buildstaketx)

---

## buildUnstakeTx

### Description

The `buildUnstakeTx` method allows you to create a transaction for unstaking tokens from a validator using the Nominator Pool contract.

Unstaking involves withdrawing your staked tokens, which then enter a waiting period before they become available for withdrawal.

### How to Use

To build an unstaking transaction, you will need to provide the delegator's address (your wallet), and the validator's address from which you want to withdraw your tokens.

- Optionally, you can provide a Unix timestamp for when the transaction expires.

### Example

```javascript
const { tx } = await staker.buildUnstakeTx({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP',
  validUntil: Math.floor(Date.now() / 1000) + 3600 // Optional, expires in 1 hour
})
```

In the above example, we are unstaking all staked TON from a specified validator, with an optional expiration time of 1 hour.

- [Read more in the API Reference](../../../docs/classes/ton_src.TonNominatorPoolStaker.md#buildunstaketx)

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

- [Read more in the API Reference](../../../docs/classes/ton_src.TonNominatorPoolStaker.md#builddeploywallettx)

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

- [Read more in the API Reference](../../../docs/classes/ton_src.TonNominatorPoolStaker.md#getpoolcontractnominators)

---

## getStake

## Description

The `getStake` method retrieves the staking information from a delegator.

- This includes the amount of tokens currently staked with a validator.

## How to Use

To get staking information, you need to provide the delegator's address (your wallet) and the validator's address.

## Example

```javascript
const { balance } = await staker.getStake({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP',
})
console.log(`Staked balance: ${balance}`)
```

In this example, we're retrieving the staked balance for a given delegator and validator.

- [Read more in the API Reference](../../../docs/classes/ton_src.TonNominatorPoolStaker.md#getstake)

---

## Further Reading

For more detailed information and additional methods please refer to the official API reference:

- [TON Nominator Pool SDK API Reference](../../../docs/classes/ton_src.TonNominatorPoolStaker.md)
