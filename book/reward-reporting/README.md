---
description: Programmatic access to Chorus One staking rewards data across supported networks.
icon: chart-line
---

# Reward Reporting

The Reward Reporting APIs provide programmatic access to staking rewards data for institutional clients and partners. Use them to retrieve daily and epoch reward earnings, validator and pool performance, and exportable data for reconciliation and compliance.

Production base URL: `https://rewards-api.chorus.one`.

## Reward types

Reward Reporting is available at two levels:

| Type | What it returns |
| --- | --- |
| **Network rewards** | Onchain reward data only: the rewards generated on the network, such as daily or epoch reward earnings. |
| **Account rewards** | Onchain reward data supplemented with commission and account-specific parameters from Chorus One finance, giving the commercial view of your rewards. |

## Supported networks

| Network | Reward type | Coverage |
| --- | --- | --- |
| **Solana** | Network rewards | Vote-account and staking-authority rewards |
| **Ethereum** | Network rewards | StakeWise V3 delegator rewards |
| **TON** | Network rewards | Pool and nominator rewards |
| **dYdX** | Account rewards | Delegator rewards and validator commissions |
| **Hyperliquid** | Account rewards | Delegator rewards and validator commissions |
| **Aleo** | Account rewards | Delegator rewards and validator commissions |

## Authentication

All requests require an API key passed in the `X-API-KEY` header. Your key is automatically scoped to the wallets mapped to your account; you can never see rewards for another customer's wallets, even with a valid key.

To generate and manage keys, see [Rewards Dashboard API Keys](../rewards-dashboard-api-keys.md).

## Next steps

* [Network Rewards](network-rewards/README.md): onchain reward data for Solana, Ethereum, and TON.
* [Account Rewards](account-rewards/README.md): rewards plus commission and account data for dYdX, Hyperliquid, and Aleo.
