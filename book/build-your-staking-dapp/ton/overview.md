# Overview

Staking on TON (Telegram Open Network) involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

{% hint style="info" %}
Toncoin (TON) the native cryptocurrency of the TON blockchain, excels in scalability, fast transaction speeds, and minimal fees. By utilizing the Byzantine Fault Tolerance consensus algorithm, TON ensures high security and decentralization. Validators maintain the network by staking Toncoin, which in turn, secures the blockchain and incentivizes participation.
{% endhint %}

The **Chorus One SDK** simplifies this process by providing developers with the tools needed to build, sign, and broadcast staking transactions.

It supports:

- The official Nominator Pool smart contracts available for review on the official [TON Docs](https://docs.ton.org/participate/network-maintenance/nominators)
- The official Single Nominator Pool smart contract available for review on the official [TON Docs](https://docs.ton.org/participate/network-maintenance/single-nominator)

{% hint style="info" %}

### Compatibility Notice

The methods provided in this documentation are compatible with popular TON libraries such as `@ton/ton`. This compatibility ensures that you can seamlessly integrate these methods into your existing TON projects.

{% endhint %}

This guide will walk you through the fundamentals of staking on TON using the Chorus One SDK.

## Setting Up the Staker

To get started with staking on TON using the Chorus One SDK, you will first need to initialize the SDK.

- **Note:** For testing purposes we will be using the TON testnet.

First, create an instance of `TonStaker` with the following configuration:

```javascript
import { TonStaker } from '@chorus-one/ton'

const staker = new TonStaker({
  rpcUrl: 'https://testnet.toncenter.com/api/v2/jsonRPC'
})
```

**Configuration Parameters**:

- **rpcUrl**: The URL of the TON RPC endpoint. This is where the SDK will connect to interact with the network. In this example, we are using a public endpoint for the testnet.
- **allowSeamlessWalletDeployment**: (Optional) If enabled, the wallet contract is deployed automatically when needed. Default is `false`.
- **allowTransferToInactiveAccount**: (Optional) Allows token transfers to inactive accounts. Default is `false`.
- **minimumExistentialBalance**: (Optional) The amount of TON to keep in the wallet. Default is `'5'`.
- **addressDerivationConfig** (Optional): TON address derivation configuration, which includes:
  - **walletContractVersion**: Version of the wallet contract. Default is `'4'`.
  - **workchain**: The workchain ID. Default is `0`.
  - **bounceable**: Indicates if the address is bounceable. Default is `false`.
  - **testOnly**: Indicates if the configuration is for testing purposes only. Default is `false`.
  - **urlSafe**: Indicates if the address should be URL-safe. Default is `false`.

Learn more about the address derivation params at [TEP-0002](https://github.com/ton-blockchain/TEPs/blob/master/text/0002-address.md#smart-contract-addresses)

---

## Initializing the Staker

After configuring the `TonStaker`, you can initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init()
```

The `init` method establishes a connection with the configured RPC endpoint and prepares the staker for operations such as building and broadcasting transactions.

---

## Building Transactions

Once the staker and signer are set up, you can start building transactions for staking operations.

The `TonStaker` class provides methods to build transactions for staking and transfers of tokens.

- You can learn more about these methods in the [Methods](methods.md) section.

On the TON blockchain, users stake their tokens through smart contracts. There are different options available depending on your staking preferences:

[**Nominator Pool**](https://github.com/ton-blockchain/nominator-pool): This involves multiple nominators who collectively stake their tokens and participate in the decision-making process for selecting validators. It is a decentralized approach, ideal for community-driven projects.

**Example of building a nominator pool staking transaction:**

```javascript
const { tx } = await staker.buildStakeNominatorPoolTx({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP',
  amount: '1' // 1 TON
})
```

[**Single Nominator Pool**](https://github.com/orbs-network/single-nominator/tree/main): This allows a single entity to act as the sole nominator, making all decisions regarding staking. It offers centralized control and simpler management, suitable for entities that prefer centralized decision-making.

**Example of building a single nominator pool staking transaction:**

```javascript
const { tx } = await staker.buildStakeSingleNominatorPoolTx({
  delegatorAddress: '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr',
  validatorAddress: 'Ef9rkkVM0xr4rKZZMAfBkXU0U8qMnkTmqbUhYRNBvRt5knxP',
  amount: '1' // 1 TON
})
```

---

## Getting the Validator Address provided by Chorus One

To be eligible for the validator election process, validators need a minimum stake of 300,000 TON locked in the validator contract:

1. single-nominator - only one delegator allowed
2. nominator-pool - up to 40 delegators allowed

{% hint style="info" %}
Due to above requirements we deploy the TON Validator contract upon client request. If you'd like to stake TON with Chorus One, please contact us at [staking@chorus.one](mailto:staking@chorus.one)
{% endhint %}

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
import { TonStaker } from '@chorus-one/TON'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'TON_TEST',
  addressDerivationFn: TonStaker.getAddressDerivationFn()
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

- To learn more about the available methods on `TonStaker`, continue to the [Methods](methods.md) section.

## Further Reading

- [TonStaker API Reference](../../docs/classes/ton_src.TonStaker.md)
- [What is a Signer?](../../signers-explained/what-is-a-signer.md)
