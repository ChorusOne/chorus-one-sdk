# Overview

Staking on the Monad network involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

{% hint style="info" %}

Monad is a high-performance EVM-compatible blockchain that uses a Proof of Stake (PoS) consensus mechanism. The network features native staking through a precompiled contract at address `0x0000000000000000000000000000000000001000`. By staking MON, Monad's native token, validators and delegators maintain the network, secure the blockchain, and earn rewards through an epoch-based system.

{% endhint %}

The **Chorus One SDK** simplifies the staking process on the Monad network, providing developers with the tools needed to build, sign, and broadcast staking transactions.

This guide will walk you through the fundamentals of staking on Monad using the Chorus One SDK.

{% hint style="info" %}

**Compatibility Notice**

The Monad SDK is built on [viem](https://viem.sh), a modern TypeScript library for Ethereum interactions. This ensures type-safety and compatibility with the Ethereum ecosystem while leveraging Monad's native staking capabilities.

{% endhint %}

## Understanding Monad Staking

### Epoch System

Monad uses an epoch-based staking system with the following characteristics:

- An **epoch** is a range of rounds during which the validator set remains unchanged
- A **boundary block** marks the initial point of the end of an epoch
- The **epoch delay period** is the time between a boundary block and the start of the next epoch
- Stake changes only take effect at epoch boundaries

**Activation Timing:**

Staking operations (delegate, undelegate, compound) submitted:

- **Before the boundary block**: Changes activate in epoch **N+1**
- **During the epoch delay period** (after boundary block): Changes activate in epoch **N+2**

You can check the current timing by calling `getEpoch()`, which returns `inEpochDelayPeriod` boolean.

### Withdrawal System

When you undelegate tokens:

1. Create a **withdrawal request** with a unique ID (0-255)
2. Tokens become **inactive** in the validator set in epoch N+1 (before boundary) or N+2 (during epoch delay period)
3. Upon becoming inactive, the stake moves to a **pending state** for `WITHDRAWAL_DELAY` epochs (currently 1 epoch)
4. Once the delay period passes, call `withdraw()` to move the MON back to your account

You can have up to 256 concurrent withdrawal requests per (validator, delegator) tuple.

---

## Setting Up the Staker

To get started with staking on the Monad network using the Chorus One SDK, you will first need to initialize the SDK.

- **Note:** For testing purposes, we will use the Monad testnet.

First, create an instance of `MonadStaker` with the necessary configuration:

```javascript
import { MonadStaker } from '@chorus-one/monad'

const staker = new MonadStaker({
  rpcUrl: 'https://testnet-rpc.monad.xyz'
})
```

**Configuration Parameters**:

- **rpcUrl**: The URL of the Monad network RPC endpoint. This is where the SDK will connect to interact with the network.

---

## Initializing the Staker

After configuring the `MonadStaker`, initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init()
```

The `init` method establishes a connection with the configured RPC endpoint, fetches the chain ID, and prepares the staker for building transactions.

---

## Building Transactions

Once the staker is set up, you can start building transactions for staking operations.

The `MonadStaker` class provides methods to build transactions for delegating, undelegating, claiming rewards, compounding rewards, and withdrawing.

- You can learn more about these methods in the [Methods](methods.md) section.

**Example of building a delegation transaction:**

```javascript
const tx = await staker.buildStakeTx({
  validatorId: 1,
  amount: '1000' // 1000 MON
})
```

{% hint style="info" %}

Unlike some other blockchains, Monad SDK returns **unsigned transaction objects** that are compatible with viem's `sendTransaction` method. You need to use your own wallet client to sign and broadcast transactions.

{% endhint %}

---

## Signing the Transaction

Once the transaction is built, you can sign that transaction using your own signing solution e.g.:

```js
const signedTx = await yourWalletClient.signTransaction(tx)
```

Additionally, you can use the Chorus One SDK to sign transactions using Fireblocks, mnemonic or other methods.

For detailed information on setting up and configuring these options, refer to the [What is a Signer?](../../signers-explained/what-is-a-signer.md) section.

{% tabs %}
{% tab title="Using Fireblocks for Signing" %}
By integrating Fireblocks, you can leverage its robust security features to sign transactions on the Monad network. To set up Fireblocks, provide the necessary API key, secret key, and vault ID:

```javascript
import { MonadStaker } from '@chorus-one/monad'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'ETH',
  addressDerivationFn: MonadStaker.getAddressDerivationFn()
})

await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  tx
})
```

For more information please refer to the [Signing with Fireblocks](../../signers-explained/fireblocks.md)
{% endtab %}
{% endtabs %}

---

## Broadcasting the Transaction

After signing the transaction, you will need to broadcast it to the network. You can do this using the `broadcast` method:

```javascript
const { txHash } = await staker.broadcast({ signedTx })
```

And now you can track the transaction status:

```javascript
const { status, receipt } = await staker.getTxStatus({ txHash })

console.log(status) // 'success'
```

---

## Next Steps

In this section you learned how to set up the Chorus One SDK for the Monad network, which included how to build staking transactions, sign, broadcast, and query staking information.

- To learn more about the available methods on `MonadStaker` continue to the [Methods](methods.md) section.

## Further Reading

- [MonadStaker API Reference](../../docs/classes/monad_src.MonadStaker.md)
- [Monad Staking Documentation](https://docs.monad.xyz/developer-essentials/staking/staking-precompile)
- [Viem Documentation](https://viem.sh)
