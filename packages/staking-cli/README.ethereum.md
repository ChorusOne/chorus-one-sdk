## Ethereum Staking Guide

### Example Configuration

For your convenience we have provided you with a [reference configuration](./example/config.ethereum.json).

### Staking Operations

Please note that unless you pass the `--broadcast` flag, your transaction will not be sent to the network.

Signing a transaction and broadcasting it are two separate actions. Therefore, having a signed transaction does not affect your account unless it is broadcast and processed by the network.

To delegate your funds (e.g., `1 ETH`), execute the following command:

```
chorus-one-staking ethereum tx delegate 1 -c ./config.ethreum.json --broadcast
```

To unstake `1 ETH` execute the following command:

```
chorus-one-staking ethereum tx undelegate 1 -c ./config.ethreum.json --broadcast
```

To withdraw funds after the unbonding period, execute the following command:

```
chorus-one-staking ethereum tx withdraw -c ./config.ethreum.json --broadcast
```

To mint `1 osETH`, execute the following command:

```
chorus-one-staking ethereum tx mint 1 -c ./config.ethreum.json --broadcast
```

To burn `1 osETH`, execute the following command:

```
chorus-one-staking ethereum tx burn 1 -c ./config.ethreum.json --broadcast
```

Please note, the CLI is interactive. It will prompt you before signing a transaction and broadcasting it, giving you time to review its contents.

### Demo
[![asciicast](https://asciinema.org/a/eMe1QeTwN2WvsQtDvHefkws72.svg)](https://asciinema.org/a/eMe1QeTwN2WvsQtDvHefkws72)
