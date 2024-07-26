## Overview

In this section, we will cover the process of burning osETH tokens using the Chorus One SDK. Burning osETH is essential for redeeming your staked ETH, allowing you to unlock and unstake your assets from the Vault.

We will guide you through determining the maximum amount of osETH you can burn, preparing the burn transaction, and executing it on the blockchain.

## Determining Maximum Burnable osETH

First, we need to determine the maximum amount of osETH that can be burned. This is done by calling the `getMint` method on the `EthereumStaker` instance.

**Here's a snippet illustrating this process:**

```typescript
const staker = new EthereumStaker({ network: 'holesky' })
await staker.init()

const { balance: mintAmount } = await staker.getMaxMintForVault({
  delegatorAddress: userAddress,
  validatorAddress
})

console.log(mintAmount) // '1' - 1 ETH

if (amountToBurn > mintAmount) {
  // The user is trying to burn more than they can
  throw new Error('Burning amount exceeds the limit')
}
```

## Executing the Burning Transaction

After determining the maximum amount of osETH that can be burned, proceed to build and send the burn transaction.

**Here's how you can implement this with the `buildBurnTx` method:**

```typescript
const { tx: burnTx } = await staker.buildBurnTx({
  delegatorAddress: userAddress,
  validatorAddress,
  amount: amountToBurn // Passed as string, e.g. '1' - 1 ETH
})

const request = await walletClient.prepareTransactionRequest(unstakeTx)
await walletClient.sendTransaction(request)
```

## Next Steps

Now that you have learned how to burn osETH tokens, you are ready to dive deeper into the Chorus One SDK's capabilities. Proceed to the next section to explore [Transaction History][transaction-history].

[transaction-history]: 7-transaction-history.md
