# Chorus One Staking CLI

The Chorus One Staking CLI is a tool designed to simplify the process of staking or unstaking tokens on variety of blockchain networks.

## Network Support

Under the hood, our staking CLI is based on the [Chorus One SDK](https://github.com/ChorusOne/chorus-one-sdk), therefore you can expect the CLI to support all the networks provided by our SDK.

As of now the CLI supports staking for the following networks:

1. Cosmos ecosystem - Networks based on the Cosmos-SDK, for instance: Cosmos Hub, Celestia, Dydx, and more
2. Substrate ecosystem - Networks based on the Substrate framework, for instance: Polkadot and Kusama
3. Avalanche
4. Ethereum
5. Solana
6. TON
7. NEAR

## How Does it Work?

The CLI allows you to sign staking transactions with a [Local](../signer-local/README.md), or [Fireblocks](../signer-fireblocks/README.md) signer which you specify by `-s <signer>` flag (default: fireblocks).

Here's a brief overview of the signing flow:

1. The CLI parses the configuration file (`config.json`) to gather necessary information such as delegator and validator accounts, gas price etc.
2. The CLI calls the remote blockchain RPC endpoint to fetch data about the delegator account.
3. The CLI calls the signer to retrieve wallet information.
4. Based on the RPC response and configuration, the CLI builds an unsigned transaction and prompts the user to approve its signing.
5. Upon user approval, the CLI sends the unsigned transaction to the Signer for signing.
6. Once the signing response is received, the CLI crafts a blockchain compatible signed transaction using the response data (Public Key and Signature).
7. The signed transaction is displayed on the screen and the user is prompted to broadcast the transaction to the network (if the `--broadcast` flag was set).
8. Upon user approval, the transaction is broadcast through the blockchain RPC and the transaction details are printed on the screen.

In addition to the above, the signed and unsigned transactions are stored in `journal.log` for troubleshooting purposes.

{% hint style="info" %}
Note: It is recommended to remove the `journal.log` once the intended transactions are executed.

To disable the journal function, use `--journal false`
{% endhint %}

## Prerequisites

Before using the CLI, you need to prepare a configuration file with the signer (eg. Firelbocks) wallet account information.

- Fireblocks Signer: You can refer to the [Fireblocks API documentation](https://developers.fireblocks.com/docs/quickstart#api-user-creation) for instructions on how to create an API account.
- For Local Signer: Simply store your mnemonic in the file on the disk and point the configuration to it.

### Fireblocks Signer Configuration

You must instruct the CLI where it can find the Fireblocks API and secret key you have generated via the Fireblocks UI:

- `fireblocks_api_key`: This file contains the API key in the format `<hex>-<hex>-<hex>-<hex>-<hex>`.
- `fireblocks_secret_key`: This file contains the private key from the CSR generation process. The content of this file likely starts with `-----BEGIN PRIVATE KEY-----`.

**Example Configuration:**

```
"fireblocks": {
    "apiSecretKeyPath": "./fireblocks_secret_key",
    "apiKeyPath": "./fireblocks_api_key",

    "vaultName": "celestia-wallet",
    "assetId": "CELESTIA_TEST"
}
```

### Local Signer Configuration

The local signer reads the mnemonic from the disk. In addition, depending on the network, you may need to provide the address deriviation path for the acocunt you wish to sign with.

```
"localsigner": {
    "mnemonicPath": "./mnemonic",
    "accounts": [
        {
            "hdPath": "m/44'/118'/0'/0/0"
        }
    ]
},
```

## Installation

To install the necessary dependencies, run the following command using [npm](https://www.npmjs.com):

```
$ npm install @chorus-one/staking-cli --save --global
```

## Configuration

Proper configuration is crucial for the tool to function correctly. You should ensure that your configuration file (`config.json`) is accurate.

- An example configuration can be found in `config.example.json`.

The most important fields in the configuration are the addresses:

- `validatorAddress`: This is the address of the validator account you want to interact with (e.g. delegate, undelegate, etc.).
- `delegatorAddress`: This is the address of your Fireblocks custodied account. You will delegate from this account to the validator account.

### Cosmos Ecosystem

- [Configuration example](./example/config.celestia.json) (Celestia)
- [Network configuration properties](../cosmos/src/types.d.ts)
- [CLI usage](./README.cosmos.md)

### NEAR

- [Configuration example](./example/config.near.json)
- [Network configuration properties](../near/src/types.d.ts)
- [CLI usage](./README.near.md)

### Avalanche

- [Configuration example](./example/config.avalanche.json)
- [Network configuration properties](../avalanche/src/types.d.ts)
- [CLI usage](./README.avalanche.md)

### Substrate (Polkadot, Kusama, etc.)

- [Configuration example](./example/config.polkadot.json) (Polkadot)
- [Network configuration properties](../substrate/src/types.d.ts)
- [CLI usage](./README.substrate.md)

### TON

- [Configuration example](./example/config.ton.json)
- [Network configuration properties](../ton/src/types.d.ts)
- [CLI usage](./README.ton.md)

### Solana

- [Configuration example](./example/config.solana.json)
- [Network configuration properties](../solana/src/types.d.ts)
- [CLI usage](./README.solana.md)

### Ethereum

- [Configuration example](./example/config.ethereum.json)
- [Network configuration properties](../ethereum/src/lib/types/ethereumConfigNetwork.ts)
- [CLI usage](./README.ethereum.md)

## Security

There are a few important security measures you should take into account:

1. Do not share your Fireblocks API authentication keys with anyone.
2. Ensure that you have a proper [Transaction Authorization Policy](https://developers.fireblocks.com/docs/capabilities#transaction-authorization-policy-tap) in place. Access to a given vault should be limited for the API account.
3. Always review the transaction contents before signing.

## License

This program is provided under the terms of the Apache 2.0 License. See the `LICENSE` file for more information.
