---
description: You may have heard the term, but what does it mean? Let's dive in.
icon: flask-round-potion
metaLinks:
  alternates:
    - >-
      https://app.gitbook.com/s/KGu77aAU8HQJ5FTwSgOi/getting-started/staking-concepts/what-is-liquid-staking
---

# What is Liquid Staking?

## Staked Assets are Locked Right? Not with Liquid Staking!

When assets are staked, they generally can’t be used for other things. This creates some capital inefficiency.

{% hint style="success" %}
Enter Liquid Staking, a developing in the staking ecosystem that allows staked assets to be leveraged to earn additional yield.&#x20;
{% endhint %}

***

### How Does it Work?

Liquid staking generally works by creating a smart contract that pools the stakeable asset.&#x20;

The smart contract then stakes these assets with various providers.&#x20;

The delegator receives a token that represents a claim on the staked assets. This is a token that can be used and transferred without limitations, opening up new possibilities to leverage your staked assets.&#x20;

{% hint style="info" %}
These are known as Liquid Staking Tokens (LSTs)  or Liquid Staking Derivatives (LSDs) and open up new ways to maximize the benefits of your staked assets.&#x20;
{% endhint %}

***

### What are the Advantages of Liquid Staking?&#x20;

Liquid staking allows quite a few benefits such as:

* Selling the staked asset instantly without going through an unbonding or unstaking period.&#x20;
* Use the asset as collateral to borrow against it.
* Providing the staked asset as liquidity in exchanges and earning trading fees as well as staking rewards at the same time. &#x20;

These are only a few examples of what LSTs can do. There are a variety of DeFi platforms out there where users can get creative with how to maximize the utility of their staked assets.&#x20;

***

### Restaking & Types of Liquid Staking

{% tabs %}
{% tab title="Restaking" %}
Restaking refers to using already staked assets (or their derivatives) to secure additional networks or participate in other staking mechanisms, effectively “stacking” staking opportunities.

**Example:**&#x20;

* EigenLayer or Symbiotic enable restaking of staked osETH through the [Bitwise Onchain Solutions ETH staking portal](../../../our-products/chorus-one-ethereum-staking/) to secure new protocols known as AVS's (Actively Validated Services). <!-- TODO: product name pending — OPUS Pool is being rebranded. See KB_OUTSTANDING_ITEMS.md. -->

**Benefits:**

* Increased capital efficiency.
* Enhanced security for emerging networks and bootstrapping potential.

**Considerations:**&#x20;

* However, in some cases this can lead to Increased risks since slashing could impact the same asset across multiple protocols.
{% endtab %}

{% tab title="Liquid Staking Tokens (LSTs)" %}
LSTs are tokens that represent staked assets in a liquid form. They allow users to continue earning staking rewards while maintaining the flexibility to trade, transfer, or use the tokens in other DeFi applications.

**Use Case:**&#x20;

* If you stake ETH on a liquid staking platform like the [Bitwise Onchain Solutions ETH staking portal](../../../our-products/chorus-one-ethereum-staking/), you receive osETH, which can be used across certain DeFi protocols while your original ETH remains staked. <!-- TODO: product name pending — OPUS Pool is being rebranded. See KB_OUTSTANDING_ITEMS.md. -->
  * Alternatively, it can be restaked to a protocol like EigenLayer or Symbiotic.

**Benefits:**&#x20;

* Liquidity for staked assets.
* Access to DeFi opportunities like lending, borrowing, and trading.
* Continued earning of staking rewards.
{% endtab %}

{% tab title="Liquid Staking Derivatives (LSDs)" %}
LSDs are a subtype of LSTs that represent not only the staked asset but also the accumulated staking rewards.&#x20;

This means the value of the LSD increases over time, reflecting both the staked amount and the rewards earned.

**Example:**&#x20;

* With rETH from Rocket Pool, the token’s value grows as staking rewards are added, eliminating the need for separate reward distribution.

**Benefits:**

* Simplicity in managing staking rewards.
* This can be better suited for long-term holding in DeFi strategies.
* It can help reduce operational complexities for liquid staking platforms.
{% endtab %}
{% endtabs %}

***

{% include "../../../.gitbook/includes/questions.md" %}

***

{% include "../../../.gitbook/includes/about-c1-dropdown.md" %}
