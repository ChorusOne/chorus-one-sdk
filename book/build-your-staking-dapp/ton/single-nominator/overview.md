# Single Nominator Pool: Overview

The **Single Nominator Pool** is a secure staking solution designed for large holders (minimum 400,000 TON) who value full control over their assets. By removing the need for multiple nominators, it minimizes the attack surface and enhances security. This pool is tailored for solo stakers, offering partial withdrawals and a straightforward, independent staking experience.

The **Chorus One SDK** simplifies staking process by providing developers with the tools needed to build, sign, and broadcast staking transactions.

{% hint style="info" %}

**Compatibility Notice**

The methods provided in this documentation are compatible with popular TON libraries such as `@ton/ton`. This compatibility ensures that you can seamlessly integrate these methods into your existing TON projects.

{% endhint %}

## Setting Up the Staker

To get started with staking on TON using the Chorus One SDK, you will first need to initialize the SDK.

- **Note:** For testing purposes we will be using the TON testnet.

First, create an instance of `TonSingleNominatorPoolStaker` with the following configuration:

```javascript
import { TonSingleNominatorPoolStaker } from '@chorus-one/ton'

const staker = new TonSingleNominatorPoolStaker({
  rpcUrl: 'https://testnet.toncenter.com/api/v2/jsonRPC'
})
```

**Configuration Parameters**:

- **rpcUrl**: The URL of the TON RPC endpoint. This is where the SDK will connect to interact with the network. In this example, we are using a public endpoint for the testnet.

---

## Initializing the Staker

After configuring the `TonSingleNominatorPoolStaker`, you can initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init()
```

The `init` method establishes a connection with the configured RPC endpoint and prepares the staker for operations such as building and broadcasting transactions.

---

## Building Transactions

Once the staker and signer are set up, you can start building transactions for staking operations.

The `TonSingleNominatorPoolStaker`  class provides methods to build transactions for staking, unstaking, and wallet deployment.

- You can learn more about these methods in the [Methods](methods.md) section.

**Example of building a nominator pool staking transaction:**

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP',
  amount: '1', // 1 TON
})
```
---

## Getting the Validator Address provided by Chorus One

To be eligible for the validator election process, validators need a minimum stake of 400,000 TON locked in the validator contract:

Due to above requirements we deploy the TON Validator contract upon client request. If you'd like to stake TON with Chorus One, please contact us at [staking@chorus.one](mailto:staking@chorus.one)

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
By integrating Fireblocks you can leverage its robust security features to sign transactions on the TON network. To set up Fireblocks, you must provide the necessary API key, secret key, and vault ID.

Example shown below:

```javascript
import { TonSingleNominatorPoolStaker } from '@chorus-one/TON'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'TON_TEST',
  addressDerivationFn: TonSingleNominatorPoolStaker.getAddressDerivationFn()
})

await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
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
const txHash = await staker.broadcast({ signedTx })
```

And now you can track the transaction status:

```javascript
const { status, receipt } = await staker.getTxStatus({
  address: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  txHash
})

console.log(status) // 'success'
```

---

## Next Steps

In this section you learned how to set up the Chorus One SDK for the TON network using the TON testnet, which included how to build staking transactions, sign, broadcast, and track them.

- To learn more about the available methods on `TonSingleNominatorPoolStaker`, continue to the [Methods](methods.md) section.

## Further Reading

- [TonSingleNominatorPoolStaker API Reference](../../../docs/classes/ton_src.TonSingleNominatorPoolStaker.md)
- [What is a Signer?](../../../signers-explained/what-is-a-signer.md)
