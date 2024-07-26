# Overview

Staking on the Cosmos network involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

{% hint style="info" %}
The Cosmos network, renowned for its interoperability and modular framework, utilizes the Tendermint BFT consensus engine, enabling a diverse range of validators to secure the network and process transactions efficiently. This structure supports the seamless connection of various independent blockchains, allowing them to communicate and share data while maintaining their autonomy.
{% endhint %}

The **Chorus One SDK** simplifies this process, providing developers with the tools needed to build, sign, and broadcast staking transactions.

{% hint style="info" %}

### Compatibility Notice

The methods provided in this documentation are compatible with popular Cosmos libraries such as `@cosmjs/cosmwasm`. This compatibility ensures that you can seamlessly integrate these methods into your existing Cosmos projects.

{% endhint %}

This guide will walk you through the fundamentals of staking on Cosmos using the Chorus One SDK.

## Setting Up the Staker

To get started with staking on the Cosmos network using the Chorus One SDK, you will first need to initialize the SDK for Cosmos.

- **Note:** For testing purposes, we will use the Celestia testnet.

First, create an instance of `CosmosStaker` with the necessary configuration:

```javascript
import { CosmosStaker } from '@chorus-one/cosmos'

const staker = new CosmosStaker({
  rpcUrl: 'http://public-celestia-mocha4-consensus.numia.xyz',
  lcdUrl: 'https://api.celestia-mocha.com',
  bechPrefix: 'celestia',
  denom: 'utia',
  denomMultiplier: '1000000',
  gas: 250000,
  gasPrice: '0.4'
})
```

**Configuration Parameters**:

- **rpcUrl**: The URL of the Cosmos network RPC endpoint. This is where the SDK will connect to interact with the network. In this example, we are using a public endpoint for the Celestia testnet.
- **lcdUrl**: The URL of the Cosmos network LCD endpoint. This is where the SDK will connect to query the network for information such as account balances and transaction status.
- **bechPrefix**: The Bech32 prefix for addresses on the network. For Cosmos mainnet this would be `"cosmos"`, and for the Celestia testnet it is `"celestia"`
- **denom**: The denomination of the token used on the network. For the Celestia testnet, we use the micro-units of the native token - `"utia"`
- **denomMultiplier**: This parameter defines the scaling factor used to convert from the smallest unit of the network’s currency (`utia`) to its base unit (`TIA`).

  For the Celestia testnet, `1 TIA` is equal to `1,000,000 utia`, hence the multiplier is `1,000,000`. This value is used to convert the amount of tokens in transactions.

- **gas**: The maximum amount of gas to use for transactions. This value can be adjusted based on the complexity of the transactions.
- **gasPrice**: The price of gas in the **denom**(i.e `utia`) token of the network. This value determines the cost of executing transactions. The resulting maximum fee is calculated as `gas * gasPrice`.

  For determining the gas price, refer to the network's [chain registry](https://github.com/cosmos/chain-registry).

- **isEVM**: (Optional) A boolean flag indicating whether the network is an EVM-based chain. This is set to `false` by default.

## Initializing the Staker

After configuring the `CosmosStaker`, initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init()
```

The `init` method establishes a connection with the configured RPC endpoint and prepares the staker for operations such as building and broadcasting transactions.

---

## Building Transactions

Once the staker and signer are set up, you can start building transactions for staking operations.

The `CosmosStaker` class provides methods to build transactions for staking, unstaking, redelegating, and withdrawing rewards.

- You can learn more about these methods in the [Methods](methods.md) section.

**Example of building a staking transaction:**

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: 'celestia1x88j7vp2xnw3zec8ur3g4waxycyz7m0mahdv3p',
  validatorAddress: 'celestiavaloper15urq2dtp9qce4fyc85m6upwm9xul3049e02707',
  amount: '1' // 1 TIA
})
```

---

## Getting the Validator Address provided by Chorus One

The `@chorus-one/cosmos` module includes a list of Chorus One validators for the Cosmos networks, organized by bech32 prefixes. You can use these addresses when building transactions.

```javascript
import { CHORUS_ONE_COSMOS_VALIDATORS } from '@chorus-one/cosmos'

const validatorAddress = CHORUS_ONE_COSMOS_VALIDATORS.COSMOS
```

---

## Signing the Transaction

Once the transaction is built, you can sign that transaction using your own signing solution e.g.:

```js
const rawTx = await yourSigningClient.sign('celestia1x88j7vp2xnw3zec8ur3g4waxycyz7m0mahdv3p', [tx], fee, 'Stake 1 TIA')

const signedTx = TxRaw.encode(rawTx).finish()
```

Additionally, you can use the Chorus One SDK to sign transactions using Fireblocks, mnemonic or other methods.

For detailed information on setting up and configuring these options, refer to the [What is a Signer?](../../signers-explained/what-is-a-signer.md) section.

{% tabs %}
{% tab title="Using Fireblocks for Signing" %}
By integrating Fireblocks, you can leverage its robust security features to sign transactions on the Cosmos network. To set up Fireblocks, provide the necessary API key, secret key, and vault ID:

```javascript
import { CosmosStaker } from '@chorus-one/cosmos'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'CELESTIA_TEST',
  addressDerivationFn: CosmosStaker.getAddressDerivationFn({
    bechPrefix: 'celestia'
  })
})

await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: 'celestia1x88j7vp2xnw3zec8ur3g4waxycyz7m0mahdv3p',
  tx,
  memo: 'Staking 1 TIA'
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

## Auto-Generating a CosmosStaker Configuration

As we've previously covered, to initiate `CosmosStaker` you must first provide some basic data about the denomination, gas amount, and gas price.

However, in the Cosmos ecosystem, many of the networks don't have a market based gas pricing system such as Ethereum.

Instead, the user must calculate a fee with gas prices set as equal to or higher than what the network operators have set.

**This leaves the question:** _"How do you know what the current gas price is?"_

This can be tricky to determine, so members of the Cosmos community came up with [Chain Registry](https://github.com/cosmos/chain-registry/tree/master), which holds the most up to date data on the current network gas prices.

For your convenience, we have provided a `CosmosConfigurator` class which generates a network configuration based on the data from Chain Registry.

**An example of this can be seen below:**

```javascript
import { CosmosConfigurator, CosmosStaker } from '@chorus-one/cosmos'

const networkConfig = await CosmosConfigurator.genNetworkConfig('celestia')

const staker = new CosmosStaker({
  ...networkConfig
})
```

{% hint style="info" %}
Please note that [Chain Registry](https://github.com/cosmos/chain-registry/tree/master) is a community based repository.

While the data there is usually correct, there is a risk of inaccuracies. Therefore it is recommended that you verify the network configuration prior using it.

For instance you can check if the default fee `(gas * gasPrice)` does not exceed expected bounds.
{% endhint %}

## Next Steps

In this section you learned how to set up the Chorus One SDK for the Cosmos network using the Celestia testnet, which included how to build staking transactions, sign, and broadcast them.

- To learn more about the available methods on `CosmosStaker` continue to the [Methods](methods.md) section.

## Further Reading

- [CosmosStaker API Reference](../../docs/classes/cosmos_src.CosmosStaker.md)
- [What is a Signer?](../../signers-explained/what-is-a-signer.md)
