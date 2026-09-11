---
description: Onchain staking reward data for Solana, Ethereum, and TON.
icon: chart-simple
---

# Network Rewards

Network rewards return onchain staking reward data: the rewards generated on the network, without commission or account-specific finance data. They enable institutions, custodians, funds, and applications to retrieve daily and epoch-based rewards and generate exports for reporting and reconciliation.

Production base URL: `https://rewards-api.chorus.one`. Authenticate with the `X-API-KEY` header; see [Rewards Dashboard API Keys](../../rewards-dashboard-api-keys.md) to obtain a key.

## Supported networks

| Network | Reward data |
| --- | --- |
| [Solana](solana.md) | Vote-account (validator) and staking-authority (delegator) rewards, aligned to Solana epochs. |
| [Ethereum](ethereum.md) | StakeWise V3 delegator rewards, calculated daily. |
| [TON](ton.md) | Chorus One TON Pool rewards, at pool level and for individual nominators. |

Historical backfill is available from the date of first stake.
