---
description: Onchain Ethereum staking reward data for StakeWise V3 vaults.
icon: coins
---

# Ethereum Rewards API

The Ethereum Rewards API returns onchain staking reward data for the Ethereum network, covering StakeWise V3 vault delegator rewards. Rewards are calculated daily.

Authenticate with the `X-API-KEY` header; see [Rewards Dashboard API Keys](../../rewards-dashboard-api-keys.md) to obtain a key. Historical backfill is available from the date of first stake.

## Delegator rewards

{% openapi src="https://rewards-api.chorus.one/ethereum-rewards/spec.json" path="/ethereum-rewards/v1/delegator_rewards" method="get" %}
https://rewards-api.chorus.one/ethereum-rewards/spec.json
{% endopenapi %}
