---
description: What your integration must do, and how to validate it before launching an embedded staking dApp.
icon: list-check
---

# Validate and Deploy

Use this checklist to build and validate an embedded staking dApp integration before launch. It complements the [Integration guide](./integration-guide.md), which covers the integration model and WalletProfile configuration.

## Partner responsibilities

Before loading the dApp, your integration must:

1. Open the approved URL for the approved application and action.
2. Make the agreed wallet connection available in the WebView before, or around, initial dApp hydration.
3. Keep the account and network state accurate for the wallet connection.
4. Present wallet approval prompts and require the user to approve each transaction.
5. Test the integration in the target wallet environment before launch.

For EVM integrations, the wallet should return EVM accounts for EVM account requests. Where an approved integration supports mixed account responses, non-EVM accounts may be ignored and the user asked to select an EVM account.

## Validation and acceptance testing

Complete the following before launch:

1. Confirm the supplied profile URL selects the intended application and wallet experience.
2. Confirm the provider is available on first load and after a reload.
3. Confirm the allowed wallet list and every enabled wallet control match the agreed configuration.
4. Connect, stake, unstake, and withdraw using the target wallet environment.
5. Confirm the wallet displays the expected signing prompt and the dApp reports transaction status correctly.
6. Reload after activation and confirm the intended profile remains active.
7. For EVM, test account changes, network changes where enabled, and non-EVM-account handling where relevant.

{% hint style="info" %}
For help preparing or validating an integration, contact the staking team at `StakingBOS@bitwiseinvestments.com`.
{% endhint %}
