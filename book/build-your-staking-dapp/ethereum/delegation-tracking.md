# Delegation Tracking

## Introduction

Delegation tracking enables businesses to precisely attribute staking activities to specific campaigns, partners, or sources.

Understanding the origin and impact of your staking transactions is important for maximizing marketing efforts and partnership strategies. With these insights into the performance of your marketing campaigns and partner engagements you can ensure that your resources are directed towards the most effective initiatives and generate accurate revenue reports.

## How It Works

This section will show you how to implement delegation tracking using the Chorus One SDK.

The `referrer` field in the SDK allows you to associate transactions with a specific Ethereum address, representing the source of the delegation or minting, such as a marketing campaign or integration partner. 

Including this field as a parameter in both the `buildStakeTx` and `buildMintTx` methods provides detailed insights and accurate attribution of delegations and minting transactions tailored to your specific needs.

{% hint style="info" %}

To ensure precise tracking and management of transaction origins, it is important to use unique addresseses for different customers or campaigns. 

It is advisable to generate a unique Ethereum address for each referrer or use your own Ethereum address to track transactions.

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

And here is an example of how to use the `referrer` field when building a minting transaction:

```javascript
const { tx } = await staker.buildMintTx({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  amount: '1', // 1 osETH
  referrer: '0xReferrerAddressHere' // Unique Ethereum address for tracking
})
```

## Benefits for Your Business

Leveraging delegation tracking via the Chorus One SDK ensures that your business remains at the forefront of industry developments and provides important benefits and insights for delegation activity such as: 

**Accurate Reporting:**
- Delegation tracking ensures accurate revenue tracking to the right partners or campaigns and provides clear revenue reports for different referral sources.
- It allows evaluation of partner performance by tracking staking transaction volume, value, and measuring campaign success by analyzing which referrers generate the most delegations.
- Delegation tracking also ensures that all activities are documented and accountable, facilitating smoother audits, compliance, and financial reporting.
- Detailed delegation reports can be shared with clients as needed, providing them with insights into their holdings and fostering transparency.

**Strategic Planning:** 
- Delegation tracking provides clear and detailed insights into delegation activities, enabling businesses to maintain transparency and build trust with stakeholders.
- Tracking customer behavior and preferences to improve engagement strategies and implement retention strategies for high-value customers based on delegation data.
- Access to real-time delegation data allows your business to make informed decisions, optimize strategies, and respond promptly to market changes.
- Historical delegation data can be analyzed to forecast trends and improve business strategy and long-term planning.

**Performance Monitoring:**
- By tracking delegations, businesses can identify high-performing assets and allocate resources more effectively to maximize returns.
- Continuous tracking of delegations helps in monitoring the performance of delegated assets, ensuring you can identify and address underperforming areas swiftly.
- Automated tracking reduces the need for manual monitoring, saving time and reducing errors.

## Conclusion

Using delegation tracking in the Chorus One SDK optimizes strategies and partnerships for your business by providing accurate attribution and insights into customer staking activity while also enabling precise revenue tracking. 

This allows your business to stay competitive and allocate resources effectively as well as maintain accurate financial records and reporting. 
