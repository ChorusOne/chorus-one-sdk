Staking on the NEAR blockchain involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

{% hint style="info" %}

The NEAR blockchain, known for its scalability, low transaction fees, and developer-friendly environment, employs a Proof-of-Stake (PoS) consensus mechanism, which allows validators and delegators to participate in maintaining the network.

{% endhint %}

The **Chorus One SDK** simplifies this process, providing developers with the tools needed to build, sign, and broadcast staking transactions.

{% hint style="info" %}

### Compatibility Notice

The methods provided in this documentation are compatible with popular NEAR libraries such as `near-api-js`. This compatibility ensures that you can seamlessly integrate these methods into your existing NEAR projects.

{% endhint %}

This guide will walk you through the fundamentals of staking on NEAR using the Chorus One SDK.

## Setting Up the Staker

To get started with staking on the NEAR network using the Chorus One SDK, you will first need to initialize the SDK for NEAR.

- (For testing purposes, we will use the NEAR testnet).

First, create an instance of `NearStaker` with the necessary configuration:

```javascript
import { NearStaker } from '@chorus-one/near'

const staker = new NearStaker({
  networkId: 'testnet',
  rpcUrl: 'https://rpc.testnet.near.org'
})
```

**Configuration Parameters**:

- **networkId**: The network ID of the NEAR network (e.g., `mainnet`, `testnet`)
- **rpcUrl**: The URL of the NEAR network RPC endpoint
- **denomMultiplier**: (Optional) This parameter defines the scaling factor used to convert from the smallest unit of the network’s currency (`yoctoNear`) to its base unit (`NEAR`).

  For the NEAR mainnet, `1 NEAR` is equal to `1,000,000,000 yoctoNear`, hence the multiplier is `1,000,000,000`. This value is used to convert the amount of tokens in transactions.

- **gas**: (Optional) The maximum amount of gas to use for transactions. This value can be adjusted based on the complexity of the transactions.

---

## Initializing the Staker

After configuring the `NearStaker`, initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init()
```

The `init` method establishes a connection with the configured RPC endpoint and prepares the staker for operations such as building and broadcasting transactions.

---

## Building Transactions

Once the staker and signer are set up, you can start building transactions for staking operations.

The `NearStaker` class provides methods to build transactions for staking, unstaking, and withdrawing rewards.

- You can learn more about these methods in the [Methods](./methods.md) section.

**Example of building a staking transaction:**

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: 'your.near',
  validatorAddress: 'chorusone.pool.f863973.m0',
  amount: '1' // 1 NEAR
})
```

---

## Getting the Validator Address provided by Chorus One

The `@chorus-one/near` module includes the `CHORUS_ONE_NEAR_VALIDATOR` constant, which contains the Chorus One validator address for building transactions.

```javascript
import { CHORUS_ONE_NEAR_VALIDATOR } from '@chorus-one/near'

const validatorAddress = CHORUS_ONE_NEAR_VALIDATOR
```

---

## Signing the Transaction

Once the transaction is built, you can sign that transaction using your own signing solution e.g.:

```js
const signedTx = await yourWallet.signTransaction(tx)
```

Additionally, you can use the Chorus One SDK to sign transactions using Fireblocks, mnemonic or other methods.

- For detailed information on setting up and configuring these options, please refer to the [What is a Signer?](../../signers-explained/what-is-a-signer.md) section.

{% tabs %}
{% tab title="Using Fireblocks for Signing" %}

By integrating Fireblocks, you can leverage its robust security features to sign transactions on the NEAR network. To set up Fireblocks, provide the necessary API key, secret key, and vault ID:

```javascript
import { NearStaker } from '@chorus-one/near'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'NEAR_TEST',
  addressDerivationFn: NearStaker.getAddressDerivationFn()
})

await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: 'your.near',
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
const {
  transaction: { hash: txHash }
} = await staker.broadcast({ signedTx })
```

And now you can track the transaction status:

```javascript
const { status, receipt } = await staker.getTxStatus({
  address: 'your.near',
  txHash
})

console.log(status) // 'success'
```

---

## Next Steps

In this section you learned how to set up the Chorus One SDK for the NEAR network using the NEAR testnet, which included how to build staking transactions and sign/broadcast them.

- To learn more about the available methods on `NearStaker`, continue to the [Methods](./methods.md) section.

## Further Reading

- [NEARStaker API Reference](../../docs/classes/near_src.NearStaker.md)
- [What is a Signer?](../../signers-explained/what-is-a-signer.md)

```

```
