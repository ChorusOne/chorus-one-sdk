---
description: How partners embed the staking dApp in their own environment, and how host set-up and auto-connect work.
icon: puzzle-piece
---

# Embedding the dApp

Partners can embed the staking dApp directly inside their own environment (a wallet, an institutional custody platform, or another host application) so their users stake without leaving that product. When the dApp runs inside a configured host, it detects the environment at load time, adapts its wallet configuration to suit that host, and connects to the active account automatically.

This page explains, at a high level, how a host environment is set up and what behavior to expect. It applies to the staking dApps (`/eth`, `/sol`, `/gram`, `/usdc`).

{% hint style="info" %}
To discuss embedding the staking dApp in your wallet or custody platform, contact the staking team at `StakingBOS@bitwiseinvestments.com`.
{% endhint %}

## How a host environment is set up

The dApp can run in a configuration tailored to a specific host. During onboarding we agree the set-up with the client and enable a matching mode; at run time the dApp detects that mode and adjusts its behavior to suit the host. When no host mode applies, the dApp runs in its default public-web configuration.

Detection happens client-side at page load, based on a signal agreed with the client, typically a parameter the host passes when it loads the dApp. When a host mode is detected, the dApp:

* applies the configuration set up for that host, which can include the wallet connection method, the connector and transport used, which wallets are offered, and whether the dApp auto-connects to the active account; and
* persists the mode so it survives in-app navigation, reverting to the default configuration when the host is no longer present.

Because each mode is configured per client, this page describes the mechanism in general terms rather than detailing any individual environment. The exact set-up for an integration, including the detection signal and the behaviors enabled, is agreed directly with the client as part of onboarding.

## What a host configuration can change

Each configured host runs the dApp with a single, tailored wallet configuration. Depending on the client's needs, a configuration can adjust:

* **Connection method.** How the dApp connects to the host, for example through a provider injected by the host app or a bridge to a parent frame, instead of the public wallet picker.
* **Available wallets.** A configured host typically presents only its own wallet and hides the public wallet picker, disconnect, and network-switching controls, since the host controls the custody context. The default public-web mode offers the full wallet list (injected wallets, browser extensions, and WalletConnect).
* **Transport.** Whether network reads route through the host or through standard RPC. Only signing ever goes through the wallet.
* **Auto-connect.** Whether the dApp connects to the active account automatically on load (see below).
* **Attribution and deep links.** Optional host-specific referral attribution and in-app deep links to particular actions.

## Auto-connect

In a configured host mode, the dApp can connect to the active account automatically, once per page load, without a user gesture; the host is expected to resolve the request silently with its active account. If the attempt fails, the dApp does not retry and the user sees a disconnected state, so the host should ensure its provider is ready before the dApp's scripts run.

In the default public-web mode there is no auto-connect; reconnection relies on the wallet library's own persisted session.

## Multi-account and non-EVM handling

Some host providers expose accounts from multiple chains (for example non-EVM addresses) on EVM methods. The dApp filters incoming accounts down to valid EVM addresses and applies the same filter to account-change events. If a host returns accounts but none are EVM, the dApp prompts the user to select an Ethereum account and treats the wallet as having none. Hosts should therefore either return only EVM accounts on EVM methods, or expect non-EVM entries to be dropped.

## Transaction and signing UX

In configured host modes, signing happens in the host's own UI, so the dApp replaces its in-page confirmation modals with a lightweight status indicator for the duration of the request. Some hosts reload the embedded view after a transaction is broadcast; where that happens, the dApp reconciles pending transactions after the reload so status is not lost. Hosts that keep the page alive through signing receive the normal in-page success dialog.

## Summary

<table><thead><tr><th></th><th>Configured host mode</th><th>Default (public web)</th></tr></thead><tbody><tr><td>Activation</td><td>Client-agreed signal at page load</td><td>None (fallback)</td></tr><tr><td>Wallets offered</td><td>Host's own wallet; picker hidden</td><td>Full wallet list plus WalletConnect</td></tr><tr><td>Connection</td><td>Host-provided provider or bridge</td><td>User's chosen wallet</td></tr><tr><td>Auto-connect</td><td>Yes, once per load</td><td>No (session reconnect only)</td></tr><tr><td>Signing UI</td><td>Host's own UI</td><td>In-page dApp modal</td></tr><tr><td>Persistence</td><td>Remembered across in-app navigation</td><td>Standard wallet session</td></tr></tbody></table>
