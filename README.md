# Getting Started

The **Chorus One SDK** is a all-in-one toolkit for building staking dApps. It supports non-custodial staking on Cosmos, Near, Ethereum, Polkadot, and Avalanche networks. With this SDK, you can build, sign, and broadcast transactions as well as retrieve staking information and rewards for user accounts.

**You can review the GitHub repository here:**

<table data-view="cards"><thead><tr><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><strong>🐙 GitHub repository</strong></td><td><a href="https://github.com/ChorusOne/chorus-one-sdk">https://github.com/ChorusOne/chorus-one-sdk</a></td></tr></tbody></table>

## Key Features

* **Transaction Management**: Seamlessly build, sign, and broadcast staking, unstaking, delegation, and reward withdrawal transactions.
* **Information Retrieval**: Fetch detailed staking information and reward data for any account.
* **Non-Custodial Operations**: Transactions are generated and signed locally by the user, ensuring enhanced security and decentralization. This setup allows code audits and protects against malicious actors.
* **Flexible Custody Options**: Users can employ various custody solutions; including mobile wallets, browser extensions, hardware wallets, Fireblocks, or custom custodial wallets.
* **Fireblocks Integration**: The Chorus One SDK provides easy-to-use tools for securely signing transactions with Fireblocks across supported blockchain networks, offering a convenient custodial solution.
* **Chorus One Validator Support**: The SDK includes built-in support for Chorus One validators across all networks. It also allows users to specify their own validator addresses.

## Supported Networks

* **Ethereum** ([📦 npm package](https://www.npmjs.com/package/@chorus-one/ethereum))
* [**Cosmos**](book/guide/cosmos/overview.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/cosmos))
* [**Near**](<book/guide/near/overview (1).md>) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/near))
* **Polkadot** ([📦 npm package](https://www.npmjs.com/package/@chorus-one/polkadot))
* **Avalanche** ([📦 npm package](https://www.npmjs.com/package/@chorus-one/avalanche))

## Supported Signers (Custody Solutions)

* [**Fireblocks**](book/guide/signers-explained/fireblocks.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/signer-fireblocks))
* [**Mnemonic**](book/guide/signers-explained/local.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/signer-local))
* [How to Implement a Custom Signer?](book/guide/signers-explained/custom-signer.md)

## Installation

The Chorus One SDK is available as a set of npm packages and supports both Node.js and browser environments.

* Please ensure you have **Node.js (v20)** installed on your machine.

To install the SDK, run some of the following commands depending on your setup:

{% tabs %}
{% tab title="npm" %}
```bash
# Networks

npm install @chorus-one/ethereum --save
npm install @chorus-one/cosmos --save
npm install @chorus-one/near --save
npm install @chorus-one/polkadot --save
npm install @chorus-one/avalanche --save

# Signers

npm install @chorus-one/signer-fireblocks --save
npm install @chorus-one/signer-local --save
```
{% endtab %}

{% tab title="yarn" %}
```bash
# Networks

yarn add @chorus-one/ethereum
yarn add @chorus-one/cosmos
yarn add @chorus-one/near
yarn add @chorus-one/polkadot
yarn add @chorus-one/avalanche

# Signers

yarn add @chorus-one/signer-fireblocks
yarn add @chorus-one/signer-local
```
{% endtab %}

{% tab title="pnpm" %}
```bash
# Networks

pnpm add @chorus-one/ethereum
pnpm add @chorus-one/cosmos
pnpm add @chorus-one/near
pnpm add @chorus-one/polkadot
pnpm add @chorus-one/avalanche

# Signers

pnpm add @chorus-one/signer-fireblocks
pnpm add @chorus-one/signer-local
```
{% endtab %}

{% tab title="bun" %}
```bash
# Networks

bun add @chorus-one/ethereum
bun add @chorus-one/cosmos
bun add @chorus-one/near
bun add @chorus-one/polkadot
bun add @chorus-one/avalanche

# Signers

bun add @chorus-one/signer-fireblocks
bun add @chorus-one/signer-local
```
{% endtab %}
{% endtabs %}

## Example Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction using Fireblocks as the signer.

{% tabs %}
{% tab title="Cosmos" %}
```javascript
// Configuration
// --------------

import { CosmosStaker, CHORUS_ONE_COSMOS_VALIDATORS } from '@chorus-one/cosmos';
import { FireblocksSigner } from '@chorus-one/signer-fireblocks';

const signer = new FireblocksSigner({...});
await signer.init();

const staker = new CosmosStaker({
  signer: signer,
  rpcUrl: 'https://rpc.cosmos.network:26657',
  bechPrefix: 'cosmos',
  denom: 'uatom',
  denomMultiplier: "1000000",
  gas: 200000,
  gasPrice: '1',
});
 
await staker.init();

// Building the transaction
// ------------------------

const delegatorAddress = 'cosmos1x88j7vp2xnw3zec8ur3g4waxycyz7m0mahdv3p';

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_COSMOS_VALIDATORS.COSMOS
// 'cosmosvaloper15urq2dtp9qce4fyc85m6upwm9xul3049e02707'

const { tx } = await staker.buildStakeTx({
  delegatorAddress: delegatorAddress,
  validatorAddress: validatorAddress,
  amount: '1', // 1 ATOM
});


// Signing the transaction with Fireblocks
// ---------------------------------------

const { signedTx } = await staker.sign({ 
  signerAddress: delegatorAddress,
  tx,
  memo: 'Staking 1 ATOM',
});

// Broadcasting the transaction
// ----------------------------

const { transactionHash } = await staker.broadcast({ signedTx });
```
{% endtab %}

{% tab title="Near" %}
```javascript
// Configuration
// --------------

import { NearStake, CHORUS_ONE_NEAR_VALIDATOR } from '@chorus-one/near';
import { FireblocksSigner } from '@chorus-one/signer-fireblocks';

const signer = new FireblocksSigner({...});
await signer.init();

const staker = new NearStaker({
  signer: signer,
  networkId: "mainnet",
  rpcUrl: "https://rpc.mainnet.near.org",
});

await staker.init();

// Building the transaction
// ------------------------

const delegatorAddress = 'your-near-account.near';

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_NEAR_VALIDATOR;
// 'chorusone.poolv1.near'

const { tx } = await staker.buildStakeTx({
  delegatorAddress: delegatorAddress,
  validatorAddress: validatorAddress,
  amount: '1', // 1 NEAR
});

// Signing the transaction with Fireblocks
// ---------------------------------------

const { signedTx } = await staker.sign({ 
  signerAddress: delegatorAddress,
  tx,
});

// Broadcasting the transaction
// ----------------------------

const { transaction: { hash } } = await staker.broadcast({ signedTx });
```
{% endtab %}
{% endtabs %}

## Next Steps

To help you get started with specific blockchain networks, please check out the detailed guides for each supported chain below.

<table data-view="cards"><thead><tr><th></th><th data-hidden data-card-target data-type="content-ref"></th><th data-hidden data-card-cover data-type="files"></th></tr></thead><tbody><tr><td><strong>Ethereum</strong></td><td><a href="book/wip (1).md">wip (1).md</a></td><td><a href="book/assets/ethereum.png">ethereum.png</a></td></tr><tr><td><strong>Cosmos</strong></td><td><a href="book/guide/cosmos/overview.md">overview.md</a></td><td><a href="book/assets/cosmos.png">cosmos.png</a></td></tr><tr><td><strong>Near</strong></td><td><a href="book/guide/near/overview (1).md">overview (1).md</a></td><td><a href="book/assets/near.png">near.png</a></td></tr><tr><td><strong>Polkadot</strong></td><td><a href="book/wip (1).md">wip (1).md</a></td><td><a href="book/assets/polkadot.png">polkadot.png</a></td></tr><tr><td><strong>Avalanche</strong></td><td><a href="book/wip (1).md">wip (1).md</a></td><td><a href="book/assets/avalanche.png">avalanche.png</a></td></tr></tbody></table>
