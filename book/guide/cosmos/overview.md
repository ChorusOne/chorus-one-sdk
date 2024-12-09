# Overview

Staking on the Cosmos network involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

The **Chorus One SDK** simplifies this process, providing developers with the tools needed to build, sign, and broadcast staking transactions.

This guide will walk you through the fundamentals of staking on Cosmos using the Chorus One SDK.

### Initialization

To get started with staking on the Cosmos network using the Chorus One SDK, you will first need to initialize the SDK for Cosmos.

Here’s how to set up the SDK and perform basic staking operations.

* (For testing purposes, we will use the Celestia testnet).

***

### Setting Up the Staker

First, create an instance of `CosmosStaker` with the necessary configuration:

```javascript
import { CosmosStaker } from '@chorus-one/cosmos';

const staker = new CosmosStaker({
  signer: signer,
  rpcUrl: "http://public-celestia-mocha4-consensus.numia.xyz",
  bechPrefix: "celestia",
  denom: "utia",
  denomMultiplier: "1000000",
  gas: 250000,
  gasPrice: "0.4",
});
```

**Configuration Parameters**:

* **signer**: The signer object used for signing transactions. This can be a Fireblocks signer or any other signer that implements the Signer Interface. More details on signers are provided [below](overview.md#setting-up-the-signer).
* **rpcUrl**: The URL of the Cosmos network RPC endpoint. This is where the SDK will connect to interact with the network. In this example, we are using a public endpoint for the Celestia testnet.
* **bechPrefix**: The Bech32 prefix for addresses on the network. For Cosmos mainnet this would be `"cosmos"`, and for the Celestia testnet it is `"celestia"`
* **denom**: The denomination of the token used on the network. For the Celestia testnet, we use the micro-units of the native token - `"utia"`
* **denomMultiplier**: This parameter defines the scaling factor used to convert from the smallest unit of the network’s currency (`utia`) to its base unit (`TIA`). For the Celestia testnet, `1 TIA` is equal to `1,000,000 utia`, hence the multiplier is `1,000,000`. This value is used to convert the amount of tokens in transactions.
* **gas**: The maximum amount of gas to use for transactions. This value can be adjusted based on the complexity of the transactions.
* **gasPrice**: The price of gas in the **denom**(i.e `utia`) token of the network. This value determines the cost of executing transactions. For determining the gas price, refer to the network's [chain registry](https://github.com/cosmos/chain-registry). The resulting maximum fee is calculated as `gas * gasPrice`

***

### Initializing the Staker

After configuring the `CosmosStaker`, initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init();
```

The `init` method establishes a connection with the configured RPC endpoint and prepares the staker for operations such as building and broadcasting transactions.

***

### Setting Up the Signer

The `CosmosStaker` requires a method to sign transactions before broadcasting them to the network.

The Chorus One SDK supports various options, including signing with Fireblocks, or signing with a private key.

Additionally, you can implement a custom solution by following the `Signer` interface guidelines.

* For detailed information on setting up and configuring these options, refer to the [What is a Signer?](../signers-explained/what-is-a-signer.md) section.

{% tabs %}
{% tab title="Using Fireblocks for Signing" %}
By integrating Fireblocks, you can leverage its robust security features to sign transactions on the Cosmos network. To set up Fireblocks, provide the necessary API key, secret key, and vault ID.

```javascript
import { CosmosStaker } from '@chorus-one/cosmos';
import { FireblocksSigner } from '@chorus-one/signer-fireblocks';

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'CELESTIA_TEST',
  addressDerivationFn: CosmosStaker.getAddressDerivationFn({
    bechPrefix: 'celestia'
  })
});

await signer.init();
```

For more information please refer to the [Signing with Fireblocks](../signers-explained/fireblocks.md)
{% endtab %}
{% endtabs %}

***

### Building Transactions

Once the staker and signer are set up, you can start building transactions for staking operations.

The `CosmosStaker` class provides methods to build transactions for staking, unstaking, redelegating, and withdrawing rewards.

* You can learn more about these methods in the [Methods](methods.md) section.

**Example of building a staking transaction:**

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: 'cosmos1xyz...',
  validatorAddress: 'cosmosvaloper1xyz...',
  amount: '1', // 1 ATOM
});
```

***

### Getting the Validator Address provided by Chorus One

The `@chorus-one/cosmos` module includes a list of Chorus One validators for the Cosmos networks, organized by bech32 prefixes. You can use these addresses when building transactions.

```javascript
import { CHORUS_ONE_COSMOS_VALIDATORS  } from '@chorus-one/cosmos';

const validatorAddress = CHORUS_ONE_COSMOS_VALIDATORS.COSMOS;
```

***

### Signing and Broadcasting the Transaction

After building the transaction, you will need to sign it and broadcast it to the network.

**Example of signing and broadcasting the transaction:**

```javascript
const { signedTx } = await staker.sign({ 
  signerAddress: 'cosmos1xyz...',
  tx,
  memo: 'Staking 1 ATOM',
});

const { transactionHash } = await staker.broadcast({ signedTx });
```

The signature of these methods is compatible with the methods provided by popular Cosmos libraries like `@cosmjs/cosmwasm`.

***

### Next Steps

In this section you learned how to set up the Chorus One SDK for the Cosmos network using the Celestia testnet, build staking transactions, and sign/broadcast them.

* To learn more about the available methods on `CosmosStaker` continue to the [Methods](methods.md) section.

### Further Reading

* [CosmosStaker API Reference](../../docs/classes/cosmos_src.CosmosStaker.md)
* [What is a Signer?](../signers-explained/what-is-a-signer.md)
