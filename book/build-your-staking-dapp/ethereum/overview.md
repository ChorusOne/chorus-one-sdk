# Overview

Staking on the Ethereum network involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

{% hint style="info" %}

The Ethereum blockchain, renowned for its smart contract functionality and vibrant ecosystem, employs the Proof of Stake (PoS) consensus mechanism in its Ethereum 2.0 upgrade. This transition enhances scalability, security, and energy efficiency. By staking ETH, Ethereum's native token, validators maintain the network, secure the blockchain, and incentivize active participation, ensuring the network remains robust and efficient.

{% endhint %}

The **Chorus One SDK** simplifies the staking process on the Ethereum network, providing developers with the tools needed to build, sign, and broadcast staking transactions.

## Pick the Pool Technology

Before you start developing your staking application, you need to decide which pool technology you want to use. We recommend the Pooled Staking for most use cases, as it is easy to start using with no minimum ETH to stake. For large delegators, we support Native Staking as well through our SDK.


|   | [Pooled Staking](./pooled_staking_overview.md) | [Native Staking](./native_staking_overview.md) |
| - | - | - |
| Best for | Most use cases | Large delegators |
| Delegators  | Unlimited  | 200 / batch |
| Minimal Stake  | None  |  32 ETH per validator |
| Partial Withdrawal | ✅ | ❌ Must withdraw all funds |

Once you have chosen the pool technology, continue with the respective guide.

- [Pooled Staking Guide](./pooled_staking_overview.md)
- [Natie Staking](./native_staking_overview.md)
