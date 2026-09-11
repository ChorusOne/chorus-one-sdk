---
description: Per-account staking rewards and validator commissions, including Chorus One finance data.
icon: building-columns
---

# Account Rewards API

The Account Rewards API returns per-account staking rewards and validator commissions for institutional customers. It supplements onchain reward data with commission and account-specific parameters from Chorus One finance, giving the commercial view of your rewards. It currently supports dYdX, Hyperliquid, and Aleo.

Production base URL: `https://rewards-api.chorus.one`.

## Authentication

Pass your API key in the `X-API-KEY` header on every request. The key implicitly scopes responses to the wallets mapped to your account; you can never see rewards for another customer's wallets, even with a valid key. To generate and manage keys, see [Rewards Dashboard API Keys](../../rewards-dashboard-api-keys.md).

## Workflow

1. Call `GET /account-rewards/v1/account` once to discover which wallets your key can read and the pre-built URLs for their rewards.
2. Follow the `reward_urls` returned from step 1 to fetch daily rewards (`/v1/delegator_rewards/...`) or commissions (`/v1/validator_rewards/...`). These are public API paths, so resolve them against `https://rewards-api.chorus.one`.
3. Each rewards response is paginated by date. When `next_url` is non-null, resolve it against `https://rewards-api.chorus.one` to fetch the next page.

## Pagination

Rewards endpoints paginate around a 100-row target, but pages always break on a day boundary. If the 100th and 101st rows fall on the same day, the page is trimmed back so the day is not split, so a non-final page may contain fewer than 100 rows. When more data is available, the response includes a `next_url`; when it is null, the final page has been returned.

## Account

{% openapi src="https://rewards-api.chorus.one/account-rewards/spec.json" path="/account-rewards/v1/account" method="get" %}
https://rewards-api.chorus.one/account-rewards/spec.json
{% endopenapi %}

## Delegator rewards

{% openapi src="https://rewards-api.chorus.one/account-rewards/spec.json" path="/account-rewards/v1/delegator_rewards/{network}/{wallet_address}/{base_symbol}" method="get" %}
https://rewards-api.chorus.one/account-rewards/spec.json
{% endopenapi %}

## Validator rewards

{% openapi src="https://rewards-api.chorus.one/account-rewards/spec.json" path="/account-rewards/v1/validator_rewards/{network}/{wallet_address}/{base_symbol}" method="get" %}
https://rewards-api.chorus.one/account-rewards/spec.json
{% endopenapi %}
