## Overview

Minting liquid staking tokens (osETH) allows users to maintain liquidity while staking their ETH.

In this section, we will guide you through checking minting limits, assessing vault health, and building and submitting minting transactions.

## Checking Minting Limits

Before minting, we need to check the maximum amount of shares that can be minted.

**This can be done using the** `getMint` **method:**

```typescript
const staker = new EthereumStaker({ network: 'holesky' })
await staker.init()

const { maxMint } = await staker.getMaxMintForVault({
  delegatorAddress: userAddress,
  validatorAddress
})

console.log(maxMint) // '1' - 1 ETH

if (maxMint < amountToMint) {
  // The user is trying to mint more than they can
  throw new Error('Minting amount exceeds the limit')
}
```

## Calculating Health Factor for Minting

After confirming the minting limits, the next step is to assess the health factor of the vault. This involves evaluating the vault's health given the amount of shares the user intends to mint.

**Use the** `getMintHealth` **method:**

```typescript
// Get the current amount of staked assets
const { balance: stakeAmount } = await staker.getStake({
  delegatorAddress: userAddress,
  validatorAddress
})

console.log(stakeAmount) // '3' - 3 ETH

const { balance: mintAmount } = await staker.getMaxMintForVault({
  delegatorAddress: userAddress,
  validatorAddress
})

console.log(mintAmount) // '1' - 1 ETH

const nextMintAmount = mintAmount + amountToMint

const nextHealth = await staker.getMintHealth({
  stakeAmount,
  mintAmount: nextMintAmount
})

console.log(nextHealth) // 'healthy'

if (nextHealth !== 'healthy') {
  // The vault will be unhealthy after minting
  throw new Error('Vault will be unhealthy after minting')
}
```

The `getMintHealth` method calculates the vault's health factor based on the current and intended minting amounts, ensuring the vault remains in a healthy state post-minting.

{% hint style="info" %}

The position health parameter is used to monitor the value of minted osETH relative to the staked ETH value:

- **`healthy`**: Minted osETH ≤ 90% of staked ETH
- **`moderate`**: Minted osETH > 90% but ≤ 91% of staked ETH
- **`risky`**: Minted osETH > 91% but ≤ 92% of staked ETH
- **`unhealthy`**: Minted osETH > 92% of staked ETH

Changes in position health can result from discrepancies between Vault APY and osETH APY, higher fees, inconsistent performance, or MEV theft.

Unhealthy positions may lead to forced burning of osETH tokens.

{% endhint %}

## Executing the Minting Transaction

If the minting limits and health factors are within acceptable ranges, you can proceed to minting the shares.

**To illustrate this, we use the `buildMintTx` method in the following example:**

```typescript
const { tx: mintTx } = await staker.buildMintTx({
  delegatorAddress: userAddress,
  validatorAddress,
  amount: amountToMint
})

const request = await walletClient.prepareTransactionRequest(unstakeTx)
await walletClient.sendTransaction(request)
```

## Next Steps

In this section, we covered the essential steps for minting osETH tokens, including checking minting limits, calculating the health factor, and executing the minting transaction.

To continue exploring the capabilities of your application, proceed to the next section: [Burning osETH][burn].

[burn]: 6-burning-os-eth.md
