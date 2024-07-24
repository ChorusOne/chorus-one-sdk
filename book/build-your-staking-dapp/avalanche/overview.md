# Overview

Staking on the Avalanche network (AVAX) involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

{% hint style="info" %}
The Avalanche blockchain, renowned for its rapid transaction processing, low fees, and eco-friendly architecture, utilizes a unique consensus protocol known as Avalanche Consensus. This protocol enables a high degree of decentralization and security, allowing validators to participate by staking AVAX, the network's native token.
{% endhint %}

The **Chorus One SDK** simplifies this process, providing developers with the tools needed to build, sign, and broadcast staking transactions.

This guide will walk you through the fundamentals of staking on Avalanche using the Chorus One SDK.

## Setting Up the Staker

To get started with staking on the Avalanche network using the Chorus One SDK, you will first need to initialize the SDK.

First, create an instance of the `AvalancheStaker` with the following configuration:

```javascript
import { AvalancheStaker } from '@chorus-one/avalanche'

const staker = new AvalancheStaker({
  rpcUrl: 'https://api.avax.network'
})
```

**Configuration Parameters**:

- **rpcUrl**: The URL of the Avalanche network RPC endpoint.

---

## Initializing the Staker

After configuring the `AvalancheStaker`, you can initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init()
```

The `init` method establishes a connection with the configured RPC endpoint and prepares the staker for operations such as building and broadcasting transactions.

---

## Building Transactions

Once the staker and signer are set up, you can start building transactions for staking operations.

The `AvalancheStaker` method provides the ability to build transactions for staking and transfer of AVAX tokens.

- You can learn more about these methods in the [Methods](methods.md) section.

**Example of building a staking transaction:**

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: 'P-fuji10uzff2f0u8hstlr5ywt2x4lactmn28c5y9uddv',
  validatorAddress: 'NodeID-LkDLSLrAW1E7Sga1zng17L1AqrtkyWTGg',
  amount: '1' // 1 AVAX
})
```

---

## Getting the Validator Address provided by Chorus One

The `@chorus-one/avalanche` module includes a list of Chorus One validators for the Avalanche network.

You can use these addresses when building staking transactions.

```javascript
import { CHORUS_ONE_AVALANCHE_VALIDATORS } from '@chorus-one/avalanche'

const validatorAddress = CHORUS_ONE_AVALANCHE_VALIDATORS[0]
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
By integrating Fireblocks, you can leverage its robust security features to sign transactions on the Avalanche network.

To set up Fireblocks, you will need to provide the necessary API key, secret key, and vault ID:

```javascript
import { AvalancheStaker } from '@chorus-one/Avalanche'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'AVAXTEST',
  addressDerivationFn: AvalancheStaker.getAddressDerivationFn()
})

await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0xe34600026d96051Cf9b8b9f3e2f51f1f3f3f3f3f',
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
const { txId } = await staker.broadcast({ signedTx })
```

And now you can track the transaction status:

```javascript
const { status, receipt } = await staker.getTxStatus({ txId, chain: 'P' })

console.log(status) // 'success'
```

{% hint style="info" %}
The signature of these methods is compatible with the methods provided by popular Avalanche libraries like `@avalabs/avalanchejs`.
{% endhint %}

---

## Next Steps

In this section you learned how to set up the Chorus One SDK for the Avalanche network using the Avalanche Fuji testnet, which included how to build staking transactions, sign, broadcast, and track them.

- To learn more about the available methods for `AvalancheStaker`, continue to the [Methods](methods.md) section.

## Further Reading

- [AvalancheStaker API Reference](../../docs/classes/avalanche_src.AvalancheStaker.md)
- [What is a Signer?](../signers-explained/what-is-a-signer.md)

```

```
