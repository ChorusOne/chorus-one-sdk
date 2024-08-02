# Delegation Tracking

## Introduction

In today's competitive landscape, understanding the origin and impact of your staking transactions is important for maximizing marketing efforts and partnership strategies. Delegation tracking enables businesses to precisely attribute staking activities to specific campaigns, partners, or sources. By gaining invaluable insights into the performance of your marketing campaigns and partner engagements, you can ensure that your resources are directed towards the most effective initiatives and generate accurate revenue reports. This section will show you how to implement delegations tracking.

## How It Works

The `referrer` field in the SDK allows you to associate transactions with a specific Ethereum address, representing the source of the delegation or minting, such as a marketing campaign or integration partner. Including this field as a parameter in both the `buildStakeTx` and `buildMintTx` methods provides detailed insights and accurate attribution of delegations and minting transactions, tailored to your specific needs.

{% hint style="info" %}

To ensure precise tracking and management of transaction origins, it's important to use unique addresses for different customers or campaigns. Generate a unique Ethereum address for each referrer or use your own Ethereum address to track transactions.

{% endhint %}

### Example Usage

Here's an example of how to use the `referrer` field when building a staking transaction:

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  amount: '1', // 1 ETH
  referrer: '0xReferrerAddressHere' // Unique Ethereum address for tracking
})
```

And here's an example of how to use the `referrer` field when building a minting transaction:

```javascript
const { tx } = await staker.buildMintTx({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  amount: '1', // 1 osETH
  referrer: '0xReferrerAddressHere' // Unique Ethereum address for tracking
})
```

## Benefits for Your Business

- Ensure accurate revenue tracking to the right partners or campaigns and provide clear revenue reports for different referral sources.
- Evaluate partner performance by tracking staking transaction volume and value, and measure campaign success by analyzing which referrers generate the most delegations.
- Track customer behavior and preferences to improve engagement strategies and implement retention strategies for high-value customers based on delegation data.

## Conclusion

Delegation tracking optimizes marketing strategies and partnerships by providing accurate attribution and insights into customer behavior. It also enables precise revenue reporting. Use delegation tracking to stay competitive and allocate resources effectively.