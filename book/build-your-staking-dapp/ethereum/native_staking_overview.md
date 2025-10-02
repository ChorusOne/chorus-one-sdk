This section provides an overview of the key methods available in the **Chorus One SDK** for **Native Staking** on the Ethereum network.

The Chorus One Native Staking SDK supports a range of staking operations including creating validator batches, retrieving batch status, exporting deposit data, building deposit transactions, and submitting validator exits. Below, we will explore each method with practical examples to help you get started.

## Setting Up the Staker

To get started with staking on the Ethereum network using the Chorus One SDK, you will first need to initialize the SDK.

- **Note:** For testing purposes, we will use the Hoodi testnet.

First, create an instance of `EthereumStaker` with the necessary configuration:

```javascript
import { EthereumStaker } from '@chorus-one/ethereum'

const staker = new EthereumStaker({
  network: 'hoodi',
  rpcUrl: 'https://ethereum-hoodi-rpc.publicnode.com',
  nativeStakingApiToken: 'your-auth-token' // Get this from Chorus One
})
```

**Configuration Parameters**:

- **network**: The Ethereum network to connect to. It can be `mainnet` or `hoodi`.
- **rpcUrl**: (Optional) The URL of the Ethereum network RPC endpoint. This is where the SDK will connect to interact with the network. If not provided, the SDK will use the public RPC endpoint for the specified network.
- **nativeStakingApiToken**: Your authentication token for accessing the Chorus One Native Staking API. You can obtain this token by reaching out to our team

---

## Initializing the Staker

After configuring the `EthereumStaker`, initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init()
```

The `init` method establishes a connection with the configured RPC endpoint and prepares the staker for operations such as building and broadcasting transactions.

---

## createValidatorBatch

### Description

The `createValidatorBatch` method creates a new batch of validators with each validator requires 32 ETH to be deposited. The batch will generate deposit data that can be used to deposit validators on the Ethereum network.

### How to Use

To create validators, you need to specify a UUID batch id, an Ethereum withdrawal address, a fee recipient address, the number of validators, and an authentication token received from our team.

**Note**: A single batch request can not exceed 200 validators, if you need more, please issue multiple batch requests.

### Example

```javascript
const result = await staker.createValidatorBatch({
  batchId: '4da22c97-b7d5-4e31-8c3a-03870ebc7b20',
  withdrawalAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  feeRecipientAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  numberOfValidators: 2
})
```

In this example, we're staking 64 ETH with two validators in a batch.

---

## getValidatorBatchStatus

### Description

The `getValidatorBatchStatus` method retrieves the current status of a validator batch, including the deposit data for each validator when ready.

### How to Use

To retrieve the status of a validator batch, you need to specify the batch id of the validator batch.

### Example

```javascript
const status = await staker.getValidatorBatchStatus({ batchId: '4da22c97-b7d5-4e31-8c3a-03870ebc7b20' })
```

---

## listValidatorBatches

### Description

The `listValidatorBatches` method retrieves all validator batches that have been created for the authenticated tenant. This method is useful for getting an overview of all your validator batches and their current status.

### How to Use

This method doesn't require any parameters and returns a list of all validator batches associated with your API token.

### Example

```javascript
const batches = await staker.listValidatorBatches()
```

---

## exportDepositData

### Description

The `exportDepositData` method retrieves the deposit data for a batch and formats it for use with the official Ethereum Staking Launchpad or other deposit tools.

### How to Use

To export the deposit data for a batch, you need to provide the batch data object. This is typically obtained from `getValidatorBatchStatus` method.

### Example

```javascript
// First get the batch data
const batchData = await staker.getValidatorBatchStatus({ batchId: '4da22c97-b7d5-4e31-8c3a-03870ebc7b20' })

// Then export the deposit data
const { depositData } = await staker.exportDepositData({ batchData })
```

---

## buildDepositTx

### Description

The `buildDepositTx` method creates transactions for depositing validators to the Ethereum deposit contract. Each validator requires exactly 32 ETH to be deposited along with the deposit data.

### How to Use

To build the deposit transaction for a batch, you need to provide the batch data object. This is typically obtained from `getValidatorBatchStatus` method.

### Example

```javascript
// First get the batch data
const batchData = await staker.getValidatorBatchStatus({ batchId: '4da22c97-b7d5-4e31-8c3a-03870ebc7b20' })

// Then build the deposit transactions
const { transactions } = await staker.buildDepositTx({ batchData })
```

---

## buildValidatorExitTx

### Description

The `buildValidatorExitTx` method creates a withdrawal request transaction for exiting validators from the Ethereum network based on [EIP-7002](https://eips.ethereum.org/EIPS/eip-7002). This method triggers a full validator exit through the execution layer withdrawal credentials (0x01).

### How to Use

To build the exit transaction for a validator, you need to provide the validator's public key. A validator can only exit if it is eligible to do so, which means it must have been active for at least 256 epochs.

**Parameters:**

- `validatorPubkey` (required): The validator's public key (48 bytes)
- `value` (optional): The amount of ETH to send with the transaction. Defaults to **1 wei** (the minimum valid fee)

**Important:** The default value of 1 wei is sufficient for most cases since validator exits are processed through the consensus layer. You only need to provide a custom `value` if you want to ensure priority processing during periods of high withdrawal request volume.

### Example

```javascript
// Build exit transaction with default fee (1 wei)
const { tx } = await staker.buildValidatorExitTx({
  validatorPubkey: '8c3a5e3f4b2c1d6e7f8a9b0c1d2e3f4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f'
})
```

### Understanding Withdrawal Request Fees

EIP-7002 implements a dynamic fee mechanism for withdrawal requests that grows **exponentially** based on the withdrawal queue length.

When the withdrawal queue is congested (many pending requests), this exponential calculation can result in extremely high fees (potentially thousands of ETH). However, for normal validator exits:

- **Most validator exits use 1 wei**: Since validators exit through the consensus layer, the minimum fee is typically sufficient
- **High fees only apply during congestion**: The exponential fee mechanism is designed to prevent spam during high-demand periods
- **You can calculate fees beforehand**: Use the `getWithdrawalQueue` utility (see below) if you need to check current fees

⚠️ **Warning:** Do not blindly use the fee returned by `getWithdrawalQueue` during periods of high congestion, as it may be unnecessarily high. The default 1 wei value is recommended unless you have a specific need for priority processing.

---

## getWithdrawalQueue

### Description

The `getWithdrawalQueue` utility function allows you to query the current withdrawal request queue status and calculate the dynamic fee based on EIP-7002. This is useful if you want to inspect the current network conditions before building a validator exit transaction.

**Note:** This is a standalone utility function exported from the Ethereum package. You don't need to call `init()` on the staker to use it.

### How to Use

The function requires an Ethereum public client (from viem) and a network configuration object.

**Returns:**

- `length`: The current number of pending withdrawal requests in the queue
- `fee`: The calculated fee in wei based on the current queue length (using the exponential formula)

### Example

```javascript
import { EthereumStaker, getWithdrawalQueue } from '@chorus-one/ethereum'

const staker = new EthereumStaker({
  network: 'mainnet',
  rpcUrl: 'https://ethereum-rpc.publicnode.com'
})
await staker.init()

// Get the withdrawal queue status
const queue = await getWithdrawalQueue(staker.connector.eth, staker.getNetworkConfig())

console.log(`Queue length: ${queue.length}`)
console.log(`Calculated fee: ${queue.fee} wei`)

// Use custom fee if needed (though 1 wei is usually sufficient)
const { tx } = await staker.buildValidatorExitTx({
  validatorPubkey: '8c3a5e3f4b2c1d6e7f8a9b0c1d2e3f4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
  value: queue.fee // Only use this if you specifically need priority processing
})
```

**Important Considerations:**

- The calculated `fee` can be extremely high (thousands of ETH) if the number of pending requests is large, see [fee analysis docs](https://eips.ethereum.org/assets/eip-7002/fee_analysis)
- For normal validator exits, using the default 1 wei is recommended
- Only provide a custom fee if you have a specific operational requirement for priority processing
- The queue length and fee can change rapidly, so values may be outdated by the time your transaction is broadcast

---

## Further Reading

- [Chorus One Ethereum Native Staking](https://kb.chorus.one/our-products/chorus-one-ethereum-native-staking)
- [Native Staking API Integration](https://kb.chorus.one/our-products/chorus-one-ethereum-native-staking/api-integration-guide)
