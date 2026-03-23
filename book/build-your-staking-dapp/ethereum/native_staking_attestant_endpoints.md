This section provides an overview of the key API endpoints available for **Native Staking** on the Ethereum network via the **Chorus One Native Staking API**.

The Chorus One Native Staking API allows you to manage subaccounts, create validators, and monitor validator status through simple REST API calls. Below, we will explore each endpoint with practical examples to help you get started.

## Authentication

All API requests require a Bearer token in the `Authorization` header. You can obtain a token by reaching out to the Chorus One team.

**Base URLs:**

| Network         | Base URL                            |
| --------------- | ----------------------------------- |
| Mainnet         | `https://client.attestant.io`       |
| Testnet (Hoodi) | `https://client-hoodi.attestant.io` |

**Headers:**

```
Authorization: Bearer <your-api-token>
Content-Type: application/json
```

---

## Create Subaccount

`POST /v1/accounts/subaccounts`

### Description

Creates a new subaccount. A subaccount contains configuration for validators, such as the fee recipient address and MEV relay settings. You must create a subaccount before creating validators.

### How to Use

**Request Body:**

- **name** (string, required): The subaccount name (e.g., `"My Subaccount"`)
- **ethereum** (object, required):
  - **fee_recipient** (string, required): An EIP-55 checksummed Ethereum address that will receive MEV rewards and tips
  - **default_mev_relays** (boolean, optional): Use all available MEV relays. Default is `false`
  - **mev_relays** (array, optional): Specific MEV relay IDs to use (see [List MEV Relays](#list-mev-relays))

### Example

```bash
curl -X POST https://client.attestant.io/v1/accounts/subaccounts \
  -H "Authorization: Bearer <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Subaccount",
    "ethereum": {
      "fee_recipient": "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01",
      "default_mev_relays": true
    }
  }'
```

### Response

**Status: 201 Created**

```json
{
  "name": "My Subaccount",
  "ethereum": {
    "fee_recipient": "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01",
    "mev_relays": [{ "id": "1234567890123456789" }]
  }
}
```

**Response Fields:**

- **name**: The subaccount name
- **ethereum.fee_recipient**: The configured fee recipient address
- **ethereum.mev_relays**: Array of assigned MEV relay objects, each with an `id` field

---

## List Validators

`GET /v1/eth/validators`

### Description

Retrieves a list of validators. Each returned validator includes details about its configuration, current state, and balance. You can optionally filter validators by subaccount.

### How to Use

**Query Parameters:**

- **subaccount** (string, optional): Filter validators by subaccount name. If not supplied, all validators are returned

### Example

**List all validators:**

```bash
curl -X GET https://client.attestant.io/v1/eth/validators \
  -H "Authorization: Bearer <your-api-token>"
```

**List validators for a specific subaccount:**

```bash
curl -X GET "https://client.attestant.io/v1/eth/validators?subaccount=My%20Subaccount" \
  -H "Authorization: Bearer <your-api-token>"
```

### Response

**Status: 200 OK**

```json
{
  "validators": [
    {
      "id": "1234567890123456789",
      "public_key": "0xaabbccdd00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabb",
      "name": "Validator #1",
      "subaccount": "My Subaccount",
      "state": "Active",
      "withdrawal_credentials": "0x010000000000000000000000abcdef0123456789abcdef0123456789abcdef01",
      "balance": "32000506147000000000",
      "effective_balance": "32000000000000000000",
      "deposits": "32000000000000000000",
      "activation_timestamp": "1772558616",
      "timestamp": "1774021252"
    },
    {
      "id": "9876543210987654321",
      "public_key": "0x112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011",
      "name": "Validator #2",
      "subaccount": "My Subaccount",
      "state": "Awaiting deposit",
      "balance": "0",
      "deposits": "0",
      "timestamp": "1774021252"
    }
  ]
}
```

**Response Fields:**

- **validators**: Array of validator objects, each containing:
  - **id**: Unique identifier for the validator
  - **public_key**: The 48-byte BLS public key of the validator (hex-encoded)
  - **name**: The name assigned to the validator
  - **subaccount**: The subaccount to which the validator belongs
  - **state**: The current state of the validator. Possible values:
    - `Unassigned` — Not yet assigned to a customer
    - `Awaiting deposit` — Assigned and awaiting a deposit on the execution chain
    - `Deposited` — Matched to a deposit, awaiting inclusion on the consensus chain
    - `Awaiting activation` — Included on the consensus chain, in the activation queue
    - `Active` — Currently validating
    - `Exited` — Exited and no longer active
  - **withdrawal_credentials**: 32-byte withdrawal credentials (hex-encoded). Present on active validators
  - **balance**: Current balance in Wei
  - **effective_balance**: Current effective balance in Wei. Present on active validators
  - **deposits**: Total amount deposited from the execution chain in Wei
  - **activation_timestamp**: Unix timestamp (seconds) when the validator became active. Present on active validators
  - **timestamp**: Unix timestamp when the validator information was last updated

---

## Create Validators

`POST /v1/eth/validators`

### Description

Creates one or more new validators. The created validators will each need a deposit before they are activated. Deposits can be made individually or for all validators within a single batch transaction using the [batch validator depositor contract](https://github.com/attestantio/batch-validator-depositor), which has been [audited by Dedaub](https://dedaub.com/audits/ethereum-foundation/ef-batch-validator-depositor-april-02-2025/). The returned information includes raw transaction data that can be used to submit deposits.

### How to Use

**Request Body:**

- **subaccount** (string, required): The subaccount to assign the validators to (e.g., `"My Subaccount"`)
- **names** (string[], required): Names for the validators (e.g., `["Validator #1", "Validator #2"]`)
- **amount** (string, optional): Deposit amount per validator (e.g., `"32 ETH"` or `"654 GWEI"`). An amount without units is considered to be in Wei. Defaults to 32 ETH. Must be a whole number (no decimals). The same amount is applied to all validators in the request
- **compounding** (boolean, optional): Whether to create compounding validators. Default is `false`

**Note**: A single request cannot exceed 100 validators. If you need more, please issue multiple requests.

### Examples

**Creating standard validators (32 ETH each):**

```bash
curl -X POST https://client.attestant.io/v1/eth/validators \
  -H "Authorization: Bearer <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subaccount": "My Subaccount",
    "names": ["Validator #1", "Validator #2"]
  }'
```

**Creating compounding validators with custom amount:**

```bash
curl -X POST https://client.attestant.io/v1/eth/validators \
  -H "Authorization: Bearer <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subaccount": "My Subaccount",
    "names": ["Validator #1"],
    "amount": "64 ETH",
    "compounding": true
  }'
```

### Response

**Status: 201 Created**

```json
{
  "validators": [
    {
      "id": "1234567890123456789",
      "pubkey": "0xaabbccdd00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabb",
      "name": "Validator #1",
      "amount": "32000000000",
      "withdrawal_credentials": "0x010000000000000000000000abcdef0123456789abcdef0123456789abcdef01",
      "deposit_message_root": "0xaabbccdd00112233445566778899aabbccddeeff00112233445566778899aabb",
      "deposit_data_root": "0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
      "fork_version": "0x10000910",
      "signature": "0xaabb...96_bytes_hex_encoded",
      "transaction_data": "0x22895118000000000000000000000000000000000000000000...",
      "version": "5"
    },
    {
      "id": "9876543210987654321",
      "pubkey": "0x112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011",
      "name": "Validator #2",
      "amount": "32000000000",
      "withdrawal_credentials": "0x010000000000000000000000abcdef0123456789abcdef0123456789abcdef01",
      "deposit_message_root": "0x22334455667788990011aabbccddeeff22334455667788990011aabbccddeeff",
      "deposit_data_root": "0x33445566778899001122aabbccddeeff33445566778899001122aabbccddeeff",
      "fork_version": "0x10000910",
      "signature": "0xccdd...96_bytes_hex_encoded",
      "transaction_data": "0x22895118000000000000000000000000000000000000000000...",
      "version": "5"
    }
  ],
  "batch_transactions": {
    "Attestant": "0xc09bb1db000000000000000000000000000000000000..."
  }
}
```

**Response Fields:**

- **validators**: Array of created validator objects, each containing:
  - **id**: Unique identifier for the validator
  - **pubkey**: The 48-byte BLS public key (hex-encoded)
  - **name**: The name assigned to the validator
  - **amount**: The deposit amount in Gwei
  - **withdrawal_credentials**: 32-byte withdrawal credentials (hex-encoded)
  - **deposit_message_root**: Hash of the deposit message (hex-encoded)
  - **deposit_data_root**: Hash of the deposit data (hex-encoded)
  - **fork_version**: Ethereum fork version used to generate the signature
  - **signature**: 96-byte BLS signature (hex-encoded)
  - **transaction_data**: Raw transaction data that can be sent directly as part of the deposit transaction
  - **version**: Version of the transaction data format (currently `"5"`)
- **batch_transactions**: Object mapping batch deposit contract names to their full transaction data (hex-encoded). This can be used to deposit all validators in a single transaction

---

## Depositing Validators

After creating validators, you must deposit ETH to activate them. There are two approaches:

### Option A: Batch Deposit (recommended for multiple validators)

Use the `batch_transactions` field from the Create Validators response. Each entry contains pre-encoded transaction data for a batch deposit contract that can deposit all validators in a single transaction.

Send the hex data as a transaction to the [batch validator depositor contract](https://github.com/attestantio/batch-validator-depositor) ([audited by Dedaub](https://dedaub.com/audits/ethereum-foundation/ef-batch-validator-depositor-april-02-2025/)):

| Network | Batch Deposit Contract Address               |
| ------- | -------------------------------------------- |
| Mainnet | `0x16BF86Efb14FA03a3A207efC03Df5Ed29094a838` |
| Hoodi   | `0x9c2880C58e2F7bc7f1Bcbf0e0d220B8a3d6cc5a9` |

The transaction value must equal the sum of all validator deposits. For example, 2 validators at 32 ETH each requires sending 64 ETH.

### Option B: Individual Deposits

Use the `transaction_data` field from each validator in the response. Send each as a separate transaction to the official Ethereum deposit contract:

| Network      | Deposit Contract Address                     |
| ------------ | -------------------------------------------- |
| All networks | `0x00000000219ab540356cBB839Cbe05303d7705Fa` |

The transaction value must equal the deposit amount for that validator (e.g., 32 ETH). The `transaction_data` is an ABI-encoded call to the deposit function:

```
deposit(bytes pubkey, bytes withdrawal_credentials, bytes signature, bytes32 deposit_data_root)
```

Function selector: `0x22895118`

---

## Verifying Transaction Data

Before signing any deposit transaction, you should decode and verify the `transaction_data` to ensure it was not tampered with in transit.

The `transaction_data` is an ABI-encoded call to `deposit(bytes,bytes,bytes,bytes32)` with function selector `0x22895118`. You can decode it and compare the values against the other fields in the response.

**Using Foundry's `cast`:**

```bash
cast calldata-decode \
  "deposit(bytes,bytes,bytes,bytes32)" \
  0x22895118000000000000000000000000...
```

This will output the decoded `pubkey`, `withdrawal_credentials`, `signature`, and `deposit_data_root`. Verify that each matches the corresponding field in the validator response.

**Using viem:**

```javascript
import { decodeFunctionData, parseAbi } from 'viem'

const depositAbi = parseAbi([
  'function deposit(bytes pubkey, bytes withdrawal_credentials, bytes signature, bytes32 deposit_data_root)'
])

const { args } = decodeFunctionData({
  abi: depositAbi,
  data: transactionData
})

const [pubkey, withdrawalCredentials, signature, depositDataRoot] = args
console.log('pubkey:', pubkey)
console.log('withdrawal_credentials:', withdrawalCredentials)
console.log('signature:', signature)
console.log('deposit_data_root:', depositDataRoot)
```

---

## Constructing Your Own Deposit Transaction

For an additional layer of trust, you can independently construct the deposit transaction using the response fields rather than relying on the pre-built `transaction_data`. This way, you control the entire encoding process.

### Steps

1. Take `pubkey`, `withdrawal_credentials`, `signature`, and `deposit_data_root` from the validator response
2. ABI-encode a call to `deposit(bytes,bytes,bytes,bytes32)` with these values
3. Send the encoded data to the deposit contract with the correct ETH value

**Using Foundry's `cast`:**

```bash
cast calldata \
  "deposit(bytes,bytes,bytes,bytes32)" \
  <pubkey> \
  <withdrawal_credentials> \
  <signature> \
  <deposit_data_root>
```

**Using viem:**

```javascript
import { encodeFunctionData, parseAbi, parseEther } from 'viem'

const depositAbi = parseAbi([
  'function deposit(bytes pubkey, bytes withdrawal_credentials, bytes signature, bytes32 deposit_data_root)'
])

const data = encodeFunctionData({
  abi: depositAbi,
  functionName: 'deposit',
  args: [validator.pubkey, validator.withdrawal_credentials, validator.signature, validator.deposit_data_root]
})

// Send to deposit contract with correct ETH value
const tx = {
  to: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
  data: data,
  value: parseEther('32')
}
```

### Verifying the `deposit_data_root`

You can also independently recompute the `deposit_data_root` to verify the server has not manipulated it. The `deposit_data_root` is the SSZ hash tree root of the `DepositData` container:

```
DepositData {
  pubkey:                 BLSPubkey       (48 bytes)
  withdrawal_credentials: Bytes32         (32 bytes)
  amount:                 Gwei            (uint64)
  signature:              BLSSignature    (96 bytes)
}
```

The deposit contract itself also verifies this root on-chain — if the `deposit_data_root` does not match the other fields, the transaction will revert.

---

## Further Reading

- [Full API Reference](https://client.attestant.io/docs/#/) — Complete OpenAPI documentation with all available endpoints
