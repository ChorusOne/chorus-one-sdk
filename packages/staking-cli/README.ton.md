## TON Staking Guide

TON staking happens via a deployed contract and the CLI supports two types of contracts:

1. Single Nominator Pool: Only one nominator is alloweed
1. Nominator Pool: A few nominators are allowed

{% hint style="warning" %}
It is important to know what type of validator you are staking to prior to running any command.
{% endhint %}

### Example Configuration

For your convinience we provided you with a [reference configuration](./example/config.ton.json).

### Staking Operations

Please note that unless you pass the `--broadcast` flag, your transaction will not be sent to the network.

Signing a transaction and broadcasting it are two separate actions. Therefore, having a signed transaction does not affect your account unless it is broadcast and processed by the network.

To delegate your funds (e.g., `1 TON`), run a selected command based on the validator contract type:

```
chorus-one-staking ton tx delegate-nominator-pool 1 -c ./config.ton.json --broadcast
chorus-one-staking ton tx delegate-single-nominator-pool 1 -c ./config.ton.json --broadcast
```

To unstake `1 TON`, run one of the respective commands below:

```
chorus-one-staking ton tx unstake-nominator-pool -c ./config.ton.json --broadcast
chorus-one-staking ton tx unstake-single-nominator-pool 1 -c ./config.ton.json --broadcast
```

{% hint style="info" %}
The nominator pool contract doesn't allow partial unstaking. It is only possible to unstake the full amount.
{% endhint %}

Please note, the CLI is interactive. It will prompt you before signing a transaction and broadcasting it, giving you time to review its contents.

### Ton
[![asciicast](https://asciinema.org/a/EyCXCh6naN1MvMJH7TXjINPk7.svg)](https://asciinema.org/a/EyCXCh6naN1MvMJH7TXjINPk7)
