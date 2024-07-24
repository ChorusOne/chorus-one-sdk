This section provides an overview of the key methods available in the **Chorus One SDK** for staking on the Solana network.

The Chorus One SDK supports a range of staking operations including staking, unstaking, and withdrawing rewards. Below, we explore each method with practical examples to help you get started.

## buildStakeTx

### Description

The `buildStakeTx` method helps you create a transaction for staking tokens with a validator. Staking tokens involves locking them up to support the network's security and operations, and in return you earn rewards.

### How to Use

To build a staking transaction, you need to specify the amount to stake, the stake owner's address (your wallet), and the validator's address where you want to stake your tokens.

### Example

```javascript
import { CHORUS_ONE_SOLANA_VALIDATOR } from '@chorus-one/solana'

const { tx } = await staker.buildStakeTx({
  ownerAddress: '3Ps2hwsgGMSuqxAwjcGJHiEpMsSTZcxrCGprHgxWkfma',
  validatorAddress: CHORUS_ONE_SOLANA_VALIDATOR,
  amount: '1' // 1 SOL
})
```

In this example, we are staking 1 SOL with a specified validator. The Solana [Stake Account](https://solana.com/docs/economics/staking/stake-accounts) is created automatically, unless you pass the `stakeAccountAddress` argument.

- [Read more in the API Reference](../../docs/classes/solana_src.SolanaStaker.md#buildstaketx)

---

## buildUnstakeTx

### Description

The `buildUnstakeTx` method allows you to create a transaction for unstaking tokens from a validator.

Unstaking involves deactivating your staked tokens, during which they enter an unbonding period. On the Solana network, the unbonding period typically lasts for one epoch, which is approximately 2.5 days. However, the exact duration can vary depending on when the unstaking request is made within the current epoch. During this period, your tokens are not earning rewards and cannot be transferred, as they are in the process of being released from staking.

After the unbonding period, the tokens will become available to withdraw.

### How to Use

To build an unstaking transaction, you need to provide the stake account and it's owner (your wallet address).

### Example

```javascript
const { tx } = await staker.buildUnstakeTx({
  ownerAddress: '3Ps2hwsgGMSuqxAwjcGJHiEpMsSTZcxrCGprHgxWkfma',
  stakeAccountAddress: 'HJRL5PTpvwxmt796M7xDavRbPkjN28iGPVBkJn9y6rYE'
})
```

Here, we're unstaking all the SOL on the stake account.

- [Read more in the API Reference](../../docs/classes/solana_src.SolanaStaker.md#buildunstaketx)

---

## buildWithdrawStakeTx

### Description

The `buildWithdrawStakeTx` method allows you to create a transaction to withdraw the unbonded stake from a Solana staking account.

### How to Use

To build a stake withdrawal transaction, you need to provide the stake account and it's owner address (your wallet address).

### Example

```javascript
const { tx } = await staker.buildWithdrawStakeTx({
  ownerAddress: '3Ps2hwsgGMSuqxAwjcGJHiEpMsSTZcxrCGprHgxWkfma',
  stakeAccountAddress: 'HJRL5PTpvwxmt796M7xDavRbPkjN28iGPVBkJn9y6rYE'
})
```

Here, we are withdrawing all SOL from a stake account to the wallet owner's address.

To withdraw a specifc amount pass the `amount` arugment.

- [Read more in the API Reference](../../docs/classes/solana_src.SolanaStaker.md#buildwithdrawstaketx)

---

## buildCreateStakeAccountTx

### Description

The `buildCreateStakeAccountTx` method allows you to create a new Solana [Stake Account](https://solana.com/docs/economics/staking/stake-accounts).

### How to Use

To build a new create staking account transaction, you will need to provide the owner address (your wallet) and the amount of SOL to transfer.

### Example

```javascript
const { tx } = await staker.buildCreateStakeAccountTx({
  ownerAddress: '3Ps2hwsgGMSuqxAwjcGJHiEpMsSTZcxrCGprHgxWkfma',
  amount: '1' // 1 SOL
})
```

Here, we are creating a new staking account with a balance of 1 SOL, which is being transfered from the owner's address (your wallet).

- [Read more in the API Reference](../../docs/classes/solana_src.SolanaStaker.md#buildcreatestakeaccounttx)

---

## buildMergeStakesTx

### Description

The `buildMergeStakesTx` method allows you to combine two stake accounts into one.

### How to Use

To build a merge stakes transaction, you will need to provide the owner address (your wallet), the stake account source address, and the destination where the funds will be transferred to.

### Example

```javascript
const { tx } = await staker.buildMergeStakesTx({
  ownerAddress: '3Ps2hwsgGMSuqxAwjcGJHiEpMsSTZcxrCGprHgxWkfma',
  sourceAddress: 'HJRL5PTpvwxmt796M7xDavRbPkjN28iGPVBkJn9y6rYE',
  destinationAddress: '...'
})
```

Here, we are merging a source account stake into a different destination account. Please note, after this transaction, the source account will cease to exist.

- [Read more in the API Reference](../../docs/classes/solana_src.SolanaStaker.md#buildmergestakestx)

---

## buildSplitStakesTx

### Description

The `buildSplitStakesTx` method allows you to split one stake account into two separate accounts.

### How to Use

To build a split stake transaction, you will need to provide the owner's address (your wallet), the stake account address that is in use, and the amount of SOL you wish to split and transfer to new stake account.

### Example

```javascript
const { tx } = await staker.buildSplitStakesTx({
  ownerAddress: '3Ps2hwsgGMSuqxAwjcGJHiEpMsSTZcxrCGprHgxWkfma',
  stakeAccountAddress: 'HJRL5PTpvwxmt796M7xDavRbPkjN28iGPVBkJn9y6rYE',
  amount: '1' // 1 SOL
})
```

Here, we are substracting 1 SOL from the source stake account and transferring into a newly created stake account.

- [Read more in the API Reference](../../docs/classes/solana_src.SolanaStaker.md#buildsplitstakestx)

---

## getStake

### Description

The `getStake` method retrieves the staking information from a delegator.

- This includes the amount of tokens currently staked with a validator.

### How to Use

To get staking information, you need to provide the delegator's address (your wallet), and optionally the validator's address. If the validator's address is not provided, the method returns rewards from all validators.

You can also specify the status of the staker. Default is 'active'.

### Example

```javascript
import { CHORUS_ONE_SOLANA_VALIDATOR } from '@chorus-one/solana'

const { balance } = await staker.getStake({
  delegatorAddress: '3Ps2hwsgGMSuqxAwjcGJHiEpMsSTZcxrCGprHgxWkfma'
  validatorAddress: CHORUS_ONE_SOLANA_VALIDATOR
})
console.log(`Staked balance: ${balance}`)
```

In this example, we're retrieving the staked balance for a given delegator and validator.

- [Read more in the API Reference](../../docs/classes/solana_src.SolanaStaker.md#getstake)

---

## Further Reading

For more detailed information and additional methods, please refer to the official API reference:

- [SolanaStaker API Reference](../../docs/classes/solana_src.SolanaStaker.md)
