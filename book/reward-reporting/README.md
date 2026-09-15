---
description: Programmatic access to staking rewards data across supported networks.
icon: chart-line
---

# Reward Reporting

The Reward Reporting APIs provide programmatic access to staking rewards data for institutional clients and partners. Use them to retrieve daily and epoch reward earnings, validator and pool performance, and exportable data for reconciliation and compliance.

Production base URL: `https://rewards-api.chorus.one`.

## Reward types

Reward Reporting is available at two levels:

| Type | What it returns |
| --- | --- |
| **Network rewards** | Onchain staking reward data: the rewards generated on the network, such as daily or epoch reward earnings. |
| **Account rewards** | Onchain reward data supplemented with commission and account-specific commercial parameters. |

## Supported networks

| Network | Reward type | Coverage |
| --- | --- | --- |
| **Solana** | Network rewards | Vote-account and staking-authority rewards |
| **Ethereum** | Network rewards | Vault rewards (powered by StakeWise V3) |
| **TON** | Network rewards | Pool and nominator rewards |
| **NEAR** | Network rewards | Delegator epoch rewards, net of pool commission |
| **dYdX** | Account rewards | Delegator rewards and validator commissions |
| **Hyperliquid** | Account rewards | Delegator rewards and validator commissions |
| **Aleo** | Account rewards | Delegator rewards and validator commissions |

## Authentication

All requests require an API key passed in the `X-API-KEY` header. Your key is automatically scoped to the wallets mapped to your account.

To generate and manage keys, see [Rewards Dashboard API Keys](../rewards-dashboard-api-keys.md).

## Next steps

* [Network Rewards](network-rewards/README.md): onchain reward data for Solana, Ethereum, TON, and NEAR.
* [Account Rewards](account-rewards/README.md): rewards plus commission and account data for dYdX, Hyperliquid, and Aleo.
