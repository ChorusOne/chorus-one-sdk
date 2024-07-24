Staking using Substrate Network SDK on networks like Polkadot and Kusama involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

{% hint style="info" %}

The Substrate blockchain framework is known for its flexibility and modularity, which allows developers to create custom blockchains for specific needs. It supports various consensus mechanisms, including Proof-of-Stake (PoS) and Proof-of-Work (PoW), giving developers options for setting up their governance models and security protocols.

{% endhint %}

The **Chorus One SDK** simplifies this process, providing developers with the tools needed to build, sign, and broadcast staking transactions.

This guide will walk you through the fundamentals of staking on Substrate using the Chorus One SDK.

## Setting Up the Staker

To get started with staking on the Substrate network using the Chorus One SDK, you will first need to initialize the SDK for Substrate.

- **Note:** For testing purposes, we will use the Westend testnet.

First, create an instance of `SubstrateStaker` with the necessary configuration:

```javascript
import { SubstrateStaker, RewardDestination } from '@chorus-one/substrate'

const staker = new SubstrateStaker({
  rpcUrl: 'wss://westend-rpc.polkadot.io',
  rewardDestination: RewardDestination.STASH
})
```

**Configuration Parameters**:

- **rpcUrl**: The URL of the Substrate network RPC endpoint
- **rewardDestination**: This parameter defines the reward destination for staking rewards. The options are `RewardDestination.STASH` or `RewardDestination.STAKED`.

  - `RewardDestination.STASH`: Rewards are added to the stash account.
  - `RewardDestination.CONTROLLER`: Rewards are added to the controller account.

- **fee**: (Optional) The fee to be paid for each transaction.
- **indexerUrl**: (Optional) The URL of the Substrate network indexer. It is required for fetching the transaction status.

---

## Initializing the Staker

After configuring the `SubstrateStaker`, initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init()
```

The `init` method establishes a connection with the configured RPC endpoint and prepares the staker for operations such as building and broadcasting transactions.

---

## Building Transactions

Once the staker and signer are set up, you can start building transactions for staking operations.

The `SubstrateStaker` class provides methods to build transactions for staking, unstaking, and withdrawing rewards.

- You can learn more about these methods in the [Methods](./methods.md) section.

**Example of building a staking transaction:**

```javascript
const { tx } = await staker.buildStakeTx({
  amount: '1' // 1 WND
})
```

---

## Getting the Validator Address provided by Chorus One

The `@chorus-one/substrate` module includes a list of Chorus One validators for the Substrate networks. You can use these addresses when building transactions.

```javascript
import { CHORUS_ONE_SUBSTRATE_VALIDATORS } from '@chorus-one/substrate'

const validatorAddresses = CHORUS_ONE_SUBSTRATE_VALIDATORS.POLKADOT
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

By integrating Fireblocks, you can leverage its robust security features to sign transactions on the Substrate network. To set up Fireblocks, provide the necessary API key, secret key, and vault ID:

```javascript
import { SubstrateStaker } from '@chorus-one/substrate'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'WND',
  addressDerivationFn: SubstrateStaker.getAddressDerivationFn()
})

await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '5CavrskYZHeLxTwERikgZDCZPmhpsM7oXZQmL6rkNryDD8FwN',
  tx
})
```

For more information please refer to the [Signing with Fireblocks](../signers-explained/fireblocks.md)

{% endtab %}
{% endtabs %}

---

## Broadcasting the Transaction

After signing the transaction, you need broadcast it to the network. You can do this using the `broadcast` method:

```javascript
const { txHash } = await staker.broadcast({ signedTx })
```

And now you can track the transaction status:

```javascript
const { status, receipt } = await staker.getTxStatus({ txHash })

console.log(status) // 'success'
```

{% hint style="info" %}
The signature of these methods is compatible with the methods provided by popular Substrate libraries like `@polkadot/api`.
{% endhint %}

## Closing the Connection

After completing the staking operations, close the connection to the Substrate network:

```javascript
await staker.close()
```

---

## Next Steps

In this section you learned how to set up the Chorus One SDK for the Substrate network using the Substrate testnet, which included how to build staking transactions, sign, broadcast, and track them.

- To learn more about the available methods on `SubstrateStaker`, continue to the [Methods](./methods.md) section.

## Further Reading

- [SubstrateStaker API Reference](../../docs/classes/avalanche_src.SubstrateStaker.md)
- [What is a Signer?](../signers-explained/what-is-a-signer.md)
