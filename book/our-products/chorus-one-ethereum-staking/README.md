---
description: ETH staking and restaking with Chorus One.
metaLinks:
  alternates:
    - >-
      https://app.gitbook.com/s/KGu77aAU8HQJ5FTwSgOi/our-products/chorus-one-ethereum-staking
---

# Ethereum Staking

<!-- NOTE: Interim rewrite. Bitwise UK / Attestant team is preparing deeper ETH staking collateral — this page expected to be enriched/superseded once that lands. See KB_OUTSTANDING_ITEMS.md. -->

<figure><img src="../../.gitbook/assets/Screenshot 2025-08-13 at 5.20.31 PM.png" alt=""><figcaption></figcaption></figure>

## About ETH Staking with Chorus One

Chorus One operates Ethereum staking infrastructure for institutional clients and individual investors. ETH can be staked in any amount — including amounts not divisible by 32 ETH — via pooled staking powered by Stakewise V3, with the option to mint osETH and use it across the broader DeFi ecosystem.

<!-- TODO: WIP — Chorus One ETH staking dapp URL pending product release. Current references point to legacy C1 portal. See KB_OUTSTANDING_ITEMS.md. -->
The ETH staking interface is available via the public staking portal at [opus.chorus.one/pool/stake](https://opus.chorus.one/pool/stake/).

The underlying validator infrastructure — the [Vouch and Dirk](./vouch-and-dirk.md) open-source stack built by Attestant (now part of Chorus One) — is the same stack used by the Ethereum Foundation to operate its own staking program.

---

## Liquid Staking with Stakewise V3

<details>

<summary>What is Stakewise V3?</summary>

Stakewise V3 is a liquid staking protocol introduced by the Stakewise DAO that addresses stake centralization on Ethereum.

Traditional Ethereum validators require a 32 ETH minimum, significant technical infrastructure, and expose stakers to slashing risk. Stakewise V3 uses mini staking pools called "Vaults" that allow anyone to stake any amount of ETH, mint osETH (a liquid staking token), and participate in the broader DeFi ecosystem without meeting the 32 ETH threshold individually.

Vault operators customize their configuration independently, fostering a diverse marketplace of ETH staking solutions rather than consolidating stake into a few large operators.

For a deeper technical overview, see [A comprehensive guide to Stakewise V3](https://chorus.one/articles/a-comprehensive-guide-to-stakewise-v3).

</details>

<details>

<summary>How does liquid staking work?</summary>

In liquid staking, a user stakes their crypto with a liquid staking protocol and receives a derivative token in return — the token represents the staked amount plus accrued rewards (or penalties).

Unlike traditional staking, where assets are locked and illiquid, the derivative token can be traded, used as collateral, or deployed in DeFi protocols. This allows participation in network validation while retaining liquidity and the option to compound rewards elsewhere.

The tradeoff: liquid staking introduces smart contract risk that is not present in native staking, since rewards and principal are mediated by protocol contracts rather than directly held at the protocol level.

</details>

<details>

<summary>Supported Liquid Staking Tokens (LSTs)</summary>

```
osETH, wbETH, rETH, cbETH, stETH, oETH, ankrETH, swETH, ETHx, EIGEN
```

</details>

---

## Restaking and EigenLayer

Restaking, as defined by Vitalik Buterin, extends the utility of staked ETH beyond securing Ethereum itself. Staked ETH can be restaked to additional networks or applications, allowing those systems to use Ethereum's validator set and economic security without establishing their own.

**EigenLayer** implements restaking through Ethereum smart contracts. Stakers can opt in to restake their ETH (or liquid staking derivatives) to secure **Actively Validated Services (AVSs)** — additional applications built on top of Ethereum. AVSs gain security without bootstrapping their own validator network; restakers earn additional rewards for taking on the additional slashing conditions.

Supported LSTs can be restaked to EigenLayer directly through the Chorus One staking interface.

---

## Public versus Private Vaults

Chorus One operates both public pooled vaults (for general participation) and private tailored vaults (for institutional clients).

<details>

<summary><strong>Public Vaults</strong></summary>

Public vaults pool ETH from multiple participants into a shared vault operated by Chorus One. Any amount of ETH can be staked, and osETH can be minted against the stake.

<!-- TODO: WIP — Chorus One ETH staking dapp URL pending product release. -->
Public vaults are accessible via [opus.chorus.one/pool/stake](https://opus.chorus.one/pool/stake/).

</details>

<details>

<summary><strong>Private Vaults</strong></summary>

Private vaults are dedicated, isolated vaults for institutional clients who require separation of their staked capital from the public pool. Private vault assets are not commingled with other vaults.

Institutional clients seeking a private vault can contact the Chorus One staking team at `StakingBOS@bitwiseinvestments.com`.

</details>

---

## Infrastructure: Vouch and Dirk

Chorus One' Ethereum validator infrastructure is built on **Vouch** and **Dirk** — open-source tools developed by Attestant (now part of Chorus One) and used in production by the Ethereum Foundation.

- **Vouch** is the validator orchestration layer. It connects to multiple beacon nodes simultaneously, uses pluggable strategies to select the best block proposals and attestations, and integrates MEV-boost natively.
- **Dirk** is the distributed key manager. It uses certificate-based access control, durable slashing protection, and threshold signing (Shamir Secret Sharing) to keep validator keys secure across multiple machines.

Together they enable multi-beacon-node resilience, zero-downtime operational upgrades, and cryptographic separation between signing logic and key custody.

**For a deeper overview, see [Vouch & Dirk: The Infrastructure Behind ETH Staking](./vouch-and-dirk.md).**

---

## Institutional Integration — [The Chorus One SDK](https://chorus-one.gitbook.io/sdk)

Institutional clients integrating ETH staking into their own platforms can use the [Chorus One SDK](https://chorus-one.gitbook.io/sdk) — an all-in-one toolkit for building non-custodial staking flows. The SDK handles transaction construction, signing, and broadcast directly in the client's environment, supporting custom custody models including Fireblocks, Ledger, and browser wallets.

For institutional inquiries: `StakingBOS@bitwiseinvestments.com`

---

{% hint style="info" %}
<!-- TODO: WIP — Chorus One ETH staking dapp URL pending product release. Current link points to legacy C1 portal. -->
**To use Chorus One ETH Staking, visit the staking portal at** [**opus.chorus.one/pool/stake**](https://opus.chorus.one/pool/stake/)

**For a step-by-step walkthrough, see Staking & Restaking ETH**
{% endhint %}
