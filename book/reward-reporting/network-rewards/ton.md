---
description: Onchain TON Pool staking reward data, at pool and nominator level.
icon: coins
---

# TON Pool Rewards API

The TON Pool Rewards API returns onchain staking reward data for Chorus One TON pools. It reports rewards at the pool level and for individual nominators.

Authenticate with the `X-API-KEY` header; see [Rewards Dashboard API Keys](../../rewards-dashboard-api-keys.md) to obtain a key. Historical backfill is available from the date of first stake.

## Nominator rewards

{% openapi src="https://rewards-api.chorus.one/ton-rewards/spec.json" path="/ton-rewards/v1/nominator_rewards" method="get" %}
https://rewards-api.chorus.one/ton-rewards/spec.json
{% endopenapi %}

## Pool rewards

{% openapi src="https://rewards-api.chorus.one/ton-rewards/spec.json" path="/ton-rewards/v1/pool_rewards" method="get" %}
https://rewards-api.chorus.one/ton-rewards/spec.json
{% endopenapi %}
