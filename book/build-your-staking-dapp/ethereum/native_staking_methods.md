This section provides an overview of the key methods available in the **Chorus One SDK** for **Native Staking** on the Ethereum network.

The Chorus One Native Staking SDK supports a range of staking operations including creating validator batches, retrieving batch status, exporting deposit data as well as building deposit transactions. Below, we will explore each method with practical examples to help you get started.

## createValidatorBatch

### Description

The `createValidatorBatch` method creates a new batch of validators with each validator requiring a deposit to be made. The batch will generate deposit data that can be used to deposit validators on the Ethereum network.

### How to Use

To create validators, you need to specify:

- **batchId** (required): A unique UUID for the batch
- **withdrawalAddress** (required): The withdrawal address or credentials
  - For standard validators: A regular Ethereum address (e.g., `0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30`)
  - For compounding validators: A 32-byte withdrawal credential in 0x02 format ([EIP-7251](https://eips.ethereum.org/EIPS/eip-7251))
    - Use the `toCompoundingCredentials()` utility function to convert your wallet address
    - Format: `0x02` + `00000000000000000000` (11 zero bytes) + your 20-byte wallet address (without 0x prefix)
    - Example: For wallet `0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30`, use `0x02000000000000000000000070aEe8a9099ebADB186C2D530F72CF5dC7FE6B30`
- **feeRecipientAddress** (required): The address that will receive MEV rewards
- **numberOfValidators** (required): Number of validators to create in the batch
- **isCompounding** (optional): Whether to create compounding validators (EIP-7251). Default is `false`
  - When `true`, withdrawal address must be a 32-byte credential starting with `0x02`
  - When `false`, withdrawal address must be a standard 20-byte Ethereum address
- **depositGweiPerValidator** (optional): The deposit amount in gwei per validator. Default is `32000000000` (32 ETH)

**Note**: A single batch request cannot exceed 200 validators. If you need more, please issue multiple batch requests.

### Examples

**Creating standard validators (32 ETH each):**

```javascript
const result = await staker.createValidatorBatch({
  batchId: '4da22c97-b7d5-4e31-8c3a-03870ebc7b20',
  withdrawalAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  feeRecipientAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  numberOfValidators: 2
})
```

**Creating compounding validators (EIP-7251):**

```javascript
import { toCompoundingCredentials } from '@chorus-one/ethereum'

const walletAddress = '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30'
const withdrawalCredentials = toCompoundingCredentials(walletAddress)
// Returns: '0x02000000000000000000000070aEe8a9099ebADB186C2D530F72CF5dC7FE6B30'

const result = await staker.createValidatorBatch({
  batchId: '5ea33d98-c8e6-5f42-9d4b-14981fcd8c31',
  withdrawalAddress: withdrawalCredentials,
  feeRecipientAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  numberOfValidators: 1,
  isCompounding: true
})
```

**Creating compounding validator with custom deposit amount (64 ETH):**

```javascript
import { toCompoundingCredentials } from '@chorus-one/ethereum'

const result = await staker.createValidatorBatch({
  batchId: '6fb44e09-d9f7-6g53-0e5c-25092gde9d42',
  withdrawalAddress: toCompoundingCredentials('0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30'),
  feeRecipientAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  numberOfValidators: 1,
  isCompounding: true,
  depositGweiPerValidator: 64000000000n // 64 ETH
})
```

---

## getValidatorBatchStatus

### Description

The `getValidatorBatchStatus` method retrieves the current status of a validator batch, including the deposit data for each validator when ready.

### How to Use

To retrieve the status of a validator batch, you need to specify the batch id of the validator batch.

### Example

```javascript
const batchData = await staker.getValidatorBatchStatus({
  batchId: '4da22c97-b7d5-4e31-8c3a-03870ebc7b20'
})
```

### Response

The method returns a `BatchDetailsResponse` object with the following structure:

- **status**: Batch status - `'created'` (processing) or `'ready'` (deposit data available)
- **created**: Timestamp when the batch was created
- **is_compounding**: Boolean indicating if validators are compounding (EIP-7251)
- **deposit_gwei_per_validator**: Deposit amount in gwei per validator
- **validators**: Array of validator objects, each containing:
  - **status**: Validator status - `'created'`, `'active'`, or `'exited'`
  - **deposit_data**: Deposit data object with fields like `pubkey`, `withdrawal_credentials`, `signature`, `deposit_data_root`, etc.

---

## listValidatorBatches

### Description

The `listValidatorBatches` method retrieves all validator batches that have been created for the authenticated tenant. This method is useful for getting an overview of all your validator batches and their current status.

### How to Use

This method doesn't require any parameters and returns a list of all validator batches associated with your API token.

### Example

```javascript
const response = await staker.listValidatorBatches()
```

### Response

The method returns a `ListBatchesResponse` object containing:

- **requests**: Array of batch items, each with:
  - **batch_id**: Unique identifier for the batch
  - **created**: Timestamp when the batch was created
  - **status**: Batch status - `'created'` or `'ready'`
  - **is_compounding**: Boolean indicating if validators are compounding (EIP-7251)
  - **deposit_gwei_per_validator**: Deposit amount in gwei per validator

## Further Reading

- [Chorus One Ethereum Native Staking](https://kb.chorus.one/our-products/chorus-one-ethereum-native-staking)
- [Native Staking API Integration](https://kb.chorus.one/our-products/chorus-one-ethereum-native-staking/api-integration-guide)
