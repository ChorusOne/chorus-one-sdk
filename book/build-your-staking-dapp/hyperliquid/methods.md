# Methods

This section provides detailed documentation for all methods available in the **HyperliquidStaker** class. Each method includes parameters, return values, and practical examples.

---

## buildSpotToStakingTx

Builds a transaction to transfer HYPE tokens from your spot account to your staking account. This transfer is instant and is the first step before you can delegate tokens to validators.

### Parameters

| Parameter | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| `amount`  | string | Yes      | Amount in human-readable HYPE tokens (e.g., '100') |

### Response

```typescript
{
  tx: UnsignedTx // Transaction object for signing
}
```

### Example

```javascript
const { tx } = await staker.buildSpotToStakingTx({
  amount: '100' // Transfer 100 HYPE to staking account
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0xYourAddress',
  tx
})

const { txHash } = await staker.broadcast({
  signedTx,
  delegatorAddress: '0xYourAddress'
})

console.log('Transfer transaction hash:', txHash)
```

{% hint style="info" %}
Transfers from spot to staking are **instant**. Once confirmed, the balance immediately appears in your staking account.
{% endhint %}

**Further Reading**

- [HyperliquidStaker API Reference](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint#deposit-into-staking)

---

## buildWithdrawFromStakingTx

Builds a transaction to transfer HYPE tokens from your staking account back to your spot account. Withdrawals enter a 7-day unstaking queue, and each address can have a maximum of 5 pending withdrawals.

### Parameters

| Parameter | Type   | Required | Description                                       |
| --------- | ------ | -------- | ------------------------------------------------- |
| `amount`  | string | Yes      | Amount in human-readable HYPE tokens (e.g., '50') |

### Response

```typescript
{
  tx: UnsignedTx // Transaction object for signing
}
```

### Example

```javascript
const { tx } = await staker.buildWithdrawFromStakingTx({
  amount: '50' // Withdraw 50 HYPE to spot account
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0xYourAddress',
  tx
})

const { txHash } = await staker.broadcast({
  signedTx,
  delegatorAddress: '0xYourAddress'
})

console.log('Withdrawal initiated, will complete in 7 days')
```

{% hint style="warning" %}
**Withdrawal Limits:**

- Each withdrawal takes exactly **7 days** from submission time
- Maximum of **5 pending withdrawals** per address
- You must have sufficient **unstaked balance** in your staking account (undelegate from validators first if needed)
  {% endhint %}

**Further Reading**

- [HyperliquidStaker API Reference](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint#withdraw-from-staking)

---

## buildStakeTx

Builds a transaction to delegate (stake) HYPE tokens from your staking account to a validator. Each delegation has a 1-day lockup period before it can be undelegated.

### Parameters

| Parameter          | Type   | Required | Description                                        |
| ------------------ | ------ | -------- | -------------------------------------------------- |
| `validatorAddress` | string | Yes      | Validator's Ethereum address (0x...)               |
| `amount`           | string | Yes      | Amount in human-readable HYPE tokens (e.g., '100') |

### Response

```typescript
{
  tx: UnsignedTx // Transaction object for signing
}
```

### Example

```javascript
const validatorAddress = '0xValidatorAddress'

const { tx } = await staker.buildStakeTx({
  validatorAddress,
  amount: '100' // Stake 100 HYPE to this validator
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0xYourAddress',
  tx
})

const { txHash } = await staker.broadcast({
  signedTx,
  delegatorAddress: '0xYourAddress'
})

console.log('Delegation transaction hash:', txHash)

// Verify delegation after a few seconds
await new Promise((resolve) => setTimeout(resolve, 3000))

const summary = await staker.getStakingSummary({
  delegatorAddress: '0xYourAddress'
})

const delegation = summary.delegations.find((d) => d.validatorAddress === validatorAddress)
console.log('Staked amount:', delegation?.amount)
```

{% hint style="info" %}
**Delegation Considerations:**

- Each delegation has a **1-day lockup** per validator
- You can delegate to **multiple validators** simultaneously
- Choose validators carefully - rewards depend on **validator performance and uptime**
- Jailed validators don't generate rewards for delegators
- Validators charge **commissions** on rewards (capped at 1% increase per update)
  {% endhint %}

**Further Reading**

- [HyperliquidStaker API Reference](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint#delegate-or-undelegate-stake-from-validator)

---

## buildUnstakeTx

Builds a transaction to undelegate (unstake) HYPE tokens from a validator. Undelegation is instant - tokens immediately return to your staking account (not your spot account).

### Parameters

| Parameter          | Type   | Required | Description                                       |
| ------------------ | ------ | -------- | ------------------------------------------------- |
| `validatorAddress` | string | Yes      | Validator's Ethereum address (0x...)              |
| `amount`           | string | Yes      | Amount in human-readable HYPE tokens (e.g., '25') |

### Response

```typescript
{
  tx: UnsignedTx // Transaction object for signing
}
```

### Example

```javascript
const { tx } = await staker.buildUnstakeTx({
  validatorAddress: '0xValidatorAddress',
  amount: '25' // Undelegate 25 HYPE from this validator
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0xYourAddress',
  tx
})

const { txHash } = await staker.broadcast({
  signedTx,
  delegatorAddress: '0xYourAddress'
})

console.log('Undelegation complete - tokens returned to staking account')
```

{% hint style="warning" %}
**Important:** Undelegation only moves HYPE back to your **staking account**, not your spot account. To move tokens to your spot account, you must also call `buildWithdrawFromStakingTx()` which has a 7-day waiting period.
{% endhint %}

**Complete Unstaking Flow:**

```javascript
// Step 1: Undelegate from validator (instant)
const { tx: unstakeTx } = await staker.buildUnstakeTx({
  validatorAddress: '0xValidatorAddress',
  amount: '25'
})

const { signedTx: signedUnstake } = await staker.sign({
  signer,
  signerAddress: '0xYourAddress',
  tx: unstakeTx
})

await staker.broadcast({
  signedTx: signedUnstake,
  delegatorAddress: '0xYourAddress'
})

// Step 2: Withdraw to spot account (7-day queue)
const { tx: withdrawTx } = await staker.buildWithdrawFromStakingTx({
  amount: '25'
})

const { signedTx: signedWithdraw } = await staker.sign({
  signer,
  signerAddress: '0xYourAddress',
  tx: withdrawTx
})

await staker.broadcast({
  signedTx: signedWithdraw,
  delegatorAddress: '0xYourAddress'
})
```

**Further Reading**

- [HyperliquidStaker API Reference](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint#delegate-or-undelegate-stake-from-validator)

---

## getStakingSummary

Retrieves a summary of staking information for an address, including total delegated amount, undelegated balance in staking account, and pending withdrawals. This is a read-only operation with no gas costs.

### Parameters

| Parameter          | Type   | Required | Description              |
| ------------------ | ------ | -------- | ------------------------ |
| `delegatorAddress` | string | Yes      | Address to query (0x...) |

### Response

```typescript
{
  delegated: string // Total HYPE delegated to validators (string with 8 decimals)
  undelegated: string // HYPE available in staking account (string with 8 decimals)
  totalPendingWithdrawal: string // Total HYPE in 7-day withdrawal queue (string with 8 decimals)
  nPendingWithdrawals: number // Number of pending withdrawal requests (max 5)
}
```

### Example

```javascript
const summary = await staker.getStakingSummary({
  delegatorAddress: '0xYourAddress'
})

console.log('Delegated to validators:', summary.delegated, 'HYPE')
console.log('Available in staking account:', summary.undelegated, 'HYPE')
console.log('Pending withdrawals:', summary.totalPendingWithdrawal, 'HYPE')
console.log('Number of pending withdrawals:', summary.nPendingWithdrawals, '/ 5')

// Calculate total HYPE in staking system
const totalInStaking = (
  parseFloat(summary.delegated) +
  parseFloat(summary.undelegated) +
  parseFloat(summary.totalPendingWithdrawal)
).toFixed(8)

console.log('Total in staking system:', totalInStaking, 'HYPE')
```

{% hint style="info" %}
This method provides a high-level overview of your staking position. To see individual delegations by validator, use `getDelegations()`. Note that this doesn't include your spot account balance - use `getSpotBalances()` for that.
{% endhint %}

**Further Reading**

- [HyperliquidStaker API Reference](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#query-a-users-staking-summary)

---

## getDelegations

Retrieves all active delegations for an address, showing individual validator delegations with amounts and lockup status. This is a read-only operation with no gas costs.

### Parameters

| Parameter          | Type   | Required | Description              |
| ------------------ | ------ | -------- | ------------------------ |
| `delegatorAddress` | string | Yes      | Address to query (0x...) |

### Response

```typescript
Array<{
  validator: string // Validator's Ethereum address
  amount: string // Delegated amount (string with 8 decimals)
  lockedUntilTimestamp: number // Unix timestamp when delegation lock expires
}>
```

### Example

```javascript
const delegations = await staker.getDelegations({
  delegatorAddress: '0xYourAddress'
})

console.log('Active Delegations:')
delegations.forEach((delegation, index) => {
  console.log(`\nDelegation ${index + 1}:`)
  console.log(`  Validator: ${delegation.validator}`)
  console.log(`  Amount: ${delegation.amount} HYPE`)

  const lockExpiry = new Date(delegation.lockedUntilTimestamp * 1000)
  const isLocked = Date.now() < delegation.lockedUntilTimestamp * 1000

  console.log(`  Lock Status: ${isLocked ? 'Locked' : 'Unlocked'}`)
  console.log(`  Lock Expires: ${lockExpiry.toISOString()}`)
})

// Calculate total delegated
const totalDelegated = delegations.reduce((sum, d) => {
  return sum + parseFloat(d.amount)
}, 0)

console.log(`\nTotal Delegated: ${totalDelegated.toFixed(8)} HYPE`)
```

{% hint style="info" %}
**Lockup Status**: Each delegation has a `lockedUntilTimestamp`. If the current time is before this timestamp, you must wait before undelegating. After the lockup expires, you can undelegate any amount at any time.
{% endhint %}

**Further Reading**

- [HyperliquidStaker API Reference](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#query-a-users-staking-delegations)

---

## getSpotBalances

Retrieves spot account balances for all tokens, including HYPE and USDC. This is a read-only operation with no gas costs.

### Parameters

| Parameter          | Type   | Required | Description              |
| ------------------ | ------ | -------- | ------------------------ |
| `delegatorAddress` | string | Yes      | Address to query (0x...) |

### Response

```typescript
{
  balances: Array<{
    coin: string // Token symbol ('HYPE', 'USDC', etc.)
    hold: string // Amount held in open orders
    total: string // Total balance including held amounts
  }>
}
```

### Example

```javascript
const { balances } = await staker.getSpotBalances({
  delegatorAddress: '0xYourAddress'
})

// Find HYPE balance
const hypeBalance = balances.find((b) => b.coin === 'HYPE')
if (hypeBalance) {
  console.log('HYPE Total:', hypeBalance.total)
  console.log('HYPE In Orders:', hypeBalance.hold)
  console.log('HYPE Available:', (parseFloat(hypeBalance.total) - parseFloat(hypeBalance.hold)).toFixed(8))
}

// Find USDC balance
const usdcBalance = balances.find((b) => b.coin === 'USDC')
if (usdcBalance) {
  console.log('USDC Balance:', usdcBalance.total)
}

// Display all balances
console.log('\nAll Balances:')
balances.forEach((balance) => {
  console.log(`${balance.coin}: ${balance.total}`)
})
```

{% hint style="info" %}
The `hold` field represents tokens locked in open trading orders. To calculate available balance for transfers, subtract `hold` from `total`.
{% endhint %}

**Further Reading**

- [HyperliquidStaker API Reference](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/spot#retrieve-a-users-token-balances)

---

## getDelegatorRewards

Retrieves staking rewards history for a delegator. This is a read-only operation with no gas costs.

### Parameters

| Parameter          | Type   | Required | Description              |
| ------------------ | ------ | -------- | ------------------------ |
| `delegatorAddress` | string | Yes      | Address to query (0x...) |

### Response

```typescript
Array<{
  time: number // Unix timestamp of reward
  source: 'delegation' | 'commission' // Source of reward
  totalAmount: string // Total reward amount (string with 8 decimals)
}>
```

### Example

```javascript
const rewards = await staker.getDelegatorRewards({
  delegatorAddress: '0xYourAddress'
})

console.log('Staking Rewards History:')
rewards.slice(0, 10).forEach((reward, index) => {
  const date = new Date(reward.time * 1000)
  console.log(`\nReward ${index + 1}:`)
  console.log(`  Time: ${date.toISOString()}`)
  console.log(`  Source: ${reward.source}`)
  console.log(`  Amount: ${reward.totalAmount} HYPE`)
})

// Calculate total rewards
const totalRewards = rewards.reduce((sum, r) => {
  return sum + parseFloat(r.totalAmount)
}, 0)

console.log(`\nTotal Rewards: ${totalRewards.toFixed(8)} HYPE`)
```

{% hint style="info" %}
**Reward Distribution:**

- Rewards **accrue every minute** based on validator performance
- **Distributed daily** to all delegators
- **Auto-compounded** to your delegated stake (no manual claiming required)
- Based on **minimum balance** held during each staking epoch (100k rounds ~90 minutes)
- Reward rate: ~2.37% APY at 400M total HYPE staked (inversely proportional to √total_staked)
  {% endhint %}

**Further Reading**

- [HyperliquidStaker API Reference](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#query-a-users-staking-rewards)

---

## getDelegatorHistory

Retrieves the complete delegation event history for an address. This method is essential for verifying transaction success since Hyperliquid doesn't provide transaction status queries.

### Parameters

| Parameter          | Type   | Required | Description              |
| ------------------ | ------ | -------- | ------------------------ |
| `delegatorAddress` | string | Yes      | Address to query (0x...) |

### Response

```typescript
Array<DelegationHistoryEvent> // Array of delegation events
```

### Example

```javascript
const history = await staker.getDelegatorHistory({
  delegatorAddress: '0xYourAddress'
})

console.log('Recent Delegation History:')
history.slice(0, 10).forEach((event, index) => {
  console.log(`Event ${index + 1}:`, event)
})

// Verify a recent transaction
const recentEvent = history[0]
console.log('Most recent event:', recentEvent)
```

**Verifying Transaction Success:**

```javascript
// After broadcasting a transaction
const { txHash } = await staker.broadcast({
  signedTx,
  delegatorAddress: '0xYourAddress'
})

console.log('Transaction submitted:', txHash)

// Wait for processing
await new Promise((resolve) => setTimeout(resolve, 3000))

// Check history for confirmation
const history = await staker.getDelegatorHistory({
  delegatorAddress: '0xYourAddress'
})

const recentEvents = history.slice(0, 5)
console.log('Recent events:', recentEvents)

// You can check if your expected event appears in recent history
```

{% hint style="warning" %}
**Transaction Confirmation:** Hyperliquid's API doesn't provide transaction status queries by hash. Always use `getDelegatorHistory()` to verify that your transaction was successfully processed. Wait 2-3 seconds after broadcasting before checking history.
{% endhint %}

**Further Reading**

- [HyperliquidStaker API Reference](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#query-a-users-staking-history)

---

## sign

Signs an unsigned transaction using EIP-712 typed data signing. This method works with any Chorus One signer (Fireblocks, Local, etc.).

### Parameters

| Parameter       | Type       | Required | Description                                           |
| --------------- | ---------- | -------- | ----------------------------------------------------- |
| `signer`        | Signer     | Yes      | Signer instance (FireblocksSigner, LocalSigner, etc.) |
| `signerAddress` | string     | Yes      | Address performing the signature (0x...)              |
| `tx`            | UnsignedTx | Yes      | Transaction object from buildXxxTx methods            |

### Response

```typescript
{
  signedTx: string // Hex-encoded signature ready for broadcast
}
```

### Example

**Using Fireblocks Signer:**

```javascript
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret',
  apiKey: 'your-api-key',
  vaultName: 'your-vault',
  assetId: 'ETH',
  addressDerivationFn: HyperliquidStaker.getAddressDerivationFn()
})

await signer.init()

const { tx } = await staker.buildStakeTx({
  validatorAddress: '0xValidatorAddress',
  amount: '100'
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0xYourAddress',
  tx
})

console.log('Signed transaction:', signedTx)
```

**Using Local Signer:**

```javascript
import { LocalSigner } from '@chorus-one/signer-local'

const signer = new LocalSigner({
  privateKey: 'your-private-key',
  addressDerivationFn: HyperliquidStaker.getAddressDerivationFn()
})

await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0xYourAddress',
  tx
})
```

{% hint style="info" %}
Hyperliquid uses **EIP-712 typed data signing**, not standard Ethereum transactions. The `sign()` method handles the EIP-712 formatting automatically.
{% endhint %}

**Further Reading**

- [Signer Documentation](https://chorus-one.gitbook.io/sdk/signers-explained/what-is-a-signer)

---

## broadcast

Broadcasts a signed transaction to the Hyperliquid network. Returns a transaction hash.

### Parameters

| Parameter          | Type   | Required | Description                                 |
| ------------------ | ------ | -------- | ------------------------------------------- |
| `signedTx`         | string | Yes      | Signed transaction from sign() method       |
| `delegatorAddress` | string | Yes      | Address that signed the transaction (0x...) |

### Response

```typescript
{
  txHash: string // Transaction hash
}
```

### Example

```javascript
const { tx } = await staker.buildSpotToStakingTx({
  amount: '100'
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0xYourAddress',
  tx
})

const { txHash } = await staker.broadcast({
  signedTx,
  delegatorAddress: '0xYourAddress'
})

console.log('Transaction hash:', txHash)
```

**Further Reading**

- [HyperliquidStaker Exchange API Reference](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint)

---

**Complete Transaction Flow:**

```javascript
async function executeStakingTransaction(staker, signer, delegatorAddress) {
  // 1. Build transaction
  const { tx } = await staker.buildStakeTx({
    validatorAddress: '0xValidatorAddress',
    amount: '100'
  })

  // 2. Sign transaction
  const { signedTx } = await staker.sign({
    signer,
    signerAddress: delegatorAddress,
    tx
  })

  // 3. Broadcast transaction
  const { txHash } = await staker.broadcast({
    signedTx,
    delegatorAddress
  })

  console.log('Transaction broadcasted:', txHash)

  const summary = await staker.getStakingSummary({ delegatorAddress })
  console.log('Updated delegations:', summary.delegations)

  return txHash
}
```

{% hint style="warning" %}
**Important Limitations:**

- Transaction hash **cannot be used** to query transaction status
- Hyperliquid API doesn't provide tx status endpoints
- Use `getDelegatorHistory()` to verify transaction success
  {% endhint %}

**Error Handling:**

```javascript
try {
  const { txHash } = await staker.broadcast({
    signedTx,
    delegatorAddress: '0xYourAddress'
  })

  console.log('Success:', txHash)
} catch (error) {
  console.error('Broadcast failed:', error.message)

  // Common errors:
  // - Insufficient balance
  // - Invalid signature
  // - Network connectivity issues
  // - API rate limiting
}
```

**Further Reading**

- [Hyperliquid Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs)
