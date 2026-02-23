# Chorus One SDK: Polygon

All-in-one toolkit for building staking dApps on Polygon PoS network.

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK for Polygon staking, please visit our [main documentation](https://chorus-one.gitbook.io/sdk/build-your-staking-dapp/polygon/overview).

## Installation

In the project's root directory, run the following command:

```bash
npm install @chorus-one/polygon
```

## Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast staking transactions on Polygon PoS.

### Configuration

```javascript
import { PolygonStaker } from '@chorus-one/polygon'

const staker = new PolygonStaker({
  network: 'mainnet', // 'mainnet' (Ethereum L1) or 'testnet' (Sepolia L1)
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY' // Optional: uses viem's default if not provided
})
```

### Querying Staking Information

```javascript
const delegatorAddress = '0xYourAddress'
const validatorShareAddress = '0xValidatorShareContract'

// Get staking info (balance, shares, exchange rate)
const stake = await staker.getStake({ delegatorAddress, validatorShareAddress })
console.log('Staked Balance:', stake.balance, 'POL')
console.log('Shares:', stake.shares)
console.log('Exchange Rate:', stake.exchangeRate)

// Get pending rewards
const rewards = await staker.getLiquidRewards({ delegatorAddress, validatorShareAddress })
console.log('Pending Rewards:', rewards, 'POL')

// Get POL allowance for StakeManager
const allowance = await staker.getAllowance(delegatorAddress)
console.log('Current Allowance:', allowance, 'POL')

// Get unbond info (for pending unstakes)
const unbondNonce = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })
if (unbondNonce > 0n) {
  const unbond = await staker.getUnbond({ delegatorAddress, validatorShareAddress, unbondNonce })
  console.log('Amount:', unbond.amount, 'POL')
  console.log('Withdrawable:', unbond.isWithdrawable)
  console.log('Shares:', unbond.shares)
  console.log('Withdraw Epoch:', unbond.withdrawEpoch)

  // Or fetch multiple unbonds efficiently in a single RPC call
  const unbonds = await staker.getUnbonds({
    delegatorAddress,
    validatorShareAddress,
    unbondNonces: [1n, 2n, 3n]
  })
  unbonds.forEach((u, i) => console.log(`Unbond ${i + 1}: ${u.amount} POL, withdrawable: ${u.isWithdrawable}`))
}

// Get current epoch and withdrawal delay
const epoch = await staker.getEpoch()
const withdrawalDelay = await staker.getWithdrawalDelay()
console.log('Current Epoch:', epoch)
console.log('Withdrawal Delay:', withdrawalDelay, 'epochs')
```

### Approve POL Tokens

Before staking, you must approve the StakeManager contract to spend your POL tokens:

```javascript
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { tx: approveTx } = await staker.buildApproveTx({
  amount: '1000' // Amount in POL, or 'max' for unlimited approval
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx: approveTx
})

const { txHash } = await staker.broadcast({ signedTx })
```

### Stake (Delegate) to Validator

Delegate POL tokens to a validator via their ValidatorShare contract.

You must provide exactly one of `slippageBps` or `minSharesToMint` (not both). There is no default — omitting both will throw an error.

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorShareAddress,
  amount: '1000', // Amount in POL
  slippageBps: 50 // 0.5% slippage tolerance (auto-calculates minSharesToMint)
  // Or use minSharesToMint directly: minSharesToMint: 999n * 10n ** 18n
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

const { txHash } = await staker.broadcast({ signedTx })
```

### Unstake (Unbond) from Validator

Create an unbond request to unstake POL tokens. After the unbonding period (~80 epochs, approximately 3-4 days), call withdraw to claim funds.

You must provide exactly one of `slippageBps` or `maximumSharesToBurn` (not both). There is no default — omitting both will throw an error.

```javascript
const { tx } = await staker.buildUnstakeTx({
  delegatorAddress,
  validatorShareAddress,
  amount: '500', // Amount in POL
  slippageBps: 50 // 0.5% slippage tolerance (auto-calculates maximumSharesToBurn)
  // Or use maximumSharesToBurn directly: maximumSharesToBurn: 501n * 10n ** 18n
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

const { txHash } = await staker.broadcast({ signedTx })
```

### Withdraw Unstaked Tokens

Claim unstaked POL tokens after the unbonding period has elapsed. Each unstake creates a separate unbond with its own nonce:

```javascript
// Get the unbond nonce for the unstake you want to withdraw
const unbondNonce = await staker.getUnbondNonce({ delegatorAddress, validatorShareAddress })

const { tx } = await staker.buildWithdrawTx({
  delegatorAddress,
  validatorShareAddress,
  unbondNonce
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

const { txHash } = await staker.broadcast({ signedTx })
```

### Claim Rewards

Claim accumulated delegation rewards and send them to your wallet:

```javascript
const { tx } = await staker.buildClaimRewardsTx({
  delegatorAddress,
  validatorShareAddress
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

const { txHash } = await staker.broadcast({ signedTx })
```

### Compound (Restake) Rewards

Restake accumulated rewards back into the validator, increasing your delegation without new tokens:

```javascript
const { tx } = await staker.buildCompoundTx({
  delegatorAddress,
  validatorShareAddress
})

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

const { txHash } = await staker.broadcast({ signedTx })
```

### Tracking Transaction Status

```javascript
const { status, receipt } = await staker.getTxStatus({ txHash })

console.log(status) // 'success', 'failure', or 'unknown'
```

## Key Features

- **Ethereum L1 Based**: Polygon PoS staking operates via ValidatorShare contracts deployed on Ethereum mainnet (or Sepolia for testnet)
- **POL Token Staking**: Stake the native POL token (formerly MATIC) to validators
- **Human-Readable Amounts**: Pass token amounts as strings (e.g., '1.5'), conversion to wei is handled automatically
- **Slippage Protection**: Stake and unstake operations require either `slippageBps` (basis points) for automatic slippage calculation, or manual `minSharesToMint`/`maximumSharesToBurn` parameters. Exactly one must be provided — there is no default.
- **Query Methods**: Read stake balances, rewards, allowances, unbond status (with POL amount and withdrawability), and epoch information
- **Rewards Management**: Claim rewards to wallet or compound them back into your delegation

## Important Notes

- **Token Approval**: You must approve the StakeManager contract to spend POL tokens before staking. Use `buildApproveTx()` to create the approval transaction.
- **Unbonding Period**: After unstaking, there is an unbonding period of ~80 epochs (approximately 3-4 days) before tokens can be withdrawn.
- **Unbond Nonces**: Each unstake operation creates a separate unbond request with an incrementing nonce. Withdrawals must be done per-nonce. Claimed unbonds are deleted, but the nonce counter never decrements. Use `getUnbonds()` to efficiently fetch multiple unbond requests in a single RPC call.
- **Referrer Tracking**: Transaction builders that support referrer tracking (stake, unstake, claim rewards, compound) append a tracking marker to the transaction calldata. By default, `sdk-chorusone-staking` is used as the referrer. You can provide a custom referrer via the `referrer` parameter.
- **Exchange Rate**: The exchange rate between shares and POL may fluctuate. Use `slippageBps` for automatic slippage protection, or specify `minSharesToMint`/`maximumSharesToBurn` directly. Foundation validators (ID < 8) use different precision than others.
- **Validator Share Contracts**: Each validator has their own ValidatorShare contract address. You must specify the correct contract address for the validator you want to delegate to.

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
