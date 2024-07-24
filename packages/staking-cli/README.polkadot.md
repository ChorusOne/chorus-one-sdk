## Substrate Staking Guide

Substrate staking referes to staking on any Substrate Framework based network (e.g Polkadot, Kusama).

### Example Configuration

For your convenience we have provided you with a [reference configuration](./example/config.polkadot.json).

### Staking Operations

Please note that unless you pass the `--broadcast` flag, your transaction will not be sent to the network.

Signing a transaction and broadcasting it are two separate actions. Therefore, having a signed transaction does not affect your account unless it is broadcast and processed by the network.

**Note:** On the Polkadot network the staking is split into two stages: nomination and delegation.

To stake your tokens with a validator of your choice, you first need to execute two transactions. One to stake tokens and the second to nominate the stake to a validator.

- If after the first delegation you decide to bond more tokens, you will need to use the `bond-extra` command.

To delegate your funds (e.g., `1 DOT`), execute the following command:

```
chorus-one-staking substrate tx delegate 1 -c ./config.polkadot.json --broadcast
```

To bond additional funds, use the following command:

```
chorus-one-staking substrate tx bond-extra 1 -c ./config.polkadot.json --broadcast
```

To nominate your stake to a validator:

```
chorus-one-staking substrate tx nominate -c ./config.polkadot.json --broadcast
```

To unbond `1 DOT` from your stake:

```
chorus-one-staking substrate tx unbond 1 -c ./config.polkadot.json --broadcast
```

To withdraw after past the unbonding period, use the following command:

```
chorus-one-staking substrate tx withdraw -c ./config.polkadot.json --broadcast
```

Please note, the CLI is interactive. It will prompt you before signing a transaction and broadcasting it, giving you time to review its contents.
