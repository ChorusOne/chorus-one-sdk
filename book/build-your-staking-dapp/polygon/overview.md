# Overview

{% hint style="info" %}
Polygon PoS is a decentralized Ethereum scaling solution that uses a Proof-of-Stake consensus mechanism. Validators stake POL tokens on the Ethereum mainnet to secure the network and earn rewards. Staking on Polygon involves delegating POL tokens to validators through ValidatorShare contracts deployed on Ethereum L1.
{% endhint %}

Staking on the Polygon network (POL) involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

The **Chorus One SDK** simplifies this process, providing developers with the tools needed to build, sign, and broadcast staking transactions.

This guide will walk you through the fundamentals of staking on Polygon using the Chorus One SDK.

{% hint style="info" %}

**Compatibility Notice**

The methods provided in this documentation are compatible with popular Ethereum libraries such as `viem` and `ethers.js`. This compatibility ensures that you can seamlessly integrate these methods into your existing Ethereum and Polygon projects.

{% endhint %}

## Setting Up the Staker

To get started with staking on the Polygon network using the Chorus One SDK, you will first need to initialize the SDK.

First, create an instance of the `PolygonStaker` with the following configuration:

```javascript
import { PolygonStaker } from '@chorus-one/polygon'

const staker = new PolygonStaker({
  network: 'mainnet',
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY'
})
```

**Configuration Parameters**:

- **network**: The network to use (`'mainnet'` for Ethereum L1 or `'testnet'` for Sepolia L1)
- **rpcUrl**: (Optional) The URL of the Ethereum network RPC endpoint

---

## Initializing the Staker

After configuring the `PolygonStaker`, you can initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init()
```

{% hint style="info" %}

**Note**: The `init` method is optional for `PolygonStaker` and is kept for backward compatibility with other SDK stakers. You can start building transactions immediately after creating the staker instance.

{% endhint %}

---

## Building Transactions

Once the staker is set up, you can start building transactions for staking operations.

The `PolygonStaker` provides methods to build transactions for staking, unstaking, withdrawing, claiming rewards, and compounding rewards.

- You can learn more about these methods in the [Methods](methods.md) section.

**Example of building a staking transaction:**

```javascript
import { CHORUS_ONE_POLYGON_VALIDATORS } from '@chorus-one/polygon'

const delegatorAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const validatorShareAddress = CHORUS_ONE_POLYGON_VALIDATORS.mainnet

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorShareAddress,
  amount: '1' // 1 POL
})
```

{% hint style="warning" %}

**Token Approval Required**

Before staking, you must approve the StakeManager contract to spend your POL tokens. Use `buildApproveTx()` to create an approval transaction.

{% endhint %}

---

## Getting the Validator Address provided by Chorus One

The `@chorus-one/polygon` module includes Chorus One validator addresses for the Polygon network.

You can use these addresses when building staking transactions.

```javascript
import { CHORUS_ONE_POLYGON_VALIDATORS } from '@chorus-one/polygon'

const validatorShareAddress = CHORUS_ONE_POLYGON_VALIDATORS.mainnet
// or for testnet:
const testnetValidator = CHORUS_ONE_POLYGON_VALIDATORS.testnet
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
By integrating Fireblocks, you can leverage its robust security features to sign transactions on the Polygon network.

To set up Fireblocks, you will need to provide the necessary API key, secret key, and vault ID:

```javascript
import { PolygonStaker } from '@chorus-one/polygon'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'ETH',
  addressDerivationFn: PolygonStaker.getAddressDerivationFn()
})

await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
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

In this section you learned how to set up the Chorus One SDK for the Polygon network, which included how to build staking transactions, sign, broadcast, and track them.

- To learn more about the available methods for `PolygonStaker`, continue to the [Methods](methods.md) section.

## Further Reading

- [PolygonStaker API Reference](../../docs/classes/polygon_src.PolygonStaker.md)
- [What is a Signer?](../../signers-explained/what-is-a-signer.md)
