---
description: A ready-to-integrate, non-custodial staking dApp for institutions staking to their clients.
icon: coins
---

# Staking dApp

The staking dApp is a ready-to-integrate, non-custodial staking interface that institutions embed into their own products. Wallets, custodians, exchanges, and asset managers use it to give their clients access to staking across leading networks, without operating validators or building staking flows in-house.

For the end user the experience is simple: connect a wallet, choose an asset, and start earning rewards in a few clicks, with no custody hand-off. For the platform, integration is light: embed the dApp directly inside your app, or connect it over WalletConnect, with Bitwise engineering support from integration to launch.

It is also available as a standalone web app at [staking.chorus.one](https://staking.chorus.one/eth/stake).

<figure><img src="../../.gitbook/assets/staking-dapp-overview.png" alt=""><figcaption><p>The staking dApp (test environment; all figures shown are test data)</p></figcaption></figure>

## Supported assets

The dApp currently supports staking for:

<table><thead><tr><th>Asset</th><th>Network</th><th>Delegation Location</th></tr></thead><tbody><tr><td><strong>ETH</strong></td><td>Ethereum</td><td>StakeWise V3 vault (<a href="https://github.com/stakewise/v3-core/tree/main/audits">v3-core audits</a>)</td></tr><tr><td><strong>SOL</strong></td><td>Solana</td><td>Native staking (<a href="https://solanabeach.io/validator/Chorus6Kis8tFHA7AowrPMcRJk3LbApHTYpgSNXzY5KE">Solana validator</a>)</td></tr><tr><td><strong>GRAM (TON)</strong></td><td>The Open Network (TON)</td><td>TON Pool (<a href="https://github.com/ChorusOne/tonpool">ChorusOne/tonpool</a>)</td></tr></tbody></table>

{% hint style="info" %}
The ETH and GRAM staking contracts are open source and independently audited; SOL uses native validator staking.
{% endhint %}

## Rewards, fees & timing

<table><thead><tr><th>Asset</th><th>Reward rate (ARR)</th><th>Reward frequency</th><th>Delegation time</th><th>Fee</th></tr></thead><tbody><tr><td><strong>ETH</strong></td><td>2.62%</td><td>Per epoch (~6 min)</td><td>Near-immediate</td><td>5% commission on rewards</td></tr><tr><td><strong>SOL</strong></td><td>7.19%</td><td>Per epoch (~2–3 days)</td><td>Up to 3 days</td><td>8% commission on rewards</td></tr><tr><td><strong>GRAM</strong></td><td>17.41%</td><td>Per validation round (~18 hrs)</td><td>Up to 18 hrs</td><td>20% commission on rewards</td></tr></tbody></table>

On ETH, delegation is near-immediate: staking mints a share of the staking vault that begins accruing rewards right away, with no activation queue to wait through.

{% hint style="info" %}
Reward rates (ARR) are indicative and vary with network conditions. Figures shown are as of August 2026; live rates are always displayed in the dApp. Delegation time is how long after staking your position becomes active. Current network metrics are published at [onchain.bitwiseinvestments.com/staking](https://onchain.bitwiseinvestments.com/staking).
{% endhint %}

## Why integrate the staking dApp

### For your platform

* **Launch staking without building it.** Offer staking to your clients without operating validators or writing staking logic. The dApp handles transaction construction, signing, and broadcast, backed by institutional-grade infrastructure.
* **Two low-lift integration paths.** Embed the dApp directly inside your app, or connect it over WalletConnect, whichever suits your platform, with engineering support through integration and launch. See [Embedding the dApp](./embedding-in-a-wallet.md).
* **Non-custodial by design.** Client transactions are signed in their own wallets and clear-signed for review, so signers see a human-readable view of exactly what they approve. The dApp never takes custody of client keys or assets.
* **Institutional-grade and secure.** Built on a validator stack securing billions in assets, with a non-custodial setup, ISO 27001 certification, and SOC 2 compliance.
* **One integration, multiple assets.** A single, consistent interface covers leading networks.
* **Reporting.** Detailed multi-network reporting for rewards, commissions, ARR, and CSV/Excel exports via the [Rewards Dashboard](../chorus-one-rewards.md).

### For your users

* **Stake in a few clicks.** Connect a wallet, choose an asset and amount, and approve in-wallet. No minimum on ETH; small minimums on SOL and GRAM.
* **Immediate rewards on ETH.** Depositing mints a share of the staking vault that starts earning right away, with no activation queue to wait through.
* **Bring your own wallet.** Use the wallet you already have, or stake straight from the platform's in-app wallet with automatic connection.
* **Transparent rewards.** Track staked balances and accrued rewards in real time in the dApp.

## How connecting works

There are two ways to use the dApp:

1. **Connect a wallet.** From the public web app, connect an injected wallet (MetaMask, Phantom, and others), WalletConnect, or a hardware wallet, then stake.
2. **Auto-connected wallet.** When the dApp is opened inside a supported wallet host (for example Ledger Live), it detects the environment and connects to the active account automatically, no wallet picker required. This is covered in [Embedding the dApp](./embedding-in-a-wallet.md).

## Get started

* [**How to Stake**](./how-to-stake.md): connect a wallet, choose an amount, and confirm the transaction.
* [**Unstaking &#x26; Withdrawing**](./unstaking-and-withdrawing.md): unstake your position and withdraw your assets back to your wallet.
* [**Embedding the dApp**](./embedding-in-a-wallet.md): for partners who host the dApp inside their own wallet or custody platform.

{% hint style="info" %}
For institutional staking inquiries, contact the staking team at `StakingBOS@bitwiseinvestments.com`.
{% endhint %}
