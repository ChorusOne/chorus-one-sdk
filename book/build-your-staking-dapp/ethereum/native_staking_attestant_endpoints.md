This section provides an overview of the key API endpoints available for Native Staking on the Ethereum network via the Bitwise Onchain Solutions Native Staking API. Dedicated ETH staking services are provided by Attestant Ltd (d/b/a Bitwise Onchain Solutions), the parent company of Bitwise Onchain Solutions AG (f/k/a Chorus One).

The Bitwise Onchain Solutions Native Staking API allows you to manage subaccounts, create validators, and monitor validator status through simple REST API calls. Below, we will explore each endpoint with practical examples to help you get started.

## Authentication

All API requests require a Bearer token in the `Authorization` header. You can obtain a token by reaching out to the Chorus One team. See [Tokens](#tokens) for the full token lifecycle.

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

> Error responses (4xx/5xx) follow the [full OpenAPI specification](https://client.attestant.io/docs/#/). This page documents request shapes and successful responses only.

---

## Step-by-Step: How to Stake

The end-to-end flow to bring an Ethereum validator online via the Attestant API is six steps. Each step links to the endpoint reference below.

1. **(Optional) Choose MEV relays.** Call [List MEV Relays](#list-mev-relays) to retrieve relay IDs if you want to pin specific relays to your subaccount instead of accepting the defaults.
2. **Create a subaccount.** Call [Create Subaccount](#create-subaccount) with your fee recipient address and MEV relay preferences. The subaccount groups validators and holds their shared configuration. You can confirm the result with [Get Subaccount](#get-subaccount).
3. **Create validators.** Call [Create Validators](#create-validators), passing the subaccount name and a list of validator names. Attestant returns the BLS pubkey, withdrawal credentials, signature, and pre-built deposit transaction data for each validator.
4. **(Recommended) Verify the deposit data.** Decode the returned `transaction_data` and confirm it matches the other fields — see [Verifying Transaction Data](#verifying-transaction-data). For maximum trust, build the deposit call yourself using [Constructing Your Own Deposit Transaction](#constructing-your-own-deposit-transaction).
5. **Submit the deposit(s).** Send ETH to the deposit contract following [Depositing Validators](#depositing-validators) — either one batch transaction for multiple validators or one transaction per validator.
6. **Track activation.** Poll [Get Validator](#get-validator) (or [List Validators](#list-validators)) until each validator's `state` reaches `Active`. The state progresses `Awaiting deposit → Deposited → Awaiting activation → Active`.

Once a validator is `Active`, ongoing management — converting to compounding, consolidating, topping up, partial withdrawals, and full exits — is covered under [Lifecycle Operations](#lifecycle-operations). For background on `0x01` vs `0x02` (compounding) validators and the Pectra lifecycle, see [Compounding and Credential Types](#compounding-and-credential-types).

---

## Compounding and Credential Types

Every Ethereum validator has a **withdrawal credential** whose leading byte determines how its balance behaves. The remaining 20 bytes are the withdrawal address (the subaccount's `fee_recipient`); only the prefix differs between the two types.

| Prefix | Type | Max effective balance | Rewards |
| --- | --- | --- | --- |
| `0x01` | Legacy (execution address) | 32 ETH | Skimmed automatically to the withdrawal address; balance above 32 ETH does not earn |
| `0x02` | Compounding ([Pectra](https://eips.ethereum.org/EIPS/eip-7251)) | 2048 ETH | **Compound automatically** — they stay staked and keep earning |

A compounding (`0x02`) validator is the building block of the Pectra staking lifecycle:

- **Create** a `0x02` validator directly by passing `compounding: true` to [Create Validators](#create-validators), or start at 32 ETH and grow it with [Get Topup Transaction](#get-topup-transaction) (up to 2048 ETH).
- **Upgrade** an existing `0x01` validator in place with [Convert to Compounding](#convert-to-compounding) — keys, index, and balance are unchanged; only the credential prefix flips to `0x02`.
- **Consolidate** the stake of one validator into a `0x02` target with [Consolidate Validators](#consolidate-validators), collapsing several validators into one larger one.
- **Withdraw** part of the balance, or exit entirely, with [Get Withdrawal Transaction](#get-withdrawal-transaction) and [Get Exit Transaction](#get-exit-transaction). Withdrawals and exits include accrued rewards.

> **Note:** Separately claiming rewards on a legacy `0x01` validator is not supported — its rewards above 32 ETH are skimmed automatically by the protocol. Upgrade it to `0x02` to compound instead.

---

## List MEV Relays

`GET /v1/eth/mevrelays`

### Description

Retrieves the Ethereum MEV relays that can be assigned to a subaccount. MEV relays configured on a subaccount are used by that subaccount's validators when proposing blocks.

### How to Use

This method does not require any parameters.

### Example

```bash
curl -X GET https://client.attestant.io/v1/eth/mevrelays \
  -H "Authorization: Bearer <your-api-token>"
```

### Response

**Status: 200 OK**

```json
[
  {
    "id": "1234567890123456789",
    "name": "Relay Name",
    "description": "Relay description",
    "description_url": "https://example.com/relay"
  }
]
```

**Response Fields:**

- **id**: MEV relay ID. Use this value in `ethereum.mev_relays` when creating or updating a subaccount
- **name**: The relay name
- **description**: Description provided by the relay owner
- **description_url**: URL with more information about the relay

**Note**: If no relays are available, the response is an empty array (`[]`).

---

## Subaccounts

A **subaccount** is an in-account grouping of validators that share configuration — fee recipient and MEV relay set. Every validator is assigned to exactly one subaccount, and an API token may be restricted to a single subaccount (see [Tokens](#tokens)).

The endpoints below let you create new subaccounts and inspect existing ones.

### Create Subaccount

`POST /v1/accounts/subaccounts`

#### Description

Creates a new subaccount. A subaccount contains configuration for validators, such as the fee recipient address and MEV relay settings. You must create a subaccount before creating validators.

#### How to Use

**Request Body:**

- **name** (string, required): The subaccount name (e.g., `"My Subaccount"`)
- **ethereum** (object, required):
  - **fee_recipient** (string, required): An EIP-55 checksummed Ethereum address. Receives MEV rewards and tips, **and** is used as the withdrawal address for every validator created in this subaccount (encoded into each validator's `withdrawal_credentials`).
  - **default_mev_relays** (boolean, optional): Use all available MEV relays. Default is `false`
  - **mev_relays** (array, optional): Specific MEV relay IDs to use (see [List MEV Relays](#list-mev-relays))

#### Example

```bash
curl -X POST https://client.attestant.io/v1/accounts/subaccounts \
  -H "Authorization: Bearer <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Subaccount",
    "ethereum": {
      "fee_recipient": "0xabCDeF0123456789AbcdEf0123456789aBCDEF01",
      "default_mev_relays": true
    }
  }'
```

#### Response

**Status: 201 Created**

```json
{
  "name": "My Subaccount",
  "ethereum": {
    "fee_recipient": "0xabCDeF0123456789AbcdEf0123456789aBCDEF01",
    "mev_relays": [{ "id": "1234567890123456789" }]
  }
}
```

**Response Fields:**

- **name**: The subaccount name
- **ethereum.fee_recipient**: The configured fee recipient address
- **ethereum.mev_relays** (optional): Array of assigned MEV relay objects, each with an `id` field. Only present when MEV relays have been configured for the subaccount; omitted otherwise

---

### Get Subaccount

`GET /v1/accounts/subaccounts/{subaccount_id}`

#### Description

Retrieves information about a single subaccount, including its fee recipient and assigned MEV relays.

#### How to Use

**Path Parameters:**

- **subaccount_id** (string, required): The customer-supplied subaccount name (e.g., `"My Subaccount"`). URL-encode any special characters.

#### Example

```bash
curl -X GET "https://client.attestant.io/v1/accounts/subaccounts/My%20Subaccount" \
  -H "Authorization: Bearer <your-api-token>"
```

#### Response

**Status: 200 OK**

```json
{
  "name": "My Subaccount",
  "ethereum": {
    "fee_recipient": "0xabCDeF0123456789AbcdEf0123456789aBCDEF01",
    "mev_relays": [{ "id": "1234567890123456789" }]
  }
}
```

**Response Fields:**

- **name**: The subaccount name
- **ethereum.fee_recipient**: The configured fee recipient address
- **ethereum.mev_relays** (optional): Array of assigned MEV relay objects, each with an `id` field. Only present when MEV relays have been configured for the subaccount; omitted otherwise

---

## Create Validators

`POST /v1/eth/validators`

### Description

Creates one or more new validators. The created validators will each need a deposit before they are activated. Deposits can be made individually or for all validators within a single batch transaction using the [batch validator depositor contract](https://github.com/attestantio/batch-validator-depositor), which has been [audited by Dedaub](https://dedaub.com/audits/ethereum-foundation/ef-batch-validator-depositor-april-02-2025/). The returned information includes raw transaction data that can be used to submit deposits.

### How to Use

**Request Body:**

- **subaccount** (string, required): The subaccount to assign the validators to (e.g., `"My Subaccount"`)
- **names** (string[], required): Names for the validators (e.g., `["Validator #1", "Validator #2"]`)
- **amount** (string, optional): Deposit amount per validator. Must be a positive whole multiple of 1 ETH (e.g., `"32 ETH"`, `"64 ETH"`). Accepts `ETH`/`GWEI` units or bare-integer Wei. Defaults to 32 ETH; applied to all validators.
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
  - **pubkey**: The 48-byte BLS public key (hex-encoded). Returned as `public_key` in [List Validators](#list-validators) and [Get Validator](#get-validator) responses — same value, different field name
  - **name**: The name assigned to the validator
  - **amount**: The deposit amount in Gwei
  - **withdrawal_credentials**: 32-byte withdrawal credentials (hex-encoded). The last 20 bytes are the withdrawal address, which is the subaccount's `fee_recipient` (see [Create Subaccount](#create-subaccount)).
  - **deposit_message_root**: Hash of the deposit message (hex-encoded)
  - **deposit_data_root**: Hash of the deposit data (hex-encoded)
  - **fork_version**: Ethereum fork version used to generate the signature
  - **signature**: 96-byte BLS signature (hex-encoded)
  - **transaction_data**: Raw transaction data that can be sent directly as part of the deposit transaction
  - **version**: Version of the transaction data format (currently `"5"`)
- **batch_transactions**: Object mapping batch deposit contracts to their hex-encoded transaction data. Use the `Attestant` entry — its addresses are listed in [Depositing Validators](#depositing-validators).

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

## List Validators

`GET /v1/eth/validators`

### Description

Retrieves a list of validators. Each returned validator includes details about its configuration, current state, and balance. You can optionally filter validators by subaccount.

### How to Use

**Query Parameters:**

- **subaccount** (string, optional): Filter validators by subaccount name. If not supplied, all validators visible to the calling token are returned.

**Note**: Called with an account-wide token and no `subaccount` filter, this endpoint returns every validator across every subaccount on the account. Use a subaccount-scoped token (see [Tokens](#tokens)) for customer-facing access.

### Examples

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
  - **withdrawal_credentials**: 32-byte withdrawal credentials (hex-encoded). Set once the validator's deposit has been included on the consensus chain. Always present on `Active`, `Awaiting activation`, and `Exited` validators; on `Deposited` validators it is present once the consensus chain has processed the deposit; absent on `Unassigned` and `Awaiting deposit`
  - **balance**: Current balance in Wei
  - **effective_balance**: Current effective balance in Wei. Present on active validators
  - **deposits**: Total amount deposited from the execution chain in Wei
  - **activation_timestamp**: Unix timestamp (seconds) when the validator became active. Present on `Active` and `Exited` validators
  - **timestamp**: Unix timestamp when the validator information was last updated

---

## Get Validator

`GET /v1/eth/validators/{validator_id}`

### Description

Retrieves details about a single validator, including its configuration, current state, and balance.

### How to Use

**Path Parameters:**

- **validator_id** (string, required): Either the Attestant ID or the BLS public key of the validator (e.g., `"1385610059030986755"` or `"0xaabbccdd..."`).

### Example

```bash
curl -X GET https://client.attestant.io/v1/eth/validators/1234567890123456789 \
  -H "Authorization: Bearer <your-api-token>"
```

### Response

**Status: 200 OK**

```json
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
}
```

**Response Fields:**

- **id**: Unique identifier for the validator
- **public_key**: The 48-byte BLS public key of the validator (hex-encoded)
- **name**: The name assigned to the validator
- **subaccount**: The subaccount to which the validator belongs
- **state**: The current state of the validator. See [List Validators](#list-validators) for the possible values
- **withdrawal_credentials**: 32-byte withdrawal credentials (hex-encoded). Set once the validator's deposit has been included on the consensus chain. Always present on `Active`, `Awaiting activation`, and `Exited` validators; on `Deposited` validators it is present once the consensus chain has processed the deposit; absent on `Unassigned` and `Awaiting deposit`
- **balance**: Current balance in Wei
- **effective_balance**: Current effective balance in Wei. Present on active validators
- **deposits**: Total amount deposited from the execution chain in Wei
- **activation_timestamp**: Unix timestamp (seconds) when the validator became active. Present on `Active` and `Exited` validators
- **timestamp**: Unix timestamp when the validator information was last updated

---

## Lifecycle Operations

The endpoints below support the validator lifecycle after activation: converting to compounding, consolidating, topping up the balance, partial withdrawals, and exiting. They are all pure transaction builders — calling them has no Attestant-side or on-chain effect. Only signing and broadcasting the returned transaction(s) will affect state.

Execution-layer operations target one of the following contracts:

| Operation | Target |
| --- | --- |
| Convert to compounding / Consolidate | EIP-7251 predeploy `0x0000BBdDc7CE488642fb579F8B00f3a590007251` |
| Withdrawal | EIP-7002 predeploy `0x00000961Ef480Eb55e80D19ad83579A64c007002` |
| Topup | Official deposit contract `0x00000000219ab540356cBB839Cbe05303d7705Fa` |

---

### Convert to Compounding

`GET /v1/eth/validators/{validator_id}/compoundtransaction`

Requires a token with `assign` scope or higher.

#### Description

Upgrades a legacy `0x01` validator to a compounding `0x02` validator **in place**. The validator keeps its keys, consensus index, and balance — only the withdrawal-credential prefix changes from `0x01` to `0x02`, after which its rewards compound and it can grow up to 2048 ETH.

Under the hood this is an [EIP-7251](https://eips.ethereum.org/EIPS/eip-7251) **self-consolidation**: a consolidation request whose source and target are the same validator. The transaction targets the EIP-7251 consolidation request predeploy and must be signed by the validator's withdrawal address and broadcast to take effect.

The validator must be `Active` and currently have `0x01` credentials; otherwise the request fails with `412 Precondition Failed`.

#### How to Use

**Path Parameters:**

- **validator_id** (string, required): The validator to upgrade (Attestant ID or BLS pubkey)

#### Example

```bash
curl -X GET https://client.attestant.io/v1/eth/validators/1234567890123456789/compoundtransaction \
  -H "Authorization: Bearer <your-api-token>"
```

#### Response

**Status: 200 OK**

```json
{
  "transactions": [
    {
      "sender": "0xD4BB555d3B0D7fF17c606161B44E372689C14F4B",
      "contract_address": "0x0000BBdDc7CE488642fb579F8B00f3a590007251",
      "data": "0xaabbccdd…<48-byte pubkey>…aabbccdd…<same 48-byte pubkey>…",
      "value": "1001"
    }
  ]
}
```

**Response Fields:**

- **transactions**: Array with a single transaction to sign and broadcast. The entry contains:
  - **sender**: The withdrawal address that must sign and broadcast (the last 20 bytes of the validator's `withdrawal_credentials`)
  - **contract_address**: The EIP-7251 consolidation request predeploy
  - **data**: 96-byte calldata — the validator's 48-byte BLS pubkey repeated twice (source == target)
  - **value**: Wei to send. Equals the current EIP-7251 request fee + safety bump (`fee/2`, clamped `[1000, 10⁹]` wei) to tolerate fee changes before inclusion. If the resulting fee would exceed `0.001 ETH` (`10¹⁵` wei), the request is rejected.

---

### Consolidate Validators

`POST /v1/eth/validators/{validator_id}/consolidatetransaction`

Requires a token with `assign` scope or higher.

#### Description

Generates an [EIP-7251](https://eips.ethereum.org/EIPS/eip-7251) consolidation request that moves the **source** validator's stake into a **target** validator, merging them into one larger compounding validator. The transaction targets the EIP-7251 consolidation request predeploy and must be signed by the source validator's withdrawal address and broadcast to take effect.

Requirements:

- The **source** validator (path `validator_id`) must be `Active` and have `0x01` or `0x02` credentials. It may be one of your own validators, or — by passing its BLS pubkey — an external validator that shares the same withdrawal address.
- The **target** validator (`target_validator`) must be one of your `Active` validators and already be compounding (`0x02`).

If either validator is in an unsuitable state or has the wrong credential type, the request fails with `412 Precondition Failed`.

> Consolidating a validator into itself (source == target) is exactly the `0x01` → `0x02` upgrade — for that case prefer the simpler [Convert to Compounding](#convert-to-compounding) endpoint.

#### How to Use

**Path Parameters:**

- **validator_id** (string, required): The **source** validator whose stake is moved (Attestant ID or BLS pubkey)

**Request Body:**

- **target_validator** (string, required): The **target** validator that receives the stake (Attestant ID or BLS pubkey). Must be an active compounding (`0x02`) validator on your account.

#### Example

```bash
curl -X POST https://client.attestant.io/v1/eth/validators/1234567890123456789/consolidatetransaction \
  -H "Authorization: Bearer <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "target_validator": "9876543210987654321"
  }'
```

#### Response

**Status: 200 OK**

```json
{
  "transactions": [
    {
      "sender": "0xD4BB555d3B0D7fF17c606161B44E372689C14F4B",
      "contract_address": "0x0000BBdDc7CE488642fb579F8B00f3a590007251",
      "data": "0xaabbccdd…<48-byte source pubkey>…112233…<48-byte target pubkey>…",
      "value": "1001"
    }
  ]
}
```

**Response Fields:**

- **transactions**: Array with a single transaction to sign and broadcast. The entry contains:
  - **sender**: The source validator's withdrawal address, which must sign and broadcast
  - **contract_address**: The EIP-7251 consolidation request predeploy
  - **data**: 96-byte calldata — the 48-byte source pubkey followed by the 48-byte target pubkey
  - **value**: Wei to send. Equals the current EIP-7251 request fee + safety bump (`fee/2`, clamped `[1000, 10⁹]` wei). If the resulting fee would exceed `0.001 ETH` (`10¹⁵` wei), the request is rejected.

**Note**: Once the request is processed on the consensus chain, the source validator's balance is moved into the target and the source is exited. Both validators must be active when the request is made.

---

### Get Topup Transaction

`POST /v1/eth/validators/{validator_id}/topuptransaction`

#### Description

Generates a deposit transaction that increases the balance of an active compounding (`0x02`) validator. The transaction targets the standard Ethereum deposit contract.

The returned transaction must be signed and broadcast to take effect.

#### How to Use

**Path Parameters:**

- **validator_id** (string, required): The validator to top up (Attestant ID or BLS pubkey)

**Request Body:**

- **amount** (string, required): The amount to top up (e.g., `"1 ETH"`, `"32000000000 GWEI"`, or bare-integer Wei). Use whole-Gwei increments — sub-Gwei precision is silently truncated from the signed deposit data.

#### Example

```bash
curl -X POST https://client.attestant.io/v1/eth/validators/1234567890123456789/topuptransaction \
  -H "Authorization: Bearer <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "1 ETH"
  }'
```

#### Response

**Status: 200 OK**

```json
{
  "transactions": [
    {
      "contract_address": "0x00000000219ab540356cBB839Cbe05303d7705Fa",
      "data": "0x22895118...",
      "value": "1000000000000000000"
    }
  ]
}
```

**Response Fields:**

- **transactions**: Array of transactions to sign and broadcast. Each entry contains:
  - **contract_address**: The official Ethereum deposit contract
  - **data**: ABI-encoded `deposit(bytes,bytes,bytes,bytes32)` call (selector `0x22895118`)
  - **value**: Wei to send (matches the requested amount; `1 ETH` = `"1000000000000000000"`)

**Note**: Unlike the EIP-7002 withdrawal builder, this response does not include a `sender` field — any address can broadcast a top-up deposit on behalf of the validator.

---

### Get Withdrawal Transaction

`POST /v1/eth/validators/{validator_id}/withdrawaltransaction`

#### Description

Generates an EIP-7002 partial withdrawal request for an active compounding (`0x02`) validator. When broadcast, the requested amount is withdrawn from the validator's balance to the withdrawal address. The transaction targets the EIP-7002 withdrawal request predeploy.

The returned transaction must be signed by the withdrawal address and broadcast to take effect.

#### How to Use

**Path Parameters:**

- **validator_id** (string, required): The validator (Attestant ID or BLS pubkey)

**Request Body:**

- **amount** (string, required): The amount to withdraw (e.g., `"1 ETH"`, `"500000000 GWEI"`, or bare-integer Wei). Use whole-Gwei increments — the on-chain request is encoded as uint64 Gwei, so sub-Gwei precision is silently truncated.

#### Example

```bash
curl -X POST https://client.attestant.io/v1/eth/validators/1234567890123456789/withdrawaltransaction \
  -H "Authorization: Bearer <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "1 ETH"
  }'
```

#### Response

**Status: 200 OK**

```json
{
  "transactions": [
    {
      "sender": "0xD4BB555d3B0D7fF17c606161B44E372689C14F4B",
      "contract_address": "0x00000961Ef480Eb55e80D19ad83579A64c007002",
      "data": "0xb5844292ad0e0a0c3c06425e5672c356a37aa2b58d24774817e19500a22703d5ff05a9e0af99054ff625cc51761c470f000000003b9aca00",
      "value": "1001"
    }
  ]
}
```

**Response Fields:**

- **transactions**: Array of transactions to sign and broadcast. Each entry contains:
  - **sender**: The withdrawal address that must sign and broadcast
  - **contract_address**: The EIP-7002 withdrawal request predeploy
  - **data**: Hex-encoded calldata — 48-byte validator pubkey followed by 8-byte amount in Gwei (big-endian). For example, `000000003b9aca00` = 1,000,000,000 Gwei = 1 ETH
  - **value**: Wei to send. Equals on-chain fee + safety bump (`fee/2`, clamped `[1000, 10⁹]`) to tolerate fee changes before inclusion

---

### Get Exit Transaction

`GET /v1/eth/validators/{validator_id}/exittransaction`

#### Description

Generates a BLS-signed voluntary exit message for an active validator. Attestant signs the message with the validator's consensus-layer key; the customer only needs to broadcast it to a beacon node to initiate the exit.

If a verified PGP key has been registered for the customer, the returned transaction will instead be encrypted with that key.

#### How to Use

**Path Parameters:**

- **validator_id** (string, required): Either the Attestant ID or the BLS public key of the validator

#### Example

```bash
curl -X GET https://client.attestant.io/v1/eth/validators/1234567890123456789/exittransaction \
  -H "Authorization: Bearer <your-api-token>"
```

#### Response

**Status: 200 OK**

```json
{
  "transaction": {
    "message": {
      "epoch": "96437",
      "validator_index": "1281812"
    },
    "signature": "0x8eb629978419232d8af4b516adb4bc9df342a0f7b5a70210d69d0947bdebbc6d8a4140addb3a011b27152853273733281063b0d700f3df61a12761b49a8e9de5ff8635f7eda9c782595d3ee1b8548ae6ec6a3ff1d48c3eea7ad9a3d741b040a8"
  }
}
```

**Response Fields:**

- **transaction.message.epoch**: The earliest epoch at which the exit takes effect
- **transaction.message.validator_index**: The consensus-layer validator index
- **transaction.signature**: 96-byte BLS signature over the exit message (hex-encoded)
- **encrypted_transaction** (alternative): If a verified PGP key is registered for the customer, this hex-encoded encrypted blob is returned instead of `transaction`. Decrypt with the customer's private PGP key before broadcasting.

---

## Tokens

The Bitwise Onchain Solutions account uses bearer tokens for API authentication. Each token carries a *scope* (which operations it permits) and may be restricted to a single [subaccount](#subaccounts) (limiting the data the token can read). Tokens are issued, listed, and revoked through the four endpoints below.

The token string itself is **returned only once**, in the `POST /v1/accounts/tokens` response — if it is lost it must be deleted and re-issued.

### Scopes

| Scope       | Permitted operations                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| `read-only` | Read account state. GETs that generate a signed transaction or message require `assign` or higher               |
| `assign`    | `read-only` + create validators and perform validator-lifecycle actions (generate transactions, initiate exits) |
| `operate`   | `assign` + create and update subaccounts (fee recipient, MEV relays); issue lower-or-equal-scope tokens and revoke tokens |
| `all`       | Every API operation. Reserved for portal use; rejected when requested via this endpoint                         |

### Subaccount Scoping

A token MAY be restricted to a single subaccount by setting the `subaccount` field on creation. When set, the token can only read and act on data within that subaccount. When unset, the token is account-wide and can read every subaccount on the account.

---

### List Tokens

`GET /v1/accounts/tokens`

#### Description

Returns metadata for every token on the account. The actual token string is never included.

#### Example

```bash
curl -X GET https://client.attestant.io/v1/accounts/tokens \
  -H "Authorization: Bearer <your-api-token>"
```

#### Response

**Status: 200 OK**

```json
[
  {
    "id": "1234567890123456789",
    "name": "Customer 1 read-only",
    "subaccount": "Customer 1",
    "scope": "read-only",
    "created": "2026-05-22T06:13:34+0000",
    "expiry": "2027-05-22T06:13:33+0000"
  }
]
```

**Response Fields (per token):**

- **id**: Attestant identifier for the token
- **name**: The token name
- **subaccount** (optional): If present, the token is restricted to this subaccount. **If absent, the token is account-wide.**
- **scope**: One of `read-only`, `assign`, `operate`, `all`
- **created**: Creation timestamp (ISO 8601)
- **expiry** (optional): Expiration timestamp. **If absent, the token does not expire.**

---

### Get Token

`GET /v1/accounts/tokens/{token_id}`

#### Description

Returns metadata for a single token. As with [List Tokens](#list-tokens), the actual token string is never returned.

#### How to Use

**Path Parameters:**

- **token_id** (string, required): Numeric Attestant token ID (e.g., `"1904441549064766374"`).

#### Example

```bash
curl -X GET https://client.attestant.io/v1/accounts/tokens/1904441549064766374 \
  -H "Authorization: Bearer <your-api-token>"
```

#### Response

**Status: 200 OK**

```json
{
  "id": "1904441549064766374",
  "name": "Customer 1 read-only",
  "subaccount": "Customer 1",
  "scope": "read-only",
  "created": "2026-05-22T06:22:26+0000",
  "expiry": "2027-01-01T00:00:00+0000"
}
```

Fields are identical to those in [List Tokens](#list-tokens).

---

### Create Token

`POST /v1/accounts/tokens`

#### Description

Creates a new account token. The caller must hold a token with `scope: operate` or higher.

The returned `token` string is the secret to be stored or delivered to the consumer. **It is only returned in this response — it cannot be recovered from `GET /v1/accounts/tokens/{id}` afterwards.** If lost, the token must be deleted and re-issued.

#### How to Use

**Request Body:**

- **name** (string, required): Human-readable token name.
- **scope** (string, required): One of `read-only`, `assign`, `operate`, `all`. (`all` is reserved and may be rejected by the API even when listed in the enum.)
- **subaccount** (string, optional): Subaccount to restrict this token to. If omitted, the token is account-wide — see [Subaccount Scoping](#subaccount-scoping).
- **expiry** (string, optional): ISO 8601-formatted expiration timestamp (`YYYY-MM-DDTHH:MM:SS+ZZZZ`). If omitted, the token never expires.

#### Example

```bash
curl -X POST https://client.attestant.io/v1/accounts/tokens \
  -H "Authorization: Bearer <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer 1 read-only",
    "scope": "read-only",
    "subaccount": "Customer 1",
    "expiry": "2027-01-01T00:00:00+0000"
  }'
```

#### Response

**Status: 201 Created**

```json
{
  "id": "1904444477120971689",
  "name": "Customer 1 read-only",
  "subaccount": "Customer 1",
  "token": "fd89e6a635be910a4f0d534491875994",
  "created": "2026-05-22T06:22:26+0000",
  "expiry": "2027-01-01T00:00:00+0000"
}
```

**Response Fields:**

- **id**: Attestant token ID — use this for subsequent `GET` and `DELETE` calls
- **name**: The token name
- **subaccount** (optional): Echoes the subaccount restriction if set
- **token**: **The secret bearer token.** Capture this immediately — it is not returned again
- **created**: Creation timestamp
- **expiry** (optional): Expiration timestamp if set

---

### Delete Token

`DELETE /v1/accounts/tokens/{token_id}`

#### Description

Revokes an account token. Once revoked, the token is rejected on all subsequent calls. Use this to rotate tokens on a schedule, revoke compromised tokens, or decommission tokens when a customer offboards. The caller must hold a token with `scope: operate` or higher.

#### How to Use

**Path Parameters:**

- **token_id** (string, required): Numeric Attestant token ID.

#### Example

```bash
curl -X DELETE https://client.attestant.io/v1/accounts/tokens/1904444477120971689 \
  -H "Authorization: Bearer <your-api-token>"
```

#### Response

**Status: 200 OK**

The response body is empty. After deletion, `GET /v1/accounts/tokens/{token_id}` for the same ID returns `404`.

---

### Best Practices

1. **Always set `subaccount`** for customer-issued tokens. An unscoped token can read every other customer's data via unfiltered `GET /v1/eth/validators` and `POST /v1/financials/report`.
2. **Always set `expiry`.** A token with no expiry stays valid until it is explicitly deleted; rotate on a fixed cadence (e.g. 90 days).
3. **Use the lowest scope that works.** Most customer use cases (dashboards, monitoring) need only `read-only`. Customer-driven staking flows need `assign`. `operate` and `all` are administrator credentials.
4. **Capture the `token` string at creation.** It is only returned once; store it via the same mechanism you use for other secrets.
6. **Revoke promptly.** `DELETE /v1/accounts/tokens/{id}` is the only revocation path; do not rely on expiry-driven rotation alone when a customer offboards or a token is compromised.

---

## Further Reading

- [Full API Reference](https://client.attestant.io/docs/#/) — Complete OpenAPI documentation with all available endpoints
