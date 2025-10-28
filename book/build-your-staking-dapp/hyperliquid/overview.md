# Overview

The Chorus One SDK simplifies staking on **Hyperliquid**, a high-performance Layer 1 blockchain powered by the HyperBFT consensus algorithm. This SDK enables developers to build staking applications that interact with Hyperliquid's unique account model and delegated proof-of-stake system.

{% hint style="info" %}
Hyperliquid uses **HyperCore** for its staking infrastructure, featuring a dual-account model (spot and staking), instant delegation operations, and a time-weighted reward distribution system. The network employs **HyperBFT consensus** with validator jailing mechanisms to ensure network reliability.
{% endhint %}

## Understanding Hyperliquid Staking

### Account Model

Hyperliquid uses a dual-account structure similar to how USDC can be transferred between perpetuals and spot accounts:

- **Spot Account**: Your main trading and holding account for HYPE tokens
- **Staking Account**: A dedicated account for staking operations and delegations

**Transfer Characteristics:**

- **Spot → Staking**: Instant transfers (no waiting period)
- **Staking → Spot**: 7-day unstaking queue (maximum 5 pending withdrawals per address)

### Delegation System

Hyperliquid implements delegated proof-of-stake with the following characteristics:

**Delegation Mechanics:**

- **1-day lockup period** per validator delegation - Once you delegate tokens to a validator, you must wait 24 hours before you can undelegate those specific tokens. After the lockup expires, you can undelegate partially or fully at any time.
- Undelegation is **instant** (tokens return to staking account immediately, not to spot)
- You can delegate to multiple validators simultaneously
- Minimum validator self-delegation: **10,000 HYPE**

### Reward Mechanics

Hyperliquid's staking rewards follow an Ethereum-inspired model:

**Reward Formula:**

- Reward rate is inversely proportional to the square root of total HYPE staked
- Rewards come from the future emissions reserve

**Distribution Schedule:**

- Rewards **accrue every minute** based on validator performance
- **Distributed daily** to all delegators
- **Auto-compounded** to your delegated stake (no manual claiming required)
- Based on **minimum balance** held during each staking epoch

## Setting Up the Staker

To set up the Hyperliquid Staker, you need to specify the network chain:

```javascript
import { HyperliquidStaker } from '@chorus-one/hyperliquid'

const staker = new HyperliquidStaker({
  chain: 'Testnet' // or 'Mainnet'
})
```

**Configuration Options:**

- `chain`: `'Mainnet'` | `'Testnet'` (required)

The staker uses Hyperliquid's REST API endpoints (`/info` and `/exchange`) and doesn't require RPC connections or additional configuration.

## Building Transactions

Hyperliquid transactions use **EIP-712 typed data signing**, which differs from standard Ethereum transactions. The SDK provides a three-step workflow:

### Transaction Workflow

**1. Build the unsigned transaction:**

```javascript
const { tx } = await staker.buildSpotToStakingTx({
  amount: '100' // Amount in HYPE
})
```

The SDK automatically converts the amounts in HYPE to Hyperliquid's 8-decimal wei format internally.

**2. Sign the transaction:**

```javascript
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0xYourAddress',
  tx
})
```

All Chorus One signers (Fireblocks, Local, etc.) work seamlessly with the Hyperliquid SDK.

**3. Broadcast the signed transaction:**

```javascript
const { txHash } = await staker.broadcast({
  signedTx,
  delegatorAddress: '0xYourAddress'
})

console.log('Transaction hash:', txHash)
```

{% hint style="warning" %}
**Transaction Confirmation**: Hyperliquid's API doesn't provide transaction status queries. Use `getDelegatorHistory()` to verify that your transaction was successfully processed.
{% endhint %}

### Verifying Transaction Success

Since Hyperliquid doesn't support transaction status queries, verify using delegation history:

```javascript
// Wait a few seconds for transaction processing
await new Promise((resolve) => setTimeout(resolve, 1000))

// Check recent history
const history = await staker.getDelegatorHistory({
  delegatorAddress: '0xYourAddress'
})

const recentEvents = history.slice(0, 5)
console.log('Recent events:', recentEvents)
```

## Staking Workflow Example

Here's a complete workflow showing how to stake HYPE tokens to a validator:

```javascript
import { HyperliquidStaker } from '@chorus-one/hyperliquid'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

// 1. Setup
const staker = new HyperliquidStaker({ chain: 'Mainnet' })

const signer = new FireblocksSigner({...})
await signer.init()

const delegatorAddress = '0xYourAddress'
const validatorAddress = '0xValidatorAddress'

// 2. Check current balances
const spotBalances = await staker.getSpotBalances({
  delegatorAddress
})
const hypeBalance = spotBalances.balances.find(b => b.coin === 'HYPE')
console.log('Spot HYPE:', hypeBalance?.total)

const summary = await staker.getStakingSummary({ delegatorAddress })
console.log('Undelegated (staking account):', summary.undelegated)
console.log('Delegated to validators:', summary.delegated)

// 3. Transfer from Spot to Staking (instant)
const { tx: transferTx } = await staker.buildSpotToStakingTx({
  amount: '100'
})

const { signedTx: signedTransfer } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx: transferTx
})

const { txHash: transferHash } = await staker.broadcast({
  signedTx: signedTransfer,
  delegatorAddress
})

console.log('Transfer hash:', transferHash)

// 4. Delegate to validator (1-day lockup starts)
const { tx: stakeTx } = await staker.buildStakeTx({
  validatorAddress,
  amount: '100'
})

const { signedTx: signedStake } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx: stakeTx
})

const { txHash: stakeHash } = await staker.broadcast({
  signedTx: signedStake,
  delegatorAddress
})

console.log('Stake hash:', stakeHash)

// 5. Verify delegation
await new Promise(resolve => setTimeout(resolve, 1000))

const updatedSummary = await staker.getStakingSummary({ delegatorAddress })
console.log('Delegated amount:', updatedSummary.delegated)

// To see individual delegations, use getDelegations()
const delegations = await staker.getDelegations({ delegatorAddress })
console.log('Current delegations:', delegations)
```

## Common Operations

### Query Staking Information

```javascript
// Get complete staking summary
const summary = await staker.getStakingSummary({
  delegatorAddress: '0xYourAddress'
})

console.log('Delegated (staked to validators):', summary.delegated)
console.log('Undelegated (available in staking account):', summary.undelegated)
console.log('Total Pending Withdrawals:', summary.totalPendingWithdrawal)
console.log('Number of Pending Withdrawals:', summary.nPendingWithdrawals)

// Get staking rewards
const rewards = await staker.getDelegatorRewards({
  delegatorAddress: '0xYourAddress'
})

console.log('Rewards by validator:', rewards)
```

### Unstaking Flow

To move staked tokens back to your spot account (two steps required):

```javascript
// Step 1: Undelegate from validator (instant → staking account)
const { tx: unstakeTx } = await staker.buildUnstakeTx({
  validatorAddress: '0xValidatorAddress',
  amount: '50'
})

const { signedTx: signedUnstake } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx: unstakeTx
})

await staker.broadcast({
  signedTx: signedUnstake,
  delegatorAddress
})

// Step 2: Withdraw from staking to spot (7-day queue)
const { tx: withdrawTx } = await staker.buildWithdrawFromStakingTx({
  amount: '50'
})

const { signedTx: signedWithdraw } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx: withdrawTx
})

await staker.broadcast({
  signedTx: signedWithdraw,
  delegatorAddress
})

console.log('Withdrawal initiated - will complete in 7 days')
```

## Next Steps

- Explore detailed method documentation in [Methods](methods.md)
- Review the [HyperliquidStaker API Reference](https://chorus-one.gitbook.io/sdk/docs/classes/hyperliquid_src.HyperliquidStaker)
- Check out the example applications in the SDK repository

## Further Reading

- [Hyperliquid Staking Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/staking)
- [Hyperliquid API Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
