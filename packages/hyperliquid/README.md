# Chorus One SDK: Hyperliquid

All-in-one toolkit for building staking dApps on Hyperliquid network.

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK for Hyperliquid staking, please visit our [main documentation](https://chorus-one.gitbook.io/sdk).

## Installation

In the project's root directory, run the following command:

```bash
npm install @chorus-one/hyperliquid
```

## Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast staking transactions on Hyperliquid.

### Configuration

```javascript
import { HyperliquidStaker } from '@chorus-one/hyperliquid'

const staker = new HyperliquidStaker({
  chain: 'Testnet' // or 'Mainnet'
})

await staker.init()
```

### Querying Staking Information

```javascript
const delegatorAddress = '0xYourAddress'

// Get spot balances (HYPE and USDC)
const spotBalances = await staker.getSpotBalances({ delegatorAddress })
console.log('Spot HYPE Balance:', spotBalances.hype)
console.log('Spot USDC Balance:', spotBalances.usdc)

// Get staking summary
const summary = await staker.getStakingSummary({ delegatorAddress })
console.log('Spot Balance:', summary.spotBalance)
console.log('Staking Balance:', summary.stakingBalance)
console.log('Delegations:', summary.delegations)

// Get staking rewards
const rewards = await staker.getDelegatorRewards({ delegatorAddress })

// Get delegation history (useful for verifying transaction success)
const history = await staker.getDelegatorHistory({ delegatorAddress })
```

### Transfer from Spot to Staking

Move tokens from your spot account to staking balance:

```javascript
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { tx } = await staker.buildSpotToStakingTx({
  amount: '100' // Amount in human-readable tokens (e.g., '1.5' for 1.5 HYPE)
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

const { txHash } = await staker.broadcast({
  signedTx,
  delegatorAddress
})
```

### Stake to Validator

Delegate tokens from your staking balance to a validator (1-day lockup):

```javascript
const validatorAddress = '0xValidatorAddress'

const { tx } = await staker.buildStakeTx({
  validatorAddress,
  amount: '50' // Amount in human-readable tokens
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

const { txHash } = await staker.broadcast({
  signedTx,
  delegatorAddress
})
```

### Unstake from Validator

Undelegate tokens from a validator (1-day lockup):

```javascript
const { tx } = await staker.buildUnstakeTx({
  validatorAddress,
  amount: '25' // Amount in human-readable tokens
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

const { txHash } = await staker.broadcast({
  signedTx,
  delegatorAddress
})
```

### Transfer from Staking to Spot

Move tokens from staking balance back to spot account (7-day queue, max 5 pending withdrawals):

```javascript
const { tx } = await staker.buildWithdrawFromStakingTx({
  amount: '10' // Amount in human-readable tokens
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

const { txHash } = await staker.broadcast({
  signedTx,
  delegatorAddress
})
```

## Key Features

- **REST API Based**: Uses Hyperliquid's REST API endpoints (`/info` and `/exchange`)
- **EIP-712 Signing**: All transactions are signed using EIP-712 typed data
- **Human-Readable Amounts**: Pass token amounts as strings (e.g., '1.5'), conversion to 8-decimal wei format is handled automatically
- **Query Methods**: Read spot balances, staking data, delegations, rewards, and history
- **Write Operations**: Transfer between spot/staking, stake to validators, and unstake
- **Lockup Periods**:
  - Delegations: 1-day lockup per validator
  - Withdrawals: 7-day unstaking queue (max 5 pending withdrawals per address)
- **Staking Rewards**: Auto-compounded daily, ~2.37% APY (at 400M HYPE staked), distributed based on validator performance
- **Validator Economics**: Validators charge commissions (max 1% change per update), can be jailed for poor performance

## Important Notes

- **Token Amounts**: Pass amounts as human-readable strings (e.g., '1.5' for 1.5 HYPE). The SDK automatically converts to Hyperliquid's 8-decimal wei format internally.
- **Delegation Lockup**: Each delegation to a validator has a 1-day lockup period
- **Withdrawal Limits**:
  - Withdrawals from staking to spot go through a 7-day unstaking queue
  - Maximum of 5 pending withdrawals per address
- **Transaction Confirmation**: Hyperliquid API doesn't provide transaction status queries. Use `getDelegatorHistory()` to verify transaction success.
- **Staking Epochs**: Staking epochs are 100,000 rounds (~90 minutes)
- **Reward Distribution**: Rewards accrue every minute based on validator performance and are distributed daily with auto-compounding

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
