## Cosmos Staking Guide

Cosmos staking refers to staking on any Cosmos-SDK based network. This could be Celestia, Cosmos Hub, Dydx, Osmosis and more.

You will need the proper configuration for each one of these networks to use the CLI.

### Example Configuration

For your convenience, we have provided a [reference configuration for Celestia Tesnet](./example/config.celestia.json).

Alternatively you can use the CLI to generate a network configuration using the [Cosmos Chain Registry](https://github.com/cosmos/chain-registry):

```
$ chorus-one-staking cosmos config gen celestia
{
  "rpcUrl": "https://public-celestia-rpc.numia.xyz",
  "bechPrefix": "celestia",
  "denom": "utia",
  "denomMultiplier": "1000000",
  "gas": 200000,
  "gasPrice": "0.02",
  "fee": "4000"
}
```

### Staking Operations

Please note that unless you pass the `--broadcast` flag, your transaction will not be sent to the network.

Signing a transaction and broadcasting it are two separate actions. Therefore, having a signed transaction does not affect your account unless it is also broadcast and processed by the network.

To delegate your funds (e.g., `1 TIA`), execute the following command:

```
chorus-one-staking cosmos tx delegate 1 -c ./config.celestia.json --broadcast
```

To unbond funds, use the following command:

```
chorus-one-staking cosmos tx unbond 1 -c ./config.celestia.json --broadcast
```

The CLI is interactive. It will prompt you before signing a transaction and broadcasting it, allowing you time to review its contents.

### How to Interpret Raw Transaction Data?

Cosmos SDK based chains use a JSON structured format. Unlike Ethereum, the cosmos-sdk transactions are human readable and easy to understand. With Ethereum you are forced to `blind sign` a stream of bytes everytime you interact with a contract.

Here's an example of a delegation transaction printed by the CLI:

```
{
  "chain_id": "mocha-4",
  "account_number": "73557",
  "sequence": "7",
  "fee": {
    "amount": [
      {
        "amount": "80000",
        "denom": "utia"
      }
    ],
    "gas": "200000"
  },
  "msgs": [
    {
      "type": "cosmos-sdk/MsgDelegate",
      "value": {
        "delegator_address": "celestia163l3w3m8nmgyq08helyvjq6tnpktr265tqljkn",
        "validator_address": "celestiavaloper1ksqfc6445yq82n3p28utpt500fyddrtlezx3pp",
        "amount": {
          "denom": "utia",
          "amount": "100"
        }
      }
    }
  ],
  "memo": ""
}
```

As you can see, the message type is `MsgDelegate`, and the contents specify the delegator and validator addresses as well as the amount of tokens to be delegated.

Please be sure to always check the messages included in your transaction, the amount, addresses, and the fee (which should be minimal and cost no more than `1000000utia` = `1 TIA`).

- Any amount specified in the fee is distributed among the validators, therefore it is important to ensure the amount is acceptable.
