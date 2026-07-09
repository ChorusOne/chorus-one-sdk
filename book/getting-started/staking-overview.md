---
description: >-
  All you need to know about staking, delegations, and running your own
  Validator.
icon: map
metaLinks:
  alternates:
    - >-
      https://app.gitbook.com/s/KGu77aAU8HQJ5FTwSgOi/getting-started/staking-overview
---

# Staking Overview

## Why Stake?&#x20;

Staking offers a way for institutions and individual investors to earn rewards on their assets while still maintaining full custody of them.&#x20;

Whether you're an individual investor seeking to make your assets work for you, or an institution managing a crypto treasury or providing services to clients, staking is the ideal solution.

Below, let's dive into why staking is the most important and reliable source of yield in crypto.

Or, if you prefer, you can review some information packets in the tabs below.&#x20;

{% tabs %}
{% tab title="Staking for Institutions" %}
[Staking for Institutions](https://docsend.com/view/tujzr8ewbc3czik5)
{% endtab %}

{% tab title="Staking as a Service" %}
[Why Stake | Short explanation and public node vs Whitelabel vs SDK](https://docsend.com/view/id67g4tqkxckmcwp)
{% endtab %}

{% tab title="EigenLayer" %}
[Best-practice Infrastructure for EigenLayer: Optimal rewards and minimal risks](https://docsend.com/view/urzs68sqawer9e57)
{% endtab %}

{% tab title="Research" %}
* [MEV on the dYdX v4 chain](https://chorus.one/reports-research/mev-on-the-dydx-v4-chain)
* [Breaking Bots: An alternative way to capture MEV on Solana](https://chorus.one/reports-research/breaking-bots-an-alternative-way-to-capture-mev-on-solana)&#x20;
* [Optimal Risk and Reward on EigenLayer: A first look](https://chorus.one/reports-research/optimal-risk-and-reward-on-eigenlayer-a-first-look)&#x20;
{% endtab %}
{% endtabs %}

***

## What is Staking and Proof of Stake?&#x20;

Let's look at a big picture conceptual overview of staking. While the finer nuances and details of the exact mechanics can vary from network to network, the core concept of Proof of Stake (otherwise referred to as PoS is generally quite similar between networks).&#x20;

In a nutshell, non-custodial staking can be thought of as nearly the equivalent of depositing funds in a high yield savings account, _**however**_, with four main differences.&#x20;

1. You retain control of your assets and your stake remains in your custody.
2. The base value of the asset you're staking can increase or decrease in price.&#x20;
3. The rewards you accrue from staking are generally in the native token you staked, however, for some networks there are exceptions.&#x20;
4. By staking, you are contributing to the overall security of the network though a mechanism known as Proof of Stake.&#x20;
   1. Note: Proof of Stake refers to the overall concept of securing a networks, however, the exact consensus mechanism may vary from network to network.

#### So How Does it Work?

Staking means that holders of a specific token (the staking token) provide the token as collateral vouching for the correct and honest behavior of the validator that they delegate (stake) to.&#x20;

{% hint style="info" %}
It's worth noting that for many networks the terms "stake", "delegate", "bond", etc. are often referring to the same underlying concept.&#x20;

For example, you may hear the term "unstake" and then the asset will go through an "unbonding period" before the unstaking process is finished.&#x20;

Alternatively, you may hear the term "stake" also be referred to as "bond" or "delegate".

These guides will use these different terms but always try to make sure the terminology of the network is used while still conveying the correct gist of the concept for you.&#x20;
{% endhint %}

When you stake, it involves locking away the assets in a non-custodial manner to incentivize network participants  and validators to not act dishonestly. This in turn increases the security of the network via the validators, which are nodes on the network which receive the stake and verify transactions and ensure that the ledger (blockchain) is accurate and continues to move forward.

#### The Role of the Validator

The validator is responsible for processing and verifying transactions, producing blocks and securing the blockchain, thus reaching consensus. Bitwise Onchain Solutions specializes in running validators on many different Proof of Stake networks. Ensuring you stake to a reputable validator not only helps ensure the safety of your funds but also contributes to the health and security of the network.&#x20;

In return validating the network, the validator earns rewards for contributing to the overall network security and moving the blockchain forward. Thus, they earn staking rewards which are distributed to the stakers (delegators) to that validator.&#x20;

This is how staking earns passive rewards on the funds you stake (delegate) to a validator. PoS (Proof of Stake) blockchains generally pay inflationary rewards as well as transaction fees as staking rewards.

<details>

<summary>Where do these staking rewards come from? </summary>

Staking rewards go to the token holders who provide their assets as collateral minus a commission that the staking provider charges for providing their services.

If the validator does something that goes against the protocol rules (e.g. signing two different blocks at the same block height), it can lead to a destruction of the assets staked to that validator, known as "slashing".  This discourages dishonest behavior from validators.&#x20;

Staking is generally non-custodial. That means that the staking provider does not have access to the staked assets. The user retains full custody of the tokens they stake.&#x20;

<img src="../.gitbook/assets/Screenshot 2024-05-16 at 5.42.09 PM.png" alt="" data-size="original">&#x20;

</details>

<details>

<summary>Staking to a Public Node versus a Whitelabel Validator (Staking as a Service)</summary>

Staking to a public node is a simple way to start earning rewards and is a viable option for both individual investors or institutions alike.&#x20;

However, if you wish to have more control of your node, limit who has access to it, or provide branded staking services for your customer base, and receive detailed reports, a Whitelabel node (otherwise referred to VaaS - Validator as a Service) may be a good option to consider.

Certain networks also require the setup and maintenance of as validator node to participate in staking. In this case, pursuing VaaS is a great option to stake your assets.&#x20;

By setting your staking fees for your customers and maintaining full control over your branding elements, providing non-custodial staking as a service and provide a competitive edge. &#x20;

For questions and business inquiries, please reach out to us at StakingBOS@bitwiseinvestments.com

</details>

## What are Consensus Mechanisms?&#x20;

The two main consensus mechanisms are Proof-of-Work (PoW) used by Bitcoin and other networks, and Proof of Stake (PoS), used by Ethereum, Solana, Cosmos, Avalanche, among others.

* **Proof of Work (PoW):** Miners compete to solve complex math problems using powerful computers. The first to solve the problem gets to add a new block to the blockchain and earn rewards. This process uses a lot of electricity and computing power. Bitcoin uses PoW.
* **Proof of Stake (PoS):** Validators are chosen to add new blocks based on how many delegated assets they hold and are willing to "stake" as collateral. The greater number of assets you stake, the higher your chances of being chosen to validate the next block. This method is more energy-efficient.&#x20;

{% hint style="info" %}
Other networks have developed novel consensus mechanisms that go by different names, however, the same fundamental concepts of Proof of Stake are often an underlying aspect of how the network security works.&#x20;
{% endhint %}

<figure><img src="../.gitbook/assets/Screenshot 2024-05-16 at 5.45.57 PM.png" alt=""><figcaption><p>Proof of Work enables greater speed, scalability, efficiency, faster transaction finality, and increased security.  </p></figcaption></figure>

***

## Is Staking Safe?&#x20;

Staking is not the only way to earn rewards in crypto, however, it is by far one of the safest.

Let's look at some of the perks outlined below.&#x20;

<figure><img src="../.gitbook/assets/Screenshot 2024-05-16 at 5.14.29 PM.png" alt=""><figcaption><p>An overview of the perks of staking. </p></figcaption></figure>
