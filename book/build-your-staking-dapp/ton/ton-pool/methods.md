# Methods

This section provides an overview of the key methods available in the **Chorus One SDK** for staking on the TON Network via the **TON Pool** contract.

The Chorus One SDK supports various staking operations including staking, unstaking, withdrawing, and retrieving staking information.

Below, we explore each method with practical examples to help you get started.

---

## buildStakeTx

### Description

The `buildStakeTx` method creates a staking transaction for the TON Pool contract. This method uses a two-pool solution and automatically selects the best pool for staking.

Staking tokens supports the network's operations and earns rewards for the delegator.

### How to Use

To build a staking transaction, you need to provide the validator address pair, the staking amount (in TON), and optionally, a Unix timestamp indicating when the transaction expires.

### Example

```javascript
const { tx } = await staker.buildStakeTx({
  validatorAddressPair: [
    'kQAHBakDk_E7qLlNQZxJDsqj_ruyAFpqarw85tO-c03fK26F',
    'kQCltujow9Sq3ZVPPU6CYGfqwDxYwjlmFGZ1Wt0bAYebio4o'
  ],
  amount: '2', // 2 TON
  validUntil: Math.floor(Date.now() / 1000) + 3600 // Optional, expires in 1 hour
})
```

In the example above, we stake 2 TON using a validator address pair with an optional expiration time of 1 hour.

- [Read more in the API Reference](../../../docs/classes/ton_src.TonPoolStaker.md#buildstaketx)

---

## buildUnstakeTx

### Description

The `buildUnstakeTx` method creates a transaction for unstaking tokens from the TON Pool contract.

Unstaking involves removing your staked tokens from a validator, which may be subject to fees and a withdrawal waiting period.

### How to Use

To build an unstaking transaction, you need to provide the validator's address, the amount to unstake (in TON), and optionally, a Unix timestamp for when the transaction expires.

### Example

```javascript
const { tx } = await staker.buildUnstakeTx({
  validatorAddress: 'kQAHBakDk_E7qLlNQZxJDsqj_ruyAFpqarw85tO-c03fK26F',
  amount: '1', // 1 TON
  validUntil: Math.floor(Date.now() / 1000) + 3600 // Optional, expires in 1 hour
})
```

In this example, we are unstaking 1 TON from the specified validator with an optional expiration time of 1 hour.

- [Read more in the API Reference](../../../docs/classes/ton_src.TonPoolStaker.md#buildunstaketx)

---

## getStake

### Description

The `getStake` method retrieves staking information for a specific delegator (your wallet) on the TON Pool contract.

- This includes details such as the staked amount, pending deposits, pending withdrawals, and available withdrawal balance.

### How to Use

To retrieve staking information, you need to provide the delegator's address (your wallet) and the validator's address.

### Example

```javascript
const stakeInfo = await staker.getStake({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'kQAHBakDk_E7qLlNQZxJDsqj_ruyAFpqarw85tO-c03fK26F'
})
console.log('Staking Info:', stakeInfo)
```

In this example, we retrieve staking information, including balances and pending deposits, for the given delegator and validator.

- [Read more in the API Reference](../../../docs/classes/ton_src.TonPoolStaker.md#getstake)

---

## getPoolParams

### Description

The `getPoolParams` method retrieves staking parameters for a specified validator, including information such as minimum stake, deposit fees, withdrawal fees, pool fees, and receipt price.

### How to Use

To get the pool parameters, you need to provide the validator's address.

### Example

```javascript
const poolParams = await staker.getPoolParams({
  validatorAddress: 'kQAHBakDk_E7qLlNQZxJDsqj_ruyAFpqarw85tO-c03fK26F'
})
console.log('Pool Parameters:', poolParams)
```

In this example, we retrieve the pool parameters for a given validator, such as fees and minimum stake requirements.

- [Read more in the API Reference](../../../docs/classes/ton_src.TonPoolStaker.md#getpoolparams)

---

## Further Reading

For more detailed information and additional methods, please refer to the official API reference:

- [TON SDK API Reference](../../../docs/classes/ton_src.TonPoolStaker.md)