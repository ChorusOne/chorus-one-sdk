# Overview

Staking on TON (Telegram Open Network) involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

{% hint style="info" %}
Toncoin (TON) the native cryptocurrency of the TON blockchain, excels in scalability, fast transaction speeds, and minimal fees. By utilizing the Byzantine Fault Tolerance consensus algorithm, TON ensures high security and decentralization. Validators maintain the network by staking Toncoin, which in turn, secures the blockchain and incentivizes participation.
{% endhint %}

The **Chorus One SDK** simplifies this process by providing developers with the tools needed to build, sign, and broadcast staking transactions.

## Pick the Pool Technology

Before you start developing your staking application, you need to decide which pool technology you want to use. We recommend the **TON Pool** for most use cases, as it is easy to start using, it supports an unlimited number of delegators, and it's minimal stake is only 10 TON.

 However, if you have specific requirements, you can choose the **Nominator** or **Single Nominator** pool.

|   | [TON Pool](./ton-pool/overview.md) | [Nominator](./nominator/overview.md) | [Single Nominator](./single-nominator/overview.md) |
| - | - | - |- |
| Recommended | ✅ | | |
| Best for | Most use cases | Large delegators | Single delegators |
| Delegators  | ∞  | 40 Max | 1  |
| Minimal Stake  | 10 TON  |  10,000 TON | 400,000 TON |
| Partial Withdrawal | ✅ | ❌ Must withdraw all funds | ✅|
| Pool creation | ✅ Not needed | ❌ Per request | ❌ Per request |

Once you have chosen the pool technology, continue with the respective guide.

- [TON Pool Guide](./ton-pool/overview.md)
- [Nominator Pool Guide](./nominator/overview.md)
- [Single Nominator Pool Guide](./single-nominator/overview.md)


## Further Reading

- [Why to Stake on TON](https://chorus.one/articles/first-look-exploring-standout-innovations-in-the-ton-ecosystem)
- [How Staking Works on TON](https://chorus.one/articles/ton-series-2-the-mechanisms-of-staking-ton)

