# Methods

This section provides an overview of the key methods available in the **Chorus One Polygon SDK** for staking operations.

The Chorus One SDK supports various staking operations including delegating, undelegating, withdrawing, claiming rewards, and compounding. Below, we explore each method with practical examples to help you get started.

## buildApproveTx

### Description

The `buildApproveTx` method creates a transaction to approve the StakeManager contract to spend POL tokens on behalf of the delegator.

This approval must be executed before staking if the current allowance is insufficient.

### How to Use

To build an approval transaction, you need to specify the amount of POL tokens to approve. You can pass `"max"` for unlimited approval.

### Example

```javascript
const { tx } = await staker.buildApproveTx({
  amount: '1000' // Approve 1000 POL
})

// Or for unlimited approval:
const { tx: unlimitedTx } = await staker.buildApproveTx({
  amount: 'max'
})
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildapprovetx)

---

## buildStakeTx

### Description

The `buildStakeTx` method allows you to create a transaction for staking (delegating) POL tokens with a validator.

Staking tokens involves delegating them to a validator via their ValidatorShare contract, supporting the network's security, and in return, you earn rewards.

> **Note:** Staking automatically claims any pending rewards in the same transaction. The ValidatorShare contract calls `_withdrawAndTransferReward` before executing the stake, so pending rewards are transferred to your wallet and the reward counter resets to 0.

### How to Use

To build a staking transaction, you will need to specify:

- **delegatorAddress**: The delegator's Ethereum address
- **validatorShareAddress**: The validator's ValidatorShare contract address
- **amount**: The amount to stake in POL
- **slippageBps**: Slippage tolerance in basis points (e.g., 50 = 0.5%). Used to calculate minSharesToMint automatically. Exactly one of `slippageBps` or `minSharesToMint` must be provided (not both, no default).
- **minSharesToMint**: Minimum validator shares to receive for slippage protection. Exactly one of `slippageBps` or `minSharesToMint` must be provided (not both, no default).

> **Why is slippage required?** Polygon uses a share-based delegation model where the exchange rate between POL and validator shares fluctuates. The slippage parameter protects against unfavorable rate changes between transaction submission and execution. This is a requirement of the ValidatorShare contract itself.

- **referrer**: (Optional) Custom referrer string for tracking. Defaults to `'sdk-chorusone-staking'`.

### Example

```javascript
import { CHORUS_ONE_POLYGON_VALIDATORS } from '@chorus-one/polygon'

// Using slippageBps for automatic slippage calculation
const { tx } = await staker.buildStakeTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
  amount: '100', // 100 POL
  slippageBps: 50 // 0.5% slippage tolerance
})

// Or using minSharesToMint directly
const { tx: txDirect } = await staker.buildStakeTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
  amount: '100',
  minSharesToMint: 99n * 10n ** 18n
})
```

In this example, we're staking 100 POL with the Chorus One validator.

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildstaketx)

---

## buildUnstakeTx

### Description

The `buildUnstakeTx` method creates a transaction to unstake POL tokens from a validator.

After unstaking, there is an unbonding period of approximately 80 checkpoints (around 3-4 days) before the tokens can be withdrawn.

> **Note:** Unstaking automatically claims any pending rewards in the same transaction. The ValidatorShare contract calls `_withdrawAndTransferReward` before executing the unstake, so pending rewards are transferred to your wallet and the reward counter resets to 0.

### How to Use

To build an unstaking transaction, you need to specify:

- **delegatorAddress**: The address of the delegator
- **validatorShareAddress**: The validator's ValidatorShare contract address
- **amount**: The amount of POL to unstake
- **slippageBps**: Slippage tolerance in basis points (e.g., 50 = 0.5%). Used to calculate maximumSharesToBurn automatically. Exactly one of `slippageBps` or `maximumSharesToBurn` must be provided (not both, no default).
- **maximumSharesToBurn**: Maximum validator shares willing to burn for slippage protection. Exactly one of `slippageBps` or `maximumSharesToBurn` must be provided (not both, no default).

> **Why is slippage required?** Polygon uses a share-based delegation model where the exchange rate between POL and validator shares fluctuates. The slippage parameter protects against unfavorable rate changes between transaction submission and execution. This is a requirement of the ValidatorShare contract itself.

- **referrer**: (Optional) Custom referrer string for tracking. Defaults to `'sdk-chorusone-staking'`.

### Example

```javascript
// Using slippageBps for automatic slippage calculation
const { tx } = await staker.buildUnstakeTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
  amount: '50', // 50 POL
  slippageBps: 50 // 0.5% slippage tolerance
})

// Or using maximumSharesToBurn directly
const { tx: txDirect } = await staker.buildUnstakeTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
  amount: '50',
  maximumSharesToBurn: 51n * 10n ** 18n
})
```

In this example, we are creating an unbond request to unstake 50 POL.

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildunstaketx)

---

## buildWithdrawTx

### Description

The `buildWithdrawTx` method creates a transaction to claim unstaked POL tokens after the unbonding period has elapsed.

You can use `getUnbond()` to check if the unbonding period is complete and `getUnbondNonce()` to get the latest unbond nonce.

### Understanding Unbond Nonces

Each unstake operation creates a **separate unbond request** with its own nonce. Unbonds are NOT batched together.

- Nonces are incremental per delegator, starting from 1
- First unstake = nonce 1, second unstake = nonce 2, etc.
- Each unbond has its own 80-checkpoint countdown
- Withdrawals must be done separately for each nonce

**Example scenario:**

- Day 1: Unstake 100 POL → creates unbond nonce 1 (withdrawable ~Day 4)
- Day 2: Unstake 50 POL → creates unbond nonce 2 (withdrawable ~Day 5)
- Day 4: You can withdraw nonce 1, but nonce 2 is still locked
- Day 5: Now you can withdraw nonce 2

### How to Use

To build a withdrawal transaction, you need to specify the delegator's address, the validator's ValidatorShare contract address, and the specific unbond nonce to withdraw.

### Example

```javascript
// Get the latest unbond nonce
const latestNonce = await staker.getUnbondNonce({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})

// Withdraw a specific unbond (e.g., the latest one)
const { tx } = await staker.buildWithdrawTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
  unbondNonce: latestNonce
})
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildwithdrawtx)

---

## buildClaimRewardsTx

### Description

The `buildClaimRewardsTx` method creates a transaction to claim accumulated delegation rewards.

The rewards are sent directly to the delegator's wallet.

### How to Use

To build a claim rewards transaction, you need to specify:

- **delegatorAddress**: The delegator's address that will receive the rewards
- **validatorShareAddress**: The validator's ValidatorShare contract address
- **referrer**: (Optional) Custom referrer string for tracking. Defaults to `'sdk-chorusone-staking'`.

### Example

```javascript
const { tx } = await staker.buildClaimRewardsTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildclaimrewardstx)

---

## buildCompoundTx

### Description

The `buildCompoundTx` method creates a transaction to compound (restake) accumulated rewards.

This restakes your rewards back into the validator, increasing your delegation without requiring new tokens.

### How to Use

To build a compound transaction, you need to specify:

- **delegatorAddress**: The delegator's address
- **validatorShareAddress**: The validator's ValidatorShare contract address
- **referrer**: (Optional) Custom referrer string for tracking. Defaults to `'sdk-chorusone-staking'`.

### Example

```javascript
const { tx } = await staker.buildCompoundTx({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#buildcompoundtx)

---

## getStake

### Description

The `getStake` method retrieves the staking information for a specified delegator, including the amount of POL tokens currently staked with a specified validator.

Returns:

- `balance`: Total staked amount formatted in POL
- `shares`: Total shares held by the delegator
- `exchangeRate`: Current exchange rate between shares and POL

### How to Use

To get staking information, you will need to provide the delegator's address and the validator's ValidatorShare contract address.

### Example

```javascript
const { balance, shares, exchangeRate } = await staker.getStake({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})

console.log(`Staked balance: ${balance} POL`)
console.log(`Shares held: ${shares}`)
console.log(`Exchange rate: ${exchangeRate}`)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getstake)

---

## getLiquidRewards

### Description

The `getLiquidRewards` method retrieves the pending rewards available to claim for a delegator.

### How to Use

To get pending rewards, you will need to provide the delegator's address and the validator's ValidatorShare contract address.

### Example

```javascript
const rewards = await staker.getLiquidRewards({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})

console.log(`Pending rewards: ${rewards} POL`)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getliquidrewards)

---

## getUnbondNonce

### Description

The `getUnbondNonce` method retrieves the latest unbond nonce for a delegator.

The nonce represents the total number of unstake operations performed by the delegator. Each unstake creates a new unbond request with an incrementing nonce (starting from 1).

For example, if `getUnbondNonce()` returns `3n`, the delegator has performed 3 unstake operations, with unbonds stored at nonces 1, 2, and 3.

### How to Use

To get the unbond nonce, you will need to provide the delegator's address and the validator's ValidatorShare contract address.

### Example

```javascript
const latestNonce = await staker.getUnbondNonce({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})

console.log(`Total unstake operations: ${latestNonce}`)
// To check all unbonds, iterate from 1 to latestNonce
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getunbondnonce)

---

## getUnbond

### Description

The `getUnbond` method retrieves information about a specific unbond request.

Returns:

- `amount`: The amount pending withdrawal in POL.
- `isWithdrawable`: Whether the unbond can be withdrawn now.
- `shares`: The shares amount pending withdrawal. Returns `0n` if the unbond has already been withdrawn or doesn't exist.
- `withdrawEpoch`: The epoch when the unbond was created. The unbond becomes claimable at `withdrawEpoch + withdrawalDelay`.

### How to Use

To get unbond information, you will need to provide the delegator's address, the validator's ValidatorShare contract address, and the specific unbond nonce to query.

### Example

```javascript
const unbond = await staker.getUnbond({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
  unbondNonce: 1n
})

if (unbond.shares === 0n) {
  console.log('Unbond already withdrawn or does not exist')
} else if (unbond.isWithdrawable) {
  console.log(`Ready to withdraw ${unbond.amount} POL!`)
} else {
  console.log(`${unbond.amount} POL pending, not yet withdrawable`)
}
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getunbond)

---

## getUnbonds

### Description

The `getUnbonds` method retrieves unbond request information for multiple nonces efficiently in a single RPC call.

This is more efficient than calling `getUnbond()` multiple times when you need to check several unbond requests.

### How to Use

To get multiple unbond information, provide the delegator's address, the validator's ValidatorShare contract address, and an array of unbond nonces to query.

### Example

```javascript
// Get the latest nonce first
const latestNonce = await staker.getUnbondNonce({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet
})

// Fetch all unbonds at once
const nonces = Array.from({ length: Number(latestNonce) }, (_, i) => BigInt(i + 1))
const unbonds = await staker.getUnbonds({
  delegatorAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  validatorShareAddress: CHORUS_ONE_POLYGON_VALIDATORS.mainnet,
  unbondNonces: nonces
})

unbonds.forEach((unbond, i) => {
  if (unbond.shares > 0n) {
    console.log(`Unbond ${i + 1}: ${unbond.amount} POL, withdrawable: ${unbond.isWithdrawable}`)
  }
})
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getunbonds)

---

## getEpoch

### Description

The `getEpoch` method retrieves the current checkpoint epoch from the StakeManager contract.

This can be used in combination with `getWithdrawalDelay()` to check if an unbonding period has elapsed.

### How to Use

Call the method without any parameters to get the current epoch.

### Example

```javascript
const currentEpoch = await staker.getEpoch()

console.log(`Current epoch: ${currentEpoch}`)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getepoch)

---

## getWithdrawalDelay

### Description

The `getWithdrawalDelay` method retrieves the withdrawal delay from the StakeManager contract.

The withdrawal delay is the number of epochs that must pass after an unbond request before the funds can be withdrawn (~80 checkpoints, approximately 3-4 days).

### How to Use

Call the method without any parameters to get the withdrawal delay.

### Example

```javascript
const withdrawalDelay = await staker.getWithdrawalDelay()

console.log(`Withdrawal delay: ${withdrawalDelay} epochs`)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getwithdrawaldelay)

---

## getAllowance

### Description

The `getAllowance` method retrieves the current POL token allowance for the StakeManager contract.

Use this to check if approval is needed before staking.

### How to Use

To get the allowance, provide the token owner's address.

### Example

```javascript
const allowance = await staker.getAllowance('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')

console.log(`Current allowance: ${allowance} POL`)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getallowance)

---

## getExchangeRatePrecision

### Description

The `getExchangeRatePrecision` method retrieves the exchange rate precision for a validator.

Foundation validators (ID < 8) use a precision of `100`, while all other validators use `10^29`. This is relevant when performing manual share/amount calculations.

### How to Use

Provide the validator's ValidatorShare contract address.

### Example

```javascript
const precision = await staker.getExchangeRatePrecision(CHORUS_ONE_POLYGON_VALIDATORS.mainnet)

console.log(`Exchange rate precision: ${precision}`)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#getexchangerateprecision)

---

## sign

### Description

The `sign` method signs a transaction using the provided signer (e.g., Fireblocks, local mnemonic).

### How to Use

To sign a transaction, you need to specify:

- **signer**: A signer instance (e.g., `FireblocksSigner`, `LocalSigner`)
- **signerAddress**: The address of the signer
- **tx**: The transaction to sign (from any `build*Tx` method)
- **baseFeeMultiplier**: (Optional) Multiplier applied to the base fee per gas from the latest block to determine `maxFeePerGas`. Defaults to `1.2`.
- **defaultPriorityFee**: (Optional) Overrides the `maxPriorityFeePerGas` estimated by the RPC, specified in ETH (e.g., `'0.000000001'` for 1 gwei).

### Example

```javascript
const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  tx,
  baseFeeMultiplier: 1.5, // 1.5x base fee for faster inclusion
  defaultPriorityFee: '0.000000002' // 2 gwei priority fee
})
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#sign)

---

## broadcast

### Description

The `broadcast` method broadcasts a signed transaction to the Polygon network.

### How to Use

Pass the signed transaction hex string returned by the `sign` method.

### Parameters

- **signedTx** (Hex): The signed transaction to broadcast

### Example

```javascript
const { txHash } = await staker.broadcast({ signedTx })

console.log('Transaction hash:', txHash)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#broadcast)

---

## getTxStatus

### Description

The `getTxStatus` method retrieves the status of a transaction using the transaction hash.

### How to Use

Provide the transaction hash received from the `broadcast` method.

### Parameters

- **txHash** (Hex): The transaction hash to query

### Returns

Returns the transaction status including:

- **status** (string): Transaction status (`'success'`, `'failure'`, or `'unknown'`)
- **receipt** (object): The full transaction receipt (when available)

### Example

```javascript
const txStatus = await staker.getTxStatus({ txHash })

console.log('Transaction status:', txStatus.status)
```

- [Read more in the API Reference](../../docs/classes/polygon_src.PolygonStaker.md#gettxstatus)

---

## Exported Constants

The `@chorus-one/polygon` package exports the following constants:

| Constant                        | Description                                                          |
| ------------------------------- | -------------------------------------------------------------------- |
| `CHORUS_ONE_POLYGON_VALIDATORS` | Chorus One ValidatorShare contract addresses for mainnet and testnet |
| `NETWORK_CONTRACTS`             | StakeManager and staking token contract addresses per network        |
| `VALIDATOR_SHARE_ABI`           | ABI for the ValidatorShare contract                                  |
| `STAKE_MANAGER_ABI`             | ABI for the StakeManager contract                                    |
| `EXCHANGE_RATE_PRECISION`       | Exchange rate precision for foundation validators (`100n`)           |
| `EXCHANGE_RATE_HIGH_PRECISION`  | Exchange rate precision for non-foundation validators (`10n ** 29n`) |

---

## Exported Types

The following TypeScript types are exported:

| Type                   | Description                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `PolygonNetworkConfig` | Configuration for initializing `PolygonStaker` (`network`, `rpcUrl`)                              |
| `Transaction`          | Transaction object returned by `build*Tx` methods (`to`, `data`, `value`)                         |
| `PolygonTxStatus`      | Transaction status from `getTxStatus` (`status`, `receipt`)                                       |
| `StakeInfo`            | Staking info from `getStake` (`balance`, `shares`, `exchangeRate`)                                |
| `UnbondInfo`           | Unbond info from `getUnbond`/`getUnbonds` (`amount`, `isWithdrawable`, `shares`, `withdrawEpoch`) |
| `PolygonNetworks`      | Network type: `'mainnet'` or `'testnet'`                                                          |
| `NetworkContracts`     | Contract addresses type (`stakeManagerAddress`, `stakingTokenAddress`)                            |

---

## Further Reading

For more detailed information and additional methods, please refer to the official API reference:

- [PolygonStaker API Reference](../../docs/classes/polygon_src.PolygonStaker.md)

---

This guide aims to simplify the process of using the Chorus One Polygon SDK for staking operations.

- Please follow the provided examples to integrate these functionalities into your applications.
