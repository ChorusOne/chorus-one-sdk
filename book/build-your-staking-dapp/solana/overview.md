# Overview

Staking on the Solana network involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

{% hint style="info" %}

The Solana blockchain, distinguished by its high throughput and low latency, leverages the Proof of History (PoH) mechanism combined with the Tower BFT consensus algorithm. This innovative structure allows for fast transaction processing and scalability without compromising security. By staking SOL, Solana's native token, validators maintain the network, secure the blockchain, and incentivize active participation, ensuring the network remains robust and efficient.

{% endhint %}

The **Chorus One SDK** simplifies the staking process on the Solana network, providing developers with the tools needed to build, sign, and broadcast staking transactions.

This guide will walk you through the fundamentals of staking on Solana using the Chorus One SDK.

## Setting Up the Staker

To get started with staking on the Solana network using the Chorus One SDK, you will first need to initialize the SDK.

- **Note:** For testing purposes, we will use the Solana testnet.

First, create an instance of `SolanaStaker` with the necessary configuration:

```javascript
import { SolanaStaker } from '@chorus-one/solana'

const staker = new SolanaStaker({
  rpcUrl: 'https://api.testnet.solana.com'
})
```

**Configuration Parameters**:

- **rpcUrl**: The URL of the Solana network RPC endpoint. This is where the SDK will connect to interact with the network. In this example, we are using a public endpoint for the Solana testnet.

---

## Initializing the Staker

After configuring the `SolanaStaker`, initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init()
```

The `init` method establishes a connection with the configured RPC endpoint and prepares the staker for operations such as building and broadcasting transactions.

---

## Building Transactions

Once the staker is set up, you can start building transactions for staking operations.

The `SolanaStaker` class provides methods to build transactions for staking, unstaking, merging and splitting stakes, and creating stake accounts.

- You can learn more about these methods in the [Methods](methods.md) section.

**Example of building a staking transaction:**

```javascript
const { tx, stakeAccountAddress } = await staker.buildStakeTx({
  delegatorAddress: '3Ps2hwsgGMSuqxAwjcGJHiEpMsSTZcxrCGprHgxWkfma',
  validatorAddress: 'Chorus6Kis8tFHA7AowrPMcRJk3LbApHTYpgSNXzY5KE',
  amount: '1' // 1 SOL
})
```

Optionally you can specify the stake account address by passing the `stakeAccountAddress` argument. If it is not provided, the SDK will create a new stake account for you and return the address.

{% hint style="info" %}

On the Solana network, a stake account lets you delegate tokens to validators to earn rewards. Unlike a wallet account, which is limited, a stake account can handle the token delegation.

{% endhint %}

---

## Getting the Validator Address provided by Chorus One

The `@chorus-one/solana` module includes the `CHORUS_ONE_SOLANA_VALIDATOR` constant, which contains the Chorus One validator address for building transactions.

```javascript
import { CHORUS_ONE_SOLANA_VALIDATOR } from '@chorus-one/solana'

const validatorAddress = CHORUS_ONE_SOLANA_VALIDATOR
```

---

## Signing the Transaction

Once the transaction is built, you can sign that transaction using your own signing solution e.g.:

```js
const signedTx = await yourWallet.signTransaction(tx)
```

Additionally, you can use the Chorus One SDK to sign transactions using Fireblocks, mnemonic or other methods.

- For detailed information on setting up and configuring these options, please refer to the [What is a Signer?](../signers-explained/what-is-a-signer.md) section.

{% tabs %}
{% tab title="Using Fireblocks for Signing" %}
By integrating Fireblocks, you can leverage its robust security features to sign transactions on the Solana network. To set up Fireblocks, you will need to provide the necessary API key, secret key, and vault ID:

```javascript
import { SolanaStaker } from '@chorus-one/solana'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'SOL_TEST',
  addressDerivationFn: SolanaStaker.getAddressDerivationFn()
})

await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '3Ps2hwsgGMSuqxAwjcGJHiEpMsSTZcxrCGprHgxWkfma',
  tx
})
```

For more information please refer to the [Signing with Fireblocks](../signers-explained/fireblocks.md)
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

{% hint style="info" %}
The signature of these methods is compatible with the methods provided by popular Solana libraries like `@solana/web3.js`.
{% endhint %}

---

## Next Steps

In this section you learned how to set up the Chorus One SDK for the Solana network using the Solana testnet, which included how to build staking transactions, sign, broadcast, and track them.

- To learn more about the available methods on `SolanaStaker` continue to the [Methods](methods.md) section.

## Further Reading

- [SolanaStaker API Reference](../../docs/classes/solana_src.SolanaStaker.md)
- [What is a Signer?](../signers-explained/what-is-a-signer.md)
