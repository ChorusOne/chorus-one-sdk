## Table of Contents

## Overview

With the Chorus One SDK, users can unstake their ETH from a Vault, regaining asset control. Users are placed in an exit queue where they continue to earn rewards, and then they can claim the staked ETH.

This section covers the entire process, from unstaking request initiation to handling the exit queue and withdrawing your ETH.

{% hint style="info" %}

We will use the same form as we did for staking for simplicity. This form allows users to input the amount of ETH and submit.

Please refer to the [Staking Functionality][stake-section] section for more details.

{% endhint %}

## Determining Unstaking Limits

To begin, we need to establish the maximum amount that the user is permitted to unstake. This is achieved by invoking the `getStake` method on the `EthereumStaker` instance.

**Here's how you can implement it:**

```typescript
const staker = new EthereumStaker({ network: 'holesky' })
await staker.init()

const { maxUnstake } = await staker.getStake({
  delegatorAddress: userAddress,
  validatorAddress
})

console.log(maxUnstake) // '1' - 1 ETH

if (amountToUnstake > maxUnstake) {
  // The user is trying to unstake more than they can
  throw new Error('Unstaking amount exceeds the limit')
}
```

{% hint style="warning" %}

To unstake your entire ETH amount, you may need to burn your osETH tokens first. Burning osETH reclaims the underlying staked ETH. For detailed steps, see the [Burning osETH section][burn].

{% endhint %}

## Sending the Unstake Transaction

Once you've determined the maximum unstakeable amount, you can proceed to build and send the unstake transaction.

**The following example demonstrates how to use the `buildUnstakeTx` method:**

```typescript
const { tx: unstakeTx } = await staker.buildUnstakeTx({
  delegatorAddress: userAddress,
  validatorAddress,
  amount: amountToUnstake // Passed as string, e.g. '1' - 1 ETH
})

const request = await walletClient.prepareTransactionRequest(unstakeTx)
await walletClient.sendTransaction(request)
```

After initiating an unstake request, assets are placed into an unstake queue before being withdrawn. This is a safeguard to ensure the liquidity and stability of the vault. The duration an asset remains in the queue is contingent upon the validator's policies and the state of the vault.

## Fetching the Unstake Queue

To view the current state of your assets within the unstake queue, you'll need to query the queue for your specific vault.

**This can be accomplished with the following command:**

```typescript
const unstakeQueue = await staker.getUnstakeQueueForVault({
  delegatorAddress: userAddress,
  validatorAddress
})

console.log(unstakeQueue)
// [
//   {
//     positionTicket: '200565792007826595508',
//     timestamp: 1632960000000,
//     isWithdrawable: true,
//     totalAmount: '1',
//     withdrawableAmount: '1'
//   ]
// }
```

Here, `validatorAddress` refers to the address the vault, and `userAddress` is the wallets address. The returned `unstakeQueue` contains an array of objects, each representing an item within the queue. These objects are structured as follows:

- **`positionTicket`(string)**: A unique identifier for the queue item.
- **`timestamp` (number)**: The timestamp of the queue item's creation.
- **`isWithdrawable` (boolean)**: A flag indicating whether the assets are ready to be withdrawn.
- **`totalAmount` (string)**: The total amount of assets in the queue item, in ETH.
- **`withdrawableAmount` (bigint)**: The portion of assets, in ETH, that can be withdrawn.

Once assets within the unstake queue reach a withdrawable state, users can initiate the withdrawal process to transfer them back into their wallets. This is done through the `buildWithdrawTx` method, which prepares the transaction necessary for withdrawing the specified assets.

## Preparing the Withdrawal Transaction

To withdraw assets, you'll need to identify which queue items are ready to be withdrawn. This is achieved by filtering the items in your unstake queue to include only those marked as `isWithdrawable`.

**The following example demonstrates how to prepare the withdrawal transaction:**

```typescript
const { tx: withdrawTx } = await staker.buildWithdrawTx({
  delegatorAddress: userAddress,
  validatorAddress,
  positionTickets: unstakeQueue.filter((item) => item.isWithdrawable).map((item) => item.positionTicket)
})
```

If you wish to withdraw all assets, you don't need to pass the `positionTickets` parameter. The SDK will automatically withdraw all assets marked as `isWithdrawable`.

In this snippet, `unstakeQueue` represents the queue items you've retrieved earlier. By filtering for `isWithdrawable` items, you ensure that only assets eligible for withdrawal are included in the transaction.

## Sending the Withdrawal Transaction

After preparing the withdrawal transaction, the next step is to send it to the blockchain.

**This process is similar to other transactions and can be done using the following code:**

```typescript
const request = await walletClient.prepareTransactionRequest(stakeTx)
await walletClient.sendTransaction(request)
```

{% hint style="success" %}

Once the transaction is successfully sent and confirmed, the specified assets are transferred from the unstake queue to your wallet. Depending on your needs and strategy, you can withdraw a portion or all of your withdrawable assets.

{% endhint %}

## Next Steps

In this section, we learned about the functionality for unstaking in the Chorus One SDK, covering both the initiation of unstaking and the process of managing assets within the unstake queue.

Now, you are ready to move on to the next section — [Minting osETH][mint].

[stake-section]: 3-staking.md
[mint]: 5-minting-os-eth.md
[burn]: 6-burning-os-eth.md
