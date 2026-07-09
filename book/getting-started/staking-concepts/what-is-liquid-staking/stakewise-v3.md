---
description: A comprehensive overview of StakeWise V3
metaLinks:
  alternates:
    - >-
      https://app.gitbook.com/s/KGu77aAU8HQJ5FTwSgOi/getting-started/staking-concepts/what-is-liquid-staking/stakewise-v3
---

# StakeWise V3

## **A brief introduction to StakeWise v3**

Jordan Sutcliffe, Head of Business Development at Stakewise, aptly coined StakeWise V3 as the ‘[Swiss army knife](https://www.youtube.com/watch?v=HA2f0XhRN_8\&t=7755s)’ for ETH staking, sparking a flurry of interest from ETH enthusiasts. During the unveiling, the team revealed that the new version opens the doors for anyone capable of running Ethereum validators to engage in liquid staking and receive delegations in a permissionless manner.

This is an approach that aims to welcome a broader range of participants, fostering control and driving decentralization within the Ethereum staking ecosystem.

#### StakeWise V3 achieves this by introducing the concept of layered staking, allowing users to:

1. Delegate ETH to a vault of the node operator(s) of their liking (1st layer)
2. Giving them the option to mint osETH to represent their stake (2nd layer)

This design enables anyone to join as a solo staker who can mint osETH tokens against their node, or delegate ETH across multiple nodes to counteract network concentration.&#x20;

Notably, StakeWise v3 introduces a slashing-resistant staked ETH token, osETH, ensuring scalability without introducing systemic risk to the broader ecosystem.

## **The current state of Ethereum Staking, and why it had previously been an exclusive club**

Ethereum was conceived with the mission of building a permissionless, censorship-resistant and financially robust network for value exchange.

The transition to Proof of Stake (PoS) through the Merge aimed to democratize participation, shedding the hardware and compute costs of Proof of Work (PoW). A year on from the Merge, however, centralization remains one of Ethereum’s biggest challenges - ironically, drifting towards the paradox of its own mission statement.

Staking on Ethereum had previously mandated validators to lock up 32 ETH with the network. While this investment yields interest, any misstep or dishonest conduct by a validator can lead to the revocation of funds. Setting up a validator node to stake on the network can also be a complicated task, meaning financial penalties can result if things are set up improperly.

{% hint style="info" %}
To address this, liquid staking protocols emerged as intermediaries, enabling solo stakers and institutions to pool their ETH, collectively forming the 32 ETH required for a node.
{% endhint %}

This innovation democratized ETH staking, allowing nearly anyone to participate. Intermediaries assumed the operational responsibilities, handling the pooling, staking, and technical requirements, while taking a share of the rewards for their efforts.

### Why StakeWise V3?

The drawback of the pre-existing version of StakeWise and its counterparts is simple but crucial.&#x20;

The absence of technical or capital requirements, the ability to temporarily exit from staking, and the increased efficiency of staked capital presented by liquid staking protocols resonate with depositors to an extent that it leads to a decrease in solo stakers (for example, individuals setting up ETH validators at home).&#x20;

Over time, this decline can significantly impact Ethereum’s security and decentralization.

To address this, the StakeWise DAO introduced StakeWise V3, its latest version that allows anyone from solo stakers to established node operators to financial institutions to participate.&#x20;

As a solo staker, one can seamlessly launch their own nodes, mint staked ETH (osETH) tokens against their nodes, or delegate any amount of ETH across multiple nodes to counteract network concentration.‍

## **The key components of StakeWise V3: Vaults and the osETH Token**

### ‍**Layer 1: Vaults**

At the heart of StakeWise V3 are ‘Vaults’ - a network of permissionless, non-custodial staking mini pools that anyone can launch on the [StakeWise platform](https://docs.stakewise.io/) and receive ETH delegations on their nodes.&#x20;

{% hint style="info" %}
<!-- TODO: WIP — BOS staking dapp URL (opus.chorus.one) pending product release. See KB_OUTSTANDING_ITEMS.md. -->
The BOS MEV Max Vault can be accessed on [StakeWise directly](https://app.stakewise.io/vault/mainnet/0xe6d8d8ac54461b1c5ed15740eee322043f696c08) or via the BOS staking portal at [opus.chorus.one/pool/stake](https://opus.chorus.one/pool/stake/).

For more on BOS Ethereum staking, see the [ETH Staking Overview](../../../our-products/chorus-one-ethereum-staking/).

Operators interested in running their own vault can contact the BOS staking team at `StakingBOS@bitwiseinvestments.com`.
{% endhint %}

StakeWise vaults offer the user freedom to stake with whichever vault they want, choosing between vaults run by solo stakers, node operator companies, and groups of solo/commercial operators.

<figure><img src="../../../.gitbook/assets/image (46).png" alt=""><figcaption><p>Source: StakeWise V3 Litepaper</p></figcaption></figure>

For every 32 ETH of deposits accumulated in a Vault, the Vault operator(s) registers an Ethereum validator in the Beacon Chain and starts staking. The staking rewards belong to the depositors, net of the staking fee charged by the Vault.

Importantly, each of these Vaults is completely unique to the configurations set up by its operator, meaning that the operator can fully customize its vault as per its own design, allowing users to pick a vault based on the features that best suit the depositor.&#x20;

Essentially, Vaults are completely agnostic to the staking solutions that an operator wants to run - whatever client solutions, KYC features, MEV relays or DVT middleware that the entity wants to run are under their control.&#x20;

This leads to a very diverse marketplace of staking solutions that users can shop around and choose from.

Moreover, Vault Operators can set their Vault to a private setting, allowing deposits only from addresses whitelisted by the Vault Operator.&#x20;

This enables use cases like solo stakers depositing ETH into their own Vault and not accepting deposits from others. For instance, compliance-sensitive organizations can create a Vault to enable staking for only a limited number of KYC'd participants.

### **Layer 2: The osETH Token**

The osETH Token is a new type of _overcollateralized_ ETH token introduced by v3, which is a liquid ERC-20 representation of staked assets that uses Vault Token(s) as collateral. It can be minted by anyone who has staked ETH into a Vault(s), or can be bought/sold on decentralized exchanges.

Importantly, osETH represents a new type of liquid-staked ETH token that has its value pegged to staked ETH 1:1, but that does not directly pass on the slashing losses to holders, **ensuring that all the staking rewards and penalties remain isolated to the individual Vault.**&#x20;

To ensure this, V3 requires >1 ETH for every osETH that stakers in a Vault want to mint.&#x20;

In the scenario where slashing does occur, there is always a reserve of ETH that absorbs the slashing losses before osETH holders are affected. This protects osETH holders from losing their principal, making osETH a safer option for staking.

Note that the stakers who _mint_ osETH are [still exposed to the slashing risk](https://stakewise.medium.com/what-is-oseth-a-deep-dive-into-the-overcollateralized-staked-ether-token-of-stakewise-v3-part-1-37d14e28282a) of the Vaults in which they staked ETH, and excess collateralization makes sure that the other osETH holders are not affected.

<figure><img src="../../../.gitbook/assets/image (47).png" alt=""><figcaption><p>Source: StakeWise V3 Litepaper</p></figcaption></figure>

## **The Use Cases of StakeWise**

<details>

<summary>For Solo Stakers</summary>

StakeWise V3 empowers solo stakers by allowing them to mint osETH tokens against their nodes, providing access to DeFi opportunities while maintaining a non-custodial setup.&#x20;

Solo stakers can set up private vaults, mint osETH, and even earn additional revenue by hosting validators for other stakers.&#x20;

Alternatively, public vaults enable solo stakers to accept delegations, maximize their score, and mint osETH based on received vault tokens.

</details>

<details>

<summary>For DeFi Users</summary>

StakeWise V3 caters to users seeking yields by providing osETH tokens, tradable in decentralized exchanges or minted within vaults.&#x20;

osETH integrates slashing protection, and ensures that staked capital is not co-mingled across funds, thereby offering a less-risky, diverse marketplace for users to mint osETH and use it in DeFi, even allowing users to take advantage of boosted ETH staking.

</details>

<details>

<summary>For Institutions and Exchanges</summary>

Financial institutions typically prefer direct engagement with trusted staking service providers to ensure due diligence and favorable terms.&#x20;

StakeWise V3 caters to this preference by enabling institutions and exchanges to create private vaults, allowing exclusive collaboration with chosen operators and staking clients.&#x20;

Vault tokens from staking represent staked ETH, offering institutions the flexibility to enable liquidity and utility within their ecosystem.&#x20;

Additionally, for broader access to DeFi markets, institutions can mint or permit customers to mint osETH tokens.

Institutions interested in launching a Private Vault with Bitwise Onchain Solutions can contact the staking team at `StakingBOS@bitwiseinvestments.com`.

</details>

<details>

<summary>For Commercial Node Operators</summary>

In StakeWise V3, operators, whether independent or collaborating with other entities, can establish vaults to accept delegations, allowing depositors to tokenize their staked ETH into osETH.&#x20;

Operators can choose to keep vaults private or public, showcase strong performance, and enhance their vault Score by taking risk-reducing measures.

<!-- TODO: WIP — BOS staking dapp URL (opus.chorus.one) pending product release. -->
Bitwise Onchain Solutions operates an Ethereum staking offering built on StakeWise V3 — accessible as a public vault via the BOS staking portal at [opus.chorus.one/pool/stake](https://opus.chorus.one/pool/stake/) — providing individuals access to liquid staking on BOS's validator infrastructure.

Institutional clients also have the option of launching a Dedicated Vault operated by Bitwise Onchain Solutions, which can be private and ring-fenced or open and custom-branded.

Institutions interested in launching a Dedicated Vault can contact the BOS staking team at `StakingBOS@bitwiseinvestments.com`.

</details>

***

{% include "../../../.gitbook/includes/questions.md" %}

***

{% include "../../../.gitbook/includes/about-c1-dropdown.md" %}
