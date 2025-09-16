This section provides an overview of the key methods available in the **Chorus One SDK** for **Native Staking** on the Ethereum network.

The Chorus One Native Staking SDK supports a range of staking operations including creating validator batches, retrieving batch status, exporting deposit data as well as building deposit transactions. Below, we will explore each method with practical examples to help you get started.

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

To retrieve the status of a validator batch, you need to specify the batch id of the validator batch and optionally the epoch number for generating exit messages.

### Example

```javascript
const status = await staker.getValidatorBatchStatus({ batchId: '4da22c97-b7d5-4e31-8c3a-03870ebc7b20' })
```

---

## exportDepositData

### Description

The `exportDepositData` method retrieves the deposit data for a batch and formats it for use with the official Ethereum Staking Launchpad or other deposit tools.

### How to Use

To export the deposit data for a batch, you need to specify the batch id for the validator batch.

### Example

```javascript
const depositData = await staker.exportDepositData({ batchId: '4da22c97-b7d5-4e31-8c3a-03870ebc7b20' })
```

---

## buildDepositTx

### Description

The `buildDepositTx` method creates transactions for depositing validators to the Ethereum deposit contract. Each validator requires exactly 32 ETH to be deposited along with the deposit data.

### How to Use

To build the deposit transaction for a batch, you need to specify the batch id for the validator batch.

### Example

```javascript
const { transactions } = await staker.buildDepositTx({ batchId: '4da22c97-b7d5-4e31-8c3a-03870ebc7b20' })
```

## Further Reading

- [Chorus One Ethereum Native Staking](https://kb.chorus.one/our-products/chorus-one-ethereum-native-staking)
- [Native Staking API Integration](https://kb.chorus.one/our-products/chorus-one-ethereum-native-staking/api-integration-guide)
