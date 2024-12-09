Staking on the Near blockchain involves locking up tokens to support the network's security and operations. In return, stakers earn rewards. 

The Near blockchain, known for its scalability, low transaction fees, and developer-friendly environment, employs a Proof-of-Stake (PoS) consensus mechanism, which allows validators and delegators to participate in maintaining the network. 

The **Chorus One SDK** simplifies the staking process on Near by providing developers with the tools they need to build, sign, and broadcast staking transactions. This guide will walk you through the fundamentals of staking on Near using the Chorus One SDK.

## Initialization

To get started with staking on the Near network using the Chorus One SDK, you will first need to initialize the SDK for Near. 

Here’s how to set up the SDK and perform basic staking operations. 
- (For testing purposes, we will use the Near testnet).

---

## Setting Up the Staker

First, create an instance of `NearStaker` using the method below:

```typescript
import { NearStaker } from '@chorus-one/near';

const staker = new NearStaker({
  signer: signer,
  networkId: "testnet",
  rpcUrl: "https://rpc.testnet.near.org",
});
```

**Configuration Parameters**:
- **signer**: The signer object used for signing transactions. This can be a Fireblocks signer or any other signer that implements the Signer Interface. More details on signers are provided [below](#setting-up-the-signer).
- **networkId**: The network ID of the Near network (e.g., `mainnet`, `testnet`)
- **rpcUrl**: The URL of the Near network RPC endpoint

---

## Initializing the Staker

After configuring the `NearStaker`, initialize it to prepare for staking operations using the followng input:

```typescript
await staker.init();
```

The `init` method establishes a connection with the Near network and prepares the staker for operations such as building and broadcasting transactions.

---

## Setting Up the Signer

The `NearStaker` requires a method to sign transactions before broadcasting them to the network. 

The Chorus One SDK supports various options, including signing with Fireblocks, or with a private key. 

Additionally, you can implement a custom solution by following the `Signer` interface guidelines. 
- For detailed information on setting up and configuring these options, please refer to the [What is a Signer?](../signers-explained/what-is-a-signer.md) section.


{% tabs %}
{% tab title="Using Fireblocks for Signing" %}

By integrating Fireblocks, you can leverage its robust security features to sign transactions on the Near network. To set up Fireblocks, provide the necessary API key, secret key, and vault ID:

```javascript
import { NearStaker } from '@chorus-one/near';
import { FireblocksSigner } from '@chorus-one/signer-fireblocks';

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'NEAR_TEST',
  addressDerivationFn: NearStaker.getAddressDerivationFn()
});

await signer.init();
```

For more information please refer to the [Signing with Fireblocks](../signers-explained/fireblocks.md)

{% endtab %}
{% endtabs %}

---

## Building Transactions

Once the staker and account are set up you can start building transactions for staking operations. 

The `NearStaker` class provides methods to build transactions for staking, unstaking, and withdrawing rewards. 
- You can learn more about these methods in the [Methods](./methods.md) section.

**Example of building a staking transaction:**

```typescript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: 'your.near',
  validatorAddress: 'chorusone.pool.f863973.m0',
  amount: '1', // 1 NEAR
});
```

---

## Getting the Validator Address provided by Chorus One

The `@chorus-one/near` module includes the `CHORUS_ONE_NEAR_VALIDATOR` constant, which contains the Chorus One validator address for building transactions.

```javascript
import { CHORUS_ONE_NEAR_VALIDATOR  } from '@chorus-one/cosmos';

const validatorAddress = CHORUS_ONE_NEAR_VALIDATOR;
```

---

## Signing and Broadcasting the Transaction

After building the transaction you will need to sign it and broadcast it to the network.

**Example of signing and broadcasting the transaction:**

```typescript
const { signedTx } = await staker.sign({
  signerAddress: 'your.near',
  tx,
});

const { transaction: { hash } } = await staker.broadcast({ signedTx });
```

---

## Next Steps

In this section you learned how to set up the Chorus One SDK for the Near network using the Near testnet, which included how to build staking transactions and sign/broadcast them.
- To learn more about the available methods on `NearStaker`, continue to the [Methods](./methods.md) section.

## Further Reading
- [NearStaker API Reference](../../docs/classes/near_src.NearStaker.md)
- [What is a Signer?](../signers-explained/what-is-a-signer.md)
