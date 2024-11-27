## Chorus One SDK

The **Chorus One SDK** is a all-in-one toolkit for building staking dApps. It supports non-custodial staking on networks validated by Chorus One, including **Ethereum**, **Solana**, **TON**, **Avalanche**, **Cosmos**, **NEAR**, and **Polkadot**. With this SDK, you can build, sign, and broadcast transactions as well as retrieve staking information and rewards for user accounts.

## Why Choose the Chorus One SDK?

At Chorus One, we prioritize security, transparency, and user control in our staking solutions. Our choice to use a Software Development Kit (SDK) for staking integration reflects this commitment, offering several key advantages over traditional Application Programming Interfaces (APIs).

### Enhanced Security and Decentralization

One of the core principles of crypto is _"Don't trust, verify."_ This ethos is crucial in staking operations, where trustless environments and robust security are paramount.

**Local Transaction Signing**: The Chorus One SDK allows users to generate and sign transactions locally on their own devices. This means critical operations - staking, unstaking, delegation, and reward withdrawals - are securely performed without exposing private keys to external environments.

**Reduced Risk of Exposure**: By keeping private keys within the user’s environment, the risk of exposure to malicious actors is significantly minimized.

### Verifiable Trust and Transparency

Using an API for staking can sometimes introduce concerns about transparency and control. With an SDK, these concerns are addressed head-on:

**Direct Verification**: Users can directly specify and verify the validator addresses they interact with, ensuring transparency and control over staking activities. This aligns with the decentralization ethos of blockchain technology, empowering users to manage their staking operations confidently.

**Elimination of External Dependencies**: The SDK approach removes potential attack vectors associated with relying on external APIs for critical operations. Users retain full control and can independently confirm all actions taken, enhancing overall trust and security.

### Open-Source and Auditable

**Open-Source Code**: The Chorus One SDK is open-source, allowing users and developers to review, audit, and contribute to the codebase. This openness ensures that the SDK is transparent and trustworthy. You can access and review the code on our [GitHub repository](https://github.com/ChorusOne/chorus-one-sdk).

{% hint style="info" %}

### Why does it matter?

### Choosing the Chorus One SDK means prioritizing security, transparency, and user empowerment. With local transaction building and signing, and open-source transparency, users can confidently participate in staking activities across supported networks.

{% endhint %}

## Key Features

- **Comprehensive Transaction Management**:

  The Chorus One SDK offers a robust suite of tools for managing staking operations on a variety of networks.

  Users can seamlessly build, sign, and broadcast transactions for staking, unstaking, delegation, and reward withdrawal.

- **Detailed Information Retrieval**:

  Our SDK provides users with the ability to fetch detailed staking information and reward data for any account. This transparency ensures that the user has access to all the information they need to make informed decisions about their staking activities.

- **Flexible Custody Solutions**:

  Our SDK supports a variety of custody options, including mobile wallets, browser extensions, hardware wallets, and custom custodial solutions like Fireblocks.

  This flexibility ensures that the user can choose the solution that best fits their security and operational requirements.

- **Fireblocks Integration**:

  For users who prefer a convenient custodial solution, the Chorus One SDK provides easy-to-use tools for securely signing transactions with Fireblocks across supported blockchain networks. This integration ensures a smooth and secure staking experience.

- **Integrated Validator Support**:

  The SDK includes built-in support for Chorus One validators across all supported blockchain networks. Additionally, it allows users to specify their own validator addresses, providing a customizable staking experience.

- **CLI**:

  The SDK includes a Command Line Interface (CLI) for easy interaction with the SDK and supported networks. This feature simplifies operations, making it accessible for users who prefer command line tools for managing their staking activities.

{% hint style="info" %}

### Our SDK offers users the freedom to stake with any validator they choose. This flexibility ensures a personalized staking experience and enhances user control over their staking activities.

{% endhint %}

## Modules Overview

### Supported Networks

- [**Ethereum**](build-your-staking-dapp/ethereum/overview.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/ethereum))
- [**Solana**](build-your-staking-dapp/solana/overview.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/solana))
- [**TON**](build-your-staking-dapp/ton/overview.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/ton))
- [**Avalanche**](build-your-staking-dapp/avalanche/overview.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/avalanche))
- [**Cosmos**](build-your-staking-dapp/cosmos/overview.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/cosmos))
- [**NEAR**](build-your-staking-dapp/near/overview.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/near))
- [**Polkadot (Substrate)**](build-your-staking-dapp/substrate/overview.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/substrate))

### Supported Signers (Custody Solutions)

- [**Fireblocks**](signers-explained/fireblocks.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/signer-fireblocks))
- [**Mnemonic**](signers-explained/local.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/signer-local))
- [**Ledger Device(Cosmos)**](signers-explained/signing-with-a-ledger-device.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/signer-ledger-cosmos))
- [**Keplr**](signers-explained/signing-with-a-browser-extension-wallet.md) ([📦 npm package](https://www.npmjs.com/package/@chorus-one/signer-keplr))
- [How to Implement a Custom Signer?](signers-explained/custom-signer.md)

### Command Line Interface (CLI)

- **Staking CLI** ([📦 npm package](https://www.npmjs.com/package/@chorus-one/staking-cli))

## Installation

The Chorus One SDK is available as a set of npm packages and supports both Node.js and browser environments.

- Please ensure you have **Node.js (v20)** installed on your machine.

To install the SDK, run some of the following commands depending on your setup:

{% tabs %}
{% tab title="npm" %}

```bash
# Networks

npm install @chorus-one/ethereum --save
npm install @chorus-one/solana --save
npm install @chorus-one/ton --save
npm install @chorus-one/avalanche --save
npm install @chorus-one/cosmos --save
npm install @chorus-one/near --save
npm install @chorus-one/substrate --save # Polkadot and other Substrate chains

# Signers

npm install @chorus-one/signer-fireblocks --save
npm install @chorus-one/signer-local --save
npm install @chorus-one/signer-keplr --save
npm install @chorus-one/signer-ledger-cosmos --save

# CLI

npm install @chorus-one/staking-cli --save --global
```

{% endtab %}
{% tab title="yarn" %}

```bash
# Networks

yarn add @chorus-one/ethereum
yarn add @chorus-one/solana
yarn add @chorus-one/ton
yarn add @chorus-one/avalanche
yarn add @chorus-one/cosmos
yarn add @chorus-one/near
yarn add @chorus-one/substrate # Polkadot and other Substrate chains

# Signers

yarn add @chorus-one/signer-fireblocks
yarn add @chorus-one/signer-local
yarn add @chorus-one/signer-keplr
yarn add @chorus-one/signer-ledger-cosmos

# CLI

yarn add @chorus-one/staking-cli --global
```

{% endtab %}
{% tab title="pnpm" %}

```bash
# Networks

pnpm add @chorus-one/ethereum
pnpm add @chorus-one/solana
pnpm add @chorus-one/ton
pnpm add @chorus-one/avalanche
pnpm add @chorus-one/cosmos
pnpm add @chorus-one/near
pnpm add @chorus-one/substrate # Polkadot and other Substrate chains

# Signers

pnpm add @chorus-one/signer-fireblocks
pnpm add @chorus-one/signer-local
pnpm add @chorus-one/signer-keplr
pnpm add @chorus-one/signer-ledger-cosmos

# CLI

pnpm add @chorus-one/staking-cli --global
```

{% endtab %}
{% tab title="bun" %}

```bash
# Networks

bun add @chorus-one/ethereum
bun add @chorus-one/solana
bun add @chorus-one/ton
bun add @chorus-one/avalanche
bun add @chorus-one/cosmos
bun add @chorus-one/near
bun add @chorus-one/substrate # Polkadot and other Substrate chains

# Signers

bun add @chorus-one/signer-fireblocks
bun add @chorus-one/signer-local
bun add @chorus-one/signer-keplr
bun add @chorus-one/signer-ledger-cosmos

# CLI

bun add @chorus-one/staking-cli --global
```

{% endtab %}
{% endtabs %}

## Example Usage

Here is a basic example of how to use the Chorus One SDK to build, sign, and broadcast a staking transaction using Fireblocks as the signer.

{% tabs %}

{% tab title="Ethereum" %}

```javascript
// Configuration
// -------------

import { EthereumStaker, CHORUS_ONE_ETHEREUM_VALIDATORS } from '@chorus-one/solana'

const staker = new EthereumStaker({
  network: 'ethereum'
})

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = '0xe6d8d8ac54461b1c5ed15740eee322043f696c08'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_ETHEREUM_VALIDATORS.ethereum.mevMaxVault

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorAddress,
  amount: '1', // 1 ETH
  // Optional - Unique Ethereum address for tracking
  referrer: '0xReferrerAddressHere'
})

// Signing the transaction with Fireblocks
// ---------------------------------------

import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

// Broadcasting the transaction
// ----------------------------

const { txHash } = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({ txHash })

console.log(status) // 'success'
```

{% endtab %}

{% tab title="Solana" %}

```javascript
// Configuration
// -------------

import { SolanaStaker, CHORUS_ONE_SOLANA_VALIDATOR } from '@chorus-one/solana'

const staker = new SolanaStaker({
  rpcUrl: 'https://api.mainnet-beta.solana.com'
})

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_SOLANA_VALIDATOR

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorAddress,
  amount: '1' // 1 SOL
})

// Signing the transaction with Fireblocks
// ---------------------------------------

import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

// Broadcasting the transaction
// ----------------------------

const { txHash } = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({ txHash })

console.log(status) // 'success'
```

{% endtab %}

{% tab title="TON" %}

```javascript
// Configuration
// -------------

import { TonPoolStaker } from '@chorus-one/ton'

const staker = new TonPoolStaker({
  rpcUrl: 'https://toncenter.com/api/v2/jsonRPC'
})

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = '0QDsF87nkTYgkvu1z5xveCEGTRnZmEVaVT0gdxoeyaNvmoCr'

// You can use the Chorus One validator address or specify your own
const validatorAddressPair = [
  'kQAHBakDk_E7qLlNQZxJDsqj_ruyAFpqarw85tO-c03fK26F',
  'kQCltujow9Sq3ZVPPU6CYGfqwDxYwjlmFGZ1Wt0bAYebio4o'
]

const { tx } = await staker.buildStakeTx({
  validatorAddressPair,
  amount: '1' // 1 TON
})

// Signing the transaction with Fireblocks
// ---------------------------------------

import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

// Broadcasting the transaction
// ----------------------------

const txHash = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({
  address: delegatorAddress,
  txHash
})

console.log(status) // 'success'
```

{% endtab %}
{% tab title="Avalanche" %}

```javascript
// Configuration
// -------------

import { AvalancheStaker, CHORUS_ONE_AVALANCHE_VALIDATORS } from '@chorus-one/avalanche'

const staker = new AvalancheStaker({
  rpcUrl: 'https://api.avax.network',
  hrp: 'avax'
})

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = 'P-avax10uzff2f0u8hstlr5ywt2x4lactmn28c5y9uddv'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_AVALANCHE_VALIDATORS[0]
// 'NodeID-LkDLSLrAW1E7Sga1zng17L1AqrtkyWTGg'

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorAddress,
  amount: '1' // 1 AVAX,
})

// Signing the transaction with Fireblocks
// ---------------------------------------

import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

// Broadcasting the transaction
// ----------------------------

const { txId } = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({ txId, chain: 'P' })

console.log(status) // 'success'
```

{% endtab %}

{% tab title="Cosmos" %}

```javascript
// Configuration
// -------------

import { CosmosStaker, CHORUS_ONE_COSMOS_VALIDATORS, CosmosConfigurator } from '@chorus-one/cosmos'

const networkConfig = await CosmosConfigurator.genNetworkConfig('cosmoshub')

const staker = new CosmosStaker(networkConfig)

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = 'cosmos1x88j7vp2xnw3zec8ur3g4waxycyz7m0mahdv3p'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_COSMOS_VALIDATORS.COSMOS
// 'cosmosvaloper15urq2dtp9qce4fyc85m6upwm9xul3049e02707'

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorAddress,
  amount: '1' // 1 ATOM
})

// Signing the transaction with Fireblocks
// ---------------------------------------

import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx,
  memo: 'Staking 1 ATOM'
})

// Broadcasting the transaction
// ----------------------------

const { transactionHash: txHash } = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({ txHash })

console.log(status) // 'success'
```

{% endtab %}
{% tab title="NEAR" %}

```javascript
// Configuration
// -------------

import { NearStaker, CHORUS_ONE_NEAR_VALIDATOR } from '@chorus-one/near'

const staker = new NearStaker({
  networkId: 'mainnet',
  rpcUrl: 'https://rpc.mainnet.near.org'
})

await staker.init()

// Building the transaction
// ------------------------

const delegatorAddress = 'your.near'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_NEAR_VALIDATOR
// 'chorusone.poolv1.near'

const { tx } = await staker.buildStakeTx({
  delegatorAddress,
  validatorAddress,
  amount: '1' // 1 NEAR
})

// Signing the transaction with Fireblocks
// ---------------------------------------

import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: delegatorAddress,
  tx
})

// Broadcasting the transaction
// ----------------------------

const {
  transaction: { hash: txHash }
} = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({
  address: delegatorAddress,
  txHash
})

console.log(status) // 'success'
```

{% endtab %}
{% tab title="Polkadot" %}

```javascript
// Configuration
// -------------

import { SubstrateStaker, RewardDestination, CHORUS_ONE_SUBSTRATE_VALIDATORS } from '@chorus-one/substrate'

const staker = new SubstrateStaker({
  rpcUrl: 'wss://rpc.polkadot.io',
  denomMultiplier: 1000000000000,
  rewardDestination: RewardDestination.STASH
})

await staker.init()

// Building the transactions
// -------------------------

const delegatorAddress = '5CavrskYZHeLxTwERikgZDCZPmhpsM7oXZQmL6rkNryDD8FwN'

// You can use the Chorus One validator address or specify your own
const validatorAddress = CHORUS_ONE_SUBSTRATE_VALIDATORS.POLKADOT[0]
// '16XF84j2wQ9wjkqRM2Y8ceCaw8dQu7t3ve9P9XbBj5kaRZxY'

const { tx: stakeTx } = await staker.buildStakeTx({
  amount: '1' // 1 DOT
})

const { tx: nominateTx } = await staker.buildNominateTx({
  validatorAddress
})

// Signing the transactions with Fireblocks
// ----------------------------------------

import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({...})
await signer.init()

const { signedTx: signedStakeTx } = await staker.sign({
  signerAddress: delegatorAddress,
  tx: stakeTx
})

const { signedTx: signedNominateTx } = await staker.sign({
  signer,
  tx: nominateTx
})

// Broadcasting the transactions
// -----------------------------

const { txHash } = await staker.broadcast({ signedTx })

// Tracking the transaction
// ------------------------

const { status, receipt } = await staker.getTxStatus({ txHash })

console.log(status) // 'success'

// Closing the connection
// ----------------------

await staker.close()
```

{% endtab %}
{% endtabs %}

## Next Steps

To help you get started with specific blockchain networks, please check out the detailed guides for each supported chain below.

<table data-view="cards">
  <thead>
    <tr>
      <th></th>
      <th data-hidden data-card-target data-type="content-ref"></th>
      <th data-hidden data-card-cover data-type="files"></th>
      </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Ethereum</strong></td>
      <td><a href="build-your-staking-dapp/ethereum/overview.md">..</a></td>
      <td><a href="./assets/ethereum.png">ethereum</a></td>
    </tr>
    <tr>
      <td><strong>Solana</strong></td>
      <td><a href="build-your-staking-dapp/solana/overview.md">..</a></td>
      <td><a href="./assets/solana.png">solana</a></td>
    </tr>
    <tr>
      <td><strong>Near</strong></td>
      <td><a href="build-your-staking-dapp/near/overview.md">..</a></td>
      <td><a href="./assets/near.png">near</a></td>
    </tr>
    <tr>
      <td><strong>Avalanche</strong></td>
      <td><a href="build-your-staking-dapp/avalanche/overview.md">..</a></td>
      <td><a href="./assets/avalanche.png">avalanche</a></td>
    </tr>
    <tr>
      <td><strong>TON</strong></td>
      <td><a href="build-your-staking-dapp/ton/overview.md">..</a></td>
      <td><a href="./assets/ton.png">ton</a></td>
    </tr>
    <tr>
      <td><strong>Polkadot (Substrate)</strong></td>
      <td><a href="build-your-staking-dapp/polkadot-substrate/overview.md">..</a></td>
      <td><a href="./assets/polkadot.png">polkadot</a></td>
    </tr>
    <tr>
      <td><strong>Cosmos</strong></td>
      <td><a href="build-your-staking-dapp/cosmos/overview.md">..</a></td>
      <td><a href="./assets/cosmos.png">cosmos</a></td>
    </tr>
  </tbody>
</table>
