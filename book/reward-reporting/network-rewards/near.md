---
description: Onchain NEAR staking reward data at delegator and epoch grain.
icon: coins
---

# NEAR Rewards API

The NEAR Rewards API returns onchain staking reward data for the NEAR network at delegator and epoch grain, net of pool commission. Rewards are keyed on the pool's ping time, the moment the pool contract distributed the reward to delegator shares.

Authenticate with the `X-API-KEY` header; see [Rewards Dashboard API Keys](../../rewards-dashboard-api-keys.md) to obtain a key. Historical backfill is available from the date of first stake.

## Delegator epoch rewards

{% openapi src="https://rewards-api.chorus.one/near-rewards/spec.json" path="/near-rewards/v1/delegator_epoch_rewards" method="post" %}
https://rewards-api.chorus.one/near-rewards/spec.json
{% endopenapi %}
