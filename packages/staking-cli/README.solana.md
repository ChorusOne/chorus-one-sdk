## Solana Staking Guide

### Example Configuration

For your convenience we have provided you with a [reference configuration](./example/config.solana.json).

### Staking Operations

Please note that unless you pass the `--broadcast` flag, your transaction will not be sent to the network.

Signing a transaction and broadcasting it are two separate actions. Therefore, having a signed transaction does not affect your account unless it is broadcast and processed by the network.

To delegate your funds (e.g., `1 SOL`), execute the following command:

```
chorus-one-staking solana tx delegate 1 -c ./config.solana.json --broadcast
```

To unstake `1 SOL` execute the following command:

```
chorus-one-staking solana tx undelegate 1 -c ./config.solana.json --broadcast
```

To withdraw funds after the unbonding period, execute the following command:

```
chorus-one-staking solana tx withdraw-stake <stake account address> <amount> -c ./config.solana.json --broadcast
```

To list all owned staking accounts, execute:

```
chorus-one-staking solana keys get-staking-accounts -c ../../config.solana.json

┌─────────┬────────────────────────────────────────────────┬────────┬──────────────┐
│ (index) │ address                                        │ amount │ state        │
├─────────┼────────────────────────────────────────────────┼────────┼──────────────┤
│ 0       │ 'HJRL5PTpvwxmt796M7xDavRbPkjN28iGPVBkJn9y6rYE' │ 2      │ 'activating' │
└─────────┴────────────────────────────────────────────────┴────────┴──────────────┘
```

Please note, the CLI is interactive. It will prompt you before signing a transaction and broadcasting it, giving you time to review its contents.

### Demo

[![asciicast](https://asciinema.org/a/A87sSIVlH22sL3WulcD0jdJIH.svg)](https://asciinema.org/a/A87sSIVlH22sL3WulcD0jdJIH)
