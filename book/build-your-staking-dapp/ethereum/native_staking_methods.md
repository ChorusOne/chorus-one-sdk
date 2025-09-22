This section provides an overview of the key methods available in the **Chorus One SDK** for **Native Staking** on the Ethereum network.

The Chorus One Native Staking SDK supports a range of staking operations including creating validator batches, retrieving batch status, exporting deposit data as well as building deposit transactions. Below, we will explore each method with practical examples to help you get started.

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

## Further Reading

- [Chorus One Ethereum Native Staking](https://kb.chorus.one/our-products/chorus-one-ethereum-native-staking)
- [Native Staking API Integration](https://kb.chorus.one/our-products/chorus-one-ethereum-native-staking/api-integration-guide)
