This section provides an overview of the key methods available in the **Chorus One SDK** for staking on the Ethereum network.

The Chorus One SDK supports a range of staking operations including staking, unstaking, and withdrawing rewards. Below, we explore each method with practical examples to help you get started.

## buildStakeTx

### Description

The `buildStakeTx` method helps you create a transaction for staking tokens with a validator on the Ethereum network. Staking tokens involves locking them up to support the network's security and operations, and in return, you earn rewards.

### How to Use

To build a staking transaction, you need to specify the amount to stake, the delegator's address (your wallet), and the validator's address where you want to stake your tokens. Optionally, you can also specify a referrer address for tracking purposes.

{% hint style="info" %}

For more information on tracking and attributing staking transactions to specific sources, such as marketing campaigns or integration partners, refer to the [Delegation Tracking](./delegation-tracking.md) section.

{% endhint %}

### Example

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  amount: '1', // 1 ETH
  referrer: '0xReferrerAddressHere' // Unique Ethereum address for tracking
})
```

In this example, we're staking 1 ETH with a specified validator.

---

## buildUnstakeTx

### Description

The `buildUnstakeTx` method allows you to create a transaction for unstaking tokens from a validator on the Ethereum network.

The unstake transaction effectively moves the user's assets into an unstake
queue where they remain until they become eligible for withdrawal. This queue is
a safeguard mechanism that ensures the liquidity and stability of the vault by
managing the flow of assets. To check the status of these assets, use the
`getUnstakeQueue` method.

{% hint style="warning" %}

To unstake your entire ETH amount, you may need to burn your osETH tokens first. Burning osETH reclaims the underlying staked ETH.

{% endhint %}

### How to Use

To build an unstaking transaction, you need to provide the amount to unstake, the delegator's address, and the validator's address from where you want to withdraw your tokens.

### Example

```javascript
const { tx } = await staker.buildUnstakeTx({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  amount: '1' // 1 ETH
})
```

Here, we're unstaking 1 ETH from a specified validator.

---

## buildWithdrawTx

### Description

The `buildWithdrawTx` method allows you to create a transaction for withdrawing your tokens that have been unstaked and are now eligible for withdrawal from the unstake queue.

This method is the final step in the unstaking process. Once assets in the
unstake queue have reached a withdrawable state (as determined by the
`getUnstakeQueue` method), the `buildWithdrawTx` method prepares the transaction
data necessary for transferring these assets back into the user's wallet.

### How to Use

To build a withdrawal transaction, you need to provide the delegator's address and the validator's address from where you want to withdraw your tokens. Optionally, you can specify position tickets if you want to withdraw specific assets.

### Example

```javascript
const { tx } = await staker.buildWithdrawTx({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08'
})
```

Here, we're withdrawing assets from a specified validator.

---

## buildMintTx

### Description

The `buildMintTx` method helps you create a transaction for minting shares (osETH) with a validator on the Ethereum network.

### How to Use

To build a minting transaction, you need to specify the amount of osETH to mint, the delegator's address, and the validator's address where you want to mint your shares. Optionally, you can also specify a referrer address for tracking purposes.

{% hint style="info" %}

For more information on tracking and attributing minting transactions to specific sources, such as marketing campaigns or integration partners, refer to the [Delegation Tracking](./delegation-tracking.md) section.

{% endhint %}

### Example

```javascript
const { tx } = await staker.buildMintTx({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  amount: '1', // 1 osETH
  referrer: '0xReferrerAddressHere' // Unique Ethereum address for tracking
})
```

In this example, we're minting 1 osETH with a specified validator.

---

## buildBurnTx

### Description

The `buildBurnTx` method helps you create a transaction for burning shares (osETH) with a validator on the Ethereum network.

### How to Use

To build a burn transaction, you need to specify the amount of osETH to burn, the delegator's address, and the validator's address where you want to burn your shares.

### Example

```javascript
const { tx } = await staker.buildBurnTx({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  amount: '1' // 1 osETH
})
```

In this example, we're burning 1 osETH from a specified validator.

---

## getVault

### Description

The `getVault` method retrieves the staking information for a specified validator. This includes the total value locked (TVL), annual percentage yield (APY), description, and logo.

### How to Use

To get vault information, you need to provide the validator's address.

### Example

```javascript
const { vault } = await staker.getVault({
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08'
})
console.log(`Vault info: ${JSON.stringify(vault)}`)
```

In this example, we're retrieving the vault information for a specified validator.

---

## getStake

### Description

The `getStake` method retrieves the staking information for a specified delegator. This includes the current balance and the maximum amount that can be unstaked.

### How to Use

To get staking information, you need to provide the delegator's address and the validator's address.

### Example

```javascript
const { balance, maxUnstake } = await staker.getStake({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08'
})
console.log(`Staked balance: ${balance}, Max unstake: ${maxUnstake}`)
```

In this example, we're retrieving the staked balance and maximum unstake amount for a given delegator and validator.

---

## getRewardsHistory

### Description

The `getRewardsHistory` method fetches the rewards data accumulated for a delegator over a specified time period.

### How to Use

To get rewards history, you need to provide the delegator's address, the validator's address, and the start and end times for the data retrieval period.

### Example

```javascript
const rewards = await staker.getRewardsHistory({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  startTime: 1672531200000, // Jan 1, 2023
  endTime: 1704067200000 // Jan 1, 2024
})
console.log(`Rewards history: ${JSON.stringify(rewards)}`)
```

In this example, we're fetching the rewards history for a delegator from a specific validator over a specified time period.

---

## getTxHistory

### Description

The `getTxHistory` method retrieves the transaction history for a specified delegator.

### How to Use

To get transaction history, you need to provide the delegator's address and the validator's address.

### Example

```javascript
const txHistory = await staker.getTxHistory({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08'
})
console.log(`Transaction history: ${JSON.stringify(txHistory)}`)
```

In this example, we're retrieving the transaction history for a specified delegator and validator.

---

## getUnstakeQueue

### Description

The `getUnstakeQueue` method retrieves the unstake queue for a specified delegator. This queue includes information about the current state of unstake requests.

After initiating an unstake request using the `buildUnstakeTx` method, assets
are placed into an unstake queue.

The `getUnstakeQueue` method allows users to query the queue to check the
current state of their unstake requests, including their positionTicket, the
amount of assets that are withdrawable, and the total amount.

To prepare the transaction for withdrawing these assets, use the
`buildWithdrawTx` method.

### How to Use

To get the unstake queue, you need to provide the delegator's address and the validator's address.

### Example

```javascript
const queue = await staker.getUnstakeQueue({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08'
})
console.log(`Unstake queue: ${JSON.stringify(queue)}`)
```

In this example, we're retrieving the unstake queue for a specified delegator and validator.

---

## getMint

### Description

The `getMint` method retrieves the mint information for a specified delegator. This includes the current balance of minted shares (osETH) and the maximum amount that can be minted.

### How to Use

To get mint information, you need to provide the delegator's address and the validator's address.

### Example

```javascript
const { balance, maxMint } = await staker.getMint({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08'
})
console.log(`Mint balance: ${balance}, Max mint: ${maxMint}`)
```

In this example, we're retrieving the mint balance and maximum mint amount for a given delegator and validator.

---

## getMintHealth

### Description

The `getMintHealth` method retrieves the health status of a mint position based on the amount of ETH staked and the amount of osETH minted.

{% hint style="info" %}

The position health parameter is used to monitor the value of minted osETH relative to the staked ETH value:

- **`healthy`**: Minted osETH ≤ 90% of staked ETH
- **`moderate`**: Minted osETH > 90% but ≤ 91% of staked ETH
- **`risky`**: Minted osETH > 91% but ≤ 92% of staked ETH
- **`unhealthy`**: Minted osETH > 92% of staked ETH

Changes in position health can result from discrepancies between Vault APY and osETH APY, higher fees, or inconsistent performance.

Unhealthy positions may lead to forced burning of osETH tokens.

{% endhint %}

### How to Use

To get mint health, you need to provide the stake amount and the mint amount.

### Example

```javascript
const { health } = await staker.getMintHealth({
  stakeAmount: '10', // 10 ETH
  mintAmount: '5' // 5 osETH
})
console.log(`Mint health: ${health}`)
```

In this example, we're retrieving the mint health status based on the provided stake and mint amounts.

---

For more detailed information and additional methods, please refer to the official API reference:

- [Ethereum Staker API Reference](../../docs/classes/ethereum_src.EthereumStaker.md)
