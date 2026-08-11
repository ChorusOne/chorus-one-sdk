---
description: How partners embed the staking dApp in their own product using an approved WalletProfile.
icon: puzzle-piece
---

# Integration guide

Partners can embed the Chorus One staking dApp directly inside their own product, such as a wallet, an institutional custody platform, or another host application, so their users stake without leaving that product. This is the **embedded dApp experience**: your app opens the standard staking dApp, makes the agreed wallet connection available to it, and an approved **WalletProfile** tailors how the dApp behaves for your integration.

This page explains how an embedded integration is activated and what it can configure. Before launch, work through [Validate and Deploy](./validate-and-deploy.md).

{% hint style="info" %}
To discuss an embedded integration for your wallet or custody platform, contact the staking team at `StakingBOS@bitwiseinvestments.com`.
{% endhint %}

## Integration model

The embedded dApp experience supports two methods:

* **WebView (standard).** Your app opens the staking dApp at its normal URL in a full in-app view and makes the agreed wallet connection available to the page. This is the preferred method.
* **iframe (by exception).** Embedding the dApp inside a child frame is a non-preferred method and is assessed separately. It requires an approved wallet connection inside the child frame, an appropriate `frame-ancestors` policy, and joint testing for storage, permissions, sizing, and lifecycle behaviour. There is no generic iframe bridge or SDK.

In both methods the user keeps custody of their keys and approves every transaction in their own wallet.

## Activating an integration

An embedded integration is activated with an approved **WalletProfile**, passed as a parameter on the dApp URL:

```text
https://staking.chorus.one/<application>/<action>?walletProfile=<profile-id>
```

`<application>` must be an approved application, such as `eth` or `sol`. The dApp rejects unknown, disabled, or application-incompatible profile IDs.

The selected profile is retained for that application across navigation and reloads within the same WebView. This persistence identifies the intended dApp experience; it does not persist a provider object or restore a wallet account on its own.

{% hint style="warning" %}
Do not expose profile IDs as an end-user setting. Chorus One supplies the approved entry URL during onboarding.
{% endhint %}

## What you can configure

A WalletProfile controls how the dApp behaves for your integration:

| Area | Options |
| --- | --- |
| Application scope | Restrict the profile to approved applications and, where agreed, actions. |
| Wallet selection | Use the public list; allowlist wallets; place one wallet first; or require one wallet exclusively. |
| Connection | Manual connection, normal wallet-session restoration, or one approved eager connection attempt on page load. |
| Wallet controls | Independently enable or disable: wallet picker, wallet change, disconnect, address copy, and EVM network switching. |
| Staking target | Allow normal target selection or use an approved fixed target. |
| Transaction UI | Use the normal dApp presentation or the external-wallet status view; show or hide fee estimates. |
| Attribution | Apply an approved partner attribution value where supported by the staking flow. |

The dApp validates a profile before use: it must use known applications and wallet implementations; exclusive selection must name exactly one wallet; a preferred wallet must be included in the allowed list; and eager connection requires an approved wallet implementation.

## Connection and signing behaviour

The wallet remains the signing authority in every integration. The profile determines how the dApp connects:

* **Manual** waits for a user connection action.
* **Restore** uses the wallet library's normal persisted-session behaviour.
* **Eager** makes one connection attempt on page load; the dApp does not poll or retry. The host should ensure its provider is ready before the dApp's scripts run.

The dApp rediscovers injected wallet connections on each page load; it does not store injected provider objects.

For EVM integrations, the wallet should return EVM accounts for EVM account requests. Where an approved integration supports mixed account responses, the dApp may ignore non-EVM accounts and require the user to select an EVM account; the same filter applies to account-change events.

The profile also determines whether the user sees the normal in-page transaction experience or a lightweight external-wallet status view (used when signing happens in the wallet's own UI). It does not change transaction construction, signing semantics, submission logic, or sponsorship.
