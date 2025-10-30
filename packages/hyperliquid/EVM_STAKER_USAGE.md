# HyperliquidEvmStaker Usage Guide

The `HyperliquidEvmStaker` class enables staking operations on HyperCore from HyperEVM. This allows EVM wallets and smart contracts to interact with HyperCore's staking system using standard EVM transactions.

## Key Concepts

### CoreWriter System Contract

All HyperCore interactions from HyperEVM go through the **CoreWriter** system contract at address `0x3333333333333333333333333333333333333333`.

The CoreWriter uses a standardized encoding format:

- **4-byte header**: `[version][action_id_3_bytes]`
  - Version: `0x01` (current version)
  - Action ID: 3-byte big-endian integer
- **Remaining bytes**: ABI-encoded action parameters

### Action Delay

**Important**: Actions sent through CoreWriter are delayed by a few seconds on HyperCore to prevent MEV (Maximal Extractable Value) advantages. Your transaction will appear twice in the L1 explorer:

1. First when enqueued on HyperEVM
2. Again when executed on HyperCore (a few seconds later)

### Supported Staking Actions

| Action                            | ID  | Description                            | Lockup Period       |
| --------------------------------- | --- | -------------------------------------- | ------------------- |
| Staking Deposit (Spot → Staking)  | 4   | Move HYPE from spot to staking balance | None                |
| Staking Withdraw (Staking → Spot) | 5   | Withdraw from staking balance          | 7 days              |
| Token Delegate (Stake)            | 3   | Delegate to validator                  | 1 day per validator |
| Token Delegate (Unstake)          | 3   | Undelegate from validator              | 1 day               |

## Installation

```bash
npm install @chorus-one/hyperliquid
```

## Basic Usage

### 1. Initialize the Staker

```typescript
import { HyperliquidEvmStaker } from '@chorus-one/hyperliquid'

const staker = new HyperliquidEvmStaker({
  chain: 'Mainnet'
})

await staker.init()
```

### 2. Move HYPE from Spot to Staking Balance

Before you can delegate to validators, you need to move HYPE from your spot account to your staking balance.

```typescript
// Build the transaction
const { tx } = await staker.buildSpotToStakingTx({
  amount: '100.0' // 100 HYPE
})

// Sign the transaction
const { signedTx } = await staker.sign({
  signer: yourSigner,
  signerAddress: '0xYourAddress',
  tx
})

// Broadcast to HyperEVM
const { txHash } = await staker.broadcast({ signedTx })

console.log('Transaction hash:', txHash)
// The action will be executed on HyperCore after a few seconds delay
```

### 3. Delegate to a Validator (Stake)

Once you have HYPE in your staking balance, you can delegate to validators.

```typescript
const { tx } = await staker.buildStakeTx({
  validatorAddress: '0xValidatorAddress',
  amount: '50.0' // Delegate 50 HYPE
})

const { signedTx } = await staker.sign({
  signer: yourSigner,
  signerAddress: '0xYourAddress',
  tx
})

const { txHash } = await staker.broadcast({ signedTx })

// Note: Delegations have a 1-day lockup period per validator
```

### 4. Undelegate from a Validator (Unstake)

```typescript
const { tx } = await staker.buildUnstakeTx({
  validatorAddress: '0xValidatorAddress',
  amount: '25.0' // Undelegate 25 HYPE
})

const { signedTx } = await staker.sign({
  signer: yourSigner,
  signerAddress: '0xYourAddress',
  tx
})

const { txHash } = await staker.broadcast({ signedTx })

// Note: Undelegations have a 1-day lockup period
```

### 5. Withdraw from Staking Balance to Spot

After undelegating, you can withdraw HYPE back to your spot account.

```typescript
const { tx } = await staker.buildWithdrawFromStakingTx({
  amount: '25.0' // Withdraw 25 HYPE to spot
})

const { signedTx } = await staker.sign({
  signer: yourSigner,
  signerAddress: '0xYourAddress',
  tx
})

const { txHash } = await staker.broadcast({ signedTx })

// Note: Withdrawals go through a 7-day unstaking queue
```

## Complete Workflow Example

```typescript
import { HyperliquidEvmStaker } from '@chorus-one/hyperliquid'
import { LocalSigner } from '@chorus-one/signer'

async function stakeOnHyperCore() {
  // 1. Initialize staker
  const staker = new HyperliquidEvmStaker({
    rpcUrl: 'https://api.hyperliquid-testnet.xyz/evm'
  })
  await staker.init()

  // 2. Initialize signer
  const signer = new LocalSigner({
    privateKey: 'your-private-key'
  })
  await signer.init()

  const addresses = await signer.getAddresses(HyperliquidEvmStaker.getAddressDerivationFn())
  const signerAddress = addresses[0]

  // 3. Move HYPE to staking balance
  console.log('Step 1: Moving HYPE to staking balance...')
  const { tx: depositTx } = await staker.buildSpotToStakingTx({
    amount: '100.0'
  })

  const { signedTx: signedDeposit } = await staker.sign({
    signer,
    signerAddress,
    tx: depositTx
  })

  const { txHash: depositHash } = await staker.broadcast({
    signedTx: signedDeposit
  })
  console.log('Deposit tx:', depositHash)

  // Wait for the action to be executed on HyperCore (few seconds delay)
  await new Promise((resolve) => setTimeout(resolve, 10000))

  // 4. Delegate to validator
  console.log('Step 2: Delegating to validator...')
  const { tx: stakeTx } = await staker.buildStakeTx({
    validatorAddress: '0x0000000000000000000000000000000000000000',
    amount: '50.0'
  })

  const { signedTx: signedStake } = await staker.sign({
    signer,
    signerAddress,
    tx: stakeTx
  })

  const { txHash: stakeHash } = await staker.broadcast({
    signedTx: signedStake
  })
  console.log('Stake tx:', stakeHash)
  console.log('Delegation will be active after 1-day lockup period')
}

stakeOnHyperCore()
```

## Querying Staking State

The `HyperliquidEvmStaker` only handles transaction building and broadcasting. To query your staking state (balances, delegations, rewards), use the `HyperliquidStaker` class which connects to the HyperCore Info API:

```typescript
import { HyperliquidStaker } from '@chorus-one/hyperliquid'

const coreStaker = new HyperliquidStaker({
  chain: 'Testnet'
})

// Get staking summary
const summary = await coreStaker.getStakingSummary({
  delegatorAddress: '0xYourAddress'
})

console.log('Staking balance:', summary.totalDelegated)
console.log('Undelegated:', summary.totalUndelegated)

// Get active delegations
const delegations = await coreStaker.getDelegations({
  delegatorAddress: '0xYourAddress'
})

delegations.forEach((d) => {
  console.log(`Validator: ${d.validator}, Amount: ${d.delegated}`)
})

// Get rewards
const rewards = await coreStaker.getDelegatorRewards({
  delegatorAddress: '0xYourAddress'
})
```

## Action Encoding Details

If you need to integrate with smart contracts or build custom transactions, here's how CoreWriter actions are encoded:

### Example: Token Delegate Action (ID: 3)

```solidity
// Solidity parameters
struct TokenDelegate {
    address validator;    // Validator address
    uint64 wei;          // Amount in wei (HYPE uses 8 decimals on Core)
    bool isUndelegate;   // false = delegate, true = undelegate
}

// ABI encoding
bytes memory params = abi.encode(validator, wei, isUndelegate);

// 4-byte header
bytes memory header = new bytes(4);
header[0] = 0x01;  // version
header[1] = 0x00;  // action ID byte 1
header[2] = 0x00;  // action ID byte 2
header[3] = 0x03;  // action ID byte 3 (3 = TOKEN_DELEGATE)

// Complete action data
bytes memory actionData = abi.encodePacked(header, params);

// Send to CoreWriter
CoreWriter(0x3333333333333333333333333333333333333333).sendRawAction(actionData);
```

### Example: Staking Deposit Action (ID: 4)

```solidity
// Solidity parameters
uint64 wei;  // Amount in wei

// ABI encoding
bytes memory params = abi.encode(wei);

// 4-byte header
bytes memory header = new bytes(4);
header[0] = 0x01;  // version
header[1] = 0x00;  // action ID byte 1
header[2] = 0x00;  // action ID byte 2
header[3] = 0x04;  // action ID byte 3 (4 = STAKING_DEPOSIT)

// Complete action data
bytes memory actionData = abi.encodePacked(header, params);

// Send to CoreWriter
CoreWriter(0x3333333333333333333333333333333333333333).sendRawAction(actionData);
```

## Important Notes

### Decimal Precision

- **HyperCore**: HYPE uses **8 decimals** (wei)
- **HyperEVM**: HYPE uses **18 decimals** (standard EVM)
- The SDK automatically handles conversion - just provide human-readable amounts (e.g., "100.0")

### Nonce Management

- The SDK automatically fetches the current nonce for your address
- If you need to send multiple transactions in parallel, you should manage nonces manually

### Gas Estimation

- The SDK automatically estimates gas for each transaction
- CoreWriter actions typically use ~47,000 gas
- You can provide custom gas settings in the transaction object if needed

### Error Handling

```typescript
try {
  const { tx } = await staker.buildStakeTx({
    validatorAddress: '0xInvalidAddress',
    amount: '1000000.0' // More than you have
  })

  const { signedTx } = await staker.sign({
    signer,
    signerAddress,
    tx
  })

  const { txHash } = await staker.broadcast({ signedTx })
} catch (error) {
  if (error.message.includes('insufficient balance')) {
    console.error('Not enough HYPE to stake')
  } else if (error.message.includes('execution reverted')) {
    console.error('Transaction reverted on HyperCore')
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## Differences from HyperliquidStaker (Core)

| Feature            | HyperliquidStaker (Core) | HyperliquidEvmStaker (EVM) |
| ------------------ | ------------------------ | -------------------------- |
| Signing            | EIP-712 structured data  | Standard EVM transaction   |
| Transaction Format | JSON with signature      | RLP-encoded transaction    |
| Execution          | Immediate                | Delayed (few seconds)      |
| API Endpoint       | Exchange API             | EVM RPC                    |
| Contract           | N/A                      | CoreWriter (0x3333...3333) |
| Query Methods      | ✅ Included              | ❌ Use HyperliquidStaker   |

## Resources

- [HyperEVM Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore)
- [CoreWriter Action IDs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore#supported-actions)
- [HyperCore Staking Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint#staking-actions)

## Support

For issues and questions:

- GitHub: [chorus-one/chorus-one-sdk](https://github.com/chorus-one/chorus-one-sdk)
- Discord: [Chorus One Community](https://discord.gg/chorus-one)
