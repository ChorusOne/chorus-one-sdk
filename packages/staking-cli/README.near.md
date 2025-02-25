## NEAR Staking Guide

### Example Configuration

For your convenience we have provided you with a [reference configuration](./example/config.near.json).

### Staking Operations

Please note that unless you pass the `--broadcast` flag, your transaction will not be sent to the network.

Signing a transaction and broadcasting it are two separate actions. Therefore, having a signed transaction does not affect your account unless it is broadcast and processed by the network.

To delegate your funds (e.g., `1 NEAR`), execute the following command:

```
chorus-one-staking near tx delegate 1 -c ./config.near.json --broadcast
```

To unbond funds, use the following command:

```
chorus-one-staking near tx unbond 1 -c ./config.near.json --broadcast
```

To withdraw funds after the unbonding period, use the following command:

```
chorus-one-staking near tx withdraw 1 -c ./config.near.json --broadcast
```

Please note, the CLI is interactive. It will prompt you before signing a transaction and broadcasting it, giving you time to review its contents.

### Demo

[![asciicast](https://asciinema.org/a/nHT85edPgKkx5CC4jtHSK5VaB.svg)](https://asciinema.org/a/nHT85edPgKkx5CC4jtHSK5VaB)
