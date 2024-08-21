# Avalanche Staking Guide

Avalanche operates three distinct chains:

- **C-Chain** (Contract Chain)
- **P-Chain** (Platform Chain)
- **X-Chain** (Exchange Chain)

Staking operations are executed on the **P-Chain**, so you need to have AVAX tokens "bridged" to the P-Chain from (usually) the C-Chain.

**NOTE:** As of June 12, 2024, Fireblocks supports only C-Chain tokens.

## Example configuration

Below is an example configuration file. Replace the placeholders as follows:

- `<delegator-address>`: Your ethereum-formatted C-Chain address (`0x...`)
- `<fireblocks-vault-name>`: Your Fireblocks Vault Name

Ensure you have generated your Fireblocks Raw Signing API keys (`./fireblocks_api_key` and `./fireblocks_secret_key`). Refer to the Fireblocks documentation or `README.md` for details on generating these keys.

```
{
    "validatorAddress": "NodeID-4KXitMCoE9p2BHA6VzXtaTxLoEjNDo2Pt",
    "delegatorAddress": "<delegator-address>",

    "fireblocks": {
        "apiSecretKeyPath": "./fireblocks_secret_key",
        "apiKeyPath": "./fireblocks_api_key",

        "vaultName": "<fireblocks-vault-name>",
        "assetId": "AVAX"
    },

    "localsigner": {
        "mnemonicPath": "./mnemonic"
    },

    "networkType": "avalanche",

    "avalanche": {
        "rpcUrl": "https://api.avax.network",
        "hrp": "avax",
        "denomMultiplier": 1000000000,
        "blockExplorerUrl": "https://avascan.info/blockchain"
    }
}
```

## Deriving account address

The CLI offers a simple way to derive Avalanche addresses based on the `secp256k1` public key from Fireblocks

```
$ chorus-one-staking avalanche keys get -c ./config.avalanche.json
{
  "vault-name": "your-vault-name",
  "c-chain": "0xc228ce3460002879a0fcc5093f4fec76d96051c4",
  "p-chain": "P-fuji163l3w3m8nmgyq08helyvjq6tnpktr265r685eu",
  "x-chain": "X-fuji163l3w3m8nmgyq08helyvjq6tnpktr265r685eu",
  "c-chain-core": "C-fuji163l3w3m8nmgyq08helyvjq6tnpktr265r685eu"
}
```

NOTE: Fireblocks only recognizes tokens on the C-Chain. After transferring them to the P-Chain, you will need to use a block explorer to view updated balances.

## Transfer AVAX from C-chain to P-chain

In Avalanche, cross-chain transfers involve two transactions:

1. `export` tokens from source chain (e.g C-chain)
2. `import` tokens to destination chain (e.g P-chain)

Here's how to transfer 0.02 AVAX from C-chain to P-chain:

```
$ chorus-one-staking avalanche tx export C P 0.02 -c ./config.avalanche.json -b
https://testnet.avascan.info/blockchain/c/tx/q7YVuJrA2AHEy8Pn7hc5SEu2wYCYhtxeeAYtoYfPza8pMwJG9

$ chorus-one-staking avalanche tx import C P -c ./config.avalanche.json -b
https://testnet.avascan.info/blockchain/p/tx/4s44gB4CTmeeLUByuJzr6RBojue67rBs7YGT97e572pqUvjrc
```

NOTE: The `import` transaction does not specify the amount. The CLI will automatically gather all pending UTXOs (unspent transaction outputs) and import them all at once.

## Transfer AVAX from P-chain to C-chain

```
$ chorus-one-staking avalanche tx export P C 0.1 -c ./config.avalanche.json -b
https://testnet.avascan.info/blockchain/p/tx/P1213WMCkZjuKcdyYJnUJ5job7AFXkCW8Hp9mJfMWHYmVCjoj

$ chorus-one-staking avalanche tx import P C -c ./config.avalanche.json -b
https://testnet.avascan.info/blockchain/c/tx/6WxtTjJcPegHiKbpQMt8kaDgBT7wygzLNnk8w2eXRqZKRAgMY
```

## Delegate AVAX tokens on P-Chain

In this example, we delegate 1 AVAX for 2 days to a validator specified in the configuration file:

```
$ chorus-one-staking avalanche tx delegate 1 2 -c ./config.avalanche.json -b
https://testnet.avascan.info/blockchain/p/tx/TD2Qc6WHwnQ9fiaLBqr61KkiWUCkDKotA6GmXpmP3HQpoEY2L
```

NOTE: In Avalanche, there is no undelegation concept. Instead, users stake tokens for a specific period, usually starting from 14 days.

## Demo
[![asciicast](https://asciinema.org/a/F45uaKU8hfTt8q8RDfBeXMfXT.svg)](https://asciinema.org/a/F45uaKU8hfTt8q8RDfBeXMfXT)
