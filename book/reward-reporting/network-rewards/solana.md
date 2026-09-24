---
description: Onchain Solana staking reward data, aligned to Solana epochs.
icon: coins
---

# Solana Rewards API

The Solana Rewards API returns onchain staking reward data for the Solana network: vote-account (validator) rewards and staking-authority (delegator) rewards, aligned to Solana epochs. Rewards include voting rewards, transaction fees, and Jito MEV tips.

Authenticate with the `X-API-KEY` header; see [Rewards Dashboard API Keys](../../rewards-dashboard-api-keys.md) to obtain a key. Historical backfill is available from the date of first stake.

## Vote account rewards

{% openapi src="https://rewards-api.chorus.one/solana-rewards/spec.json" path="/solana-rewards/v1/vote_account_rewards" method="get" %}
https://rewards-api.chorus.one/solana-rewards/spec.json
{% endopenapi %}

## Staking authority rewards

{% openapi src="https://rewards-api.chorus.one/solana-rewards/spec.json" path="/solana-rewards/v2/staking_authority_rewards" method="get" %}
https://rewards-api.chorus.one/solana-rewards/spec.json
{% endopenapi %}
