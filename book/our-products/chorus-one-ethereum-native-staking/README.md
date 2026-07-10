---
metaLinks:
  alternates:
    - >-
      https://app.gitbook.com/s/KGu77aAU8HQJ5FTwSgOi/our-products/chorus-one-ethereum-native-staking
---

# Chorus One Ethereum Native Staking

Ethereum Proof-of-Stake processing of consensus and building a blockchain is enabled by validators who secure the network by proposing new blocks containing user transactions and attesting to blocks of other validators. For this work, validators are rewarded with ETH.

To create a validator, one needs to call deposit contract with transfer of a minimum amount of 32 ETH, bundling the transfer with a deposit dataset that includes the following:

* The validator's public key
* Withdrawal credentials
* The amount of ETH being deposited
* Network detail where validator will be running (Mainnet, Gnosis, etc)
* A signature proving ownership of the validator's private key

Chorus One Native Staking API for Ethereum provides functionality to generate this data on-demand. The Ethereum client instances corresponding to validators created with this API will be running in Chorus One infrastructure.

To start using API, read our [Integration Guide](api-integration-guide.md) or jump straight to [API docs](https://native-staking.chorus.one/docs)
