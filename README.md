<p align="center">
  <img alt="Chorus One" src="./book/assets/chorus-one.png#gh-light-mode-only" width="200" height="200">
  <img alt="Chorus One" src="./book/assets/chorus-one-dark.png#gh-dark-mode-only" width="200" height="200">
</p>

# Chorus One SDK

Welcome to the **Chorus One SDK** monorepo! Here you'll find all the necessary tools and libraries to develop powerful staking dApps across many networks, including Ethereum, Solana TON, Avalanche, Cosmos, NEAR, and Polkadot. This SDK allows developers to build, sign, and broadcast transactions, and to access staking information and rewards for user accounts.

### Key Features

- **Local Transaction Signing**:

  The Chorus One SDK allows users to generate and sign transactions locally on their own devices. This ensures that critical operations - staking, unstaking, delegation, and reward withdrawals - are securely performed without exposing private keys to external environments, reducing the risk of exposure to malicious actors.

- **Elimination of External Dependencies**:

  The SDK approach removes potential attack vectors associated with relying on external APIs for critical operations. By performing transaction building locally, the risk of an API compromise leading to malicious actions is mitigated. Users retain full control and can independently confirm all actions taken, enhancing overall trust and security.

- **Open-Source and Auditable**:

  The Chorus One SDK is open-source, allowing users and developers to review, audit, and contribute to the codebase. This transparency and community involvement ensure that the SDK remains trustworthy and robust.

- **Comprehensive Transaction Management**:

  The Chorus One SDK offers a robust suite of tools for managing staking operations on a variety of networks.

  Users can seamlessly build, sign, and broadcast transactions for staking, unstaking, delegation, and reward withdrawal.

- **Detailed Information Retrieval**:

  Our SDK provides users with the ability to fetch detailed staking information and reward data for any account. This transparency ensures that the user has access to all the information they need to make informed decisions about their staking activities.

- **Flexible Custody Solutions**:

  Our SDK supports a variety of custody options, including mobile wallets, browser extensions, hardware wallets, and custom custodial solutions like Fireblocks.

  This flexibility ensures that the user can choose the solution that best fits their security and operational requirements.

- **Fireblocks Integration**:

  For users who prefer a convenient custodial solution, the Chorus One SDK provides easy-to-use tools for securely signing transactions with Fireblocks across supported blockchain networks. This integration ensures a smooth and secure staking experience.

- **Integrated Validator Support**:

  The SDK includes built-in support for Chorus One validators across all supported blockchain networks. Additionally, it allows users to specify their own validator addresses, providing a customizable staking experience.

- **CLI**:

  The SDK includes a Command Line Interface (CLI) for easy interaction with the SDK and supported networks. This feature simplifies operations, making it accessible for users who prefer command line tools for managing their staking activities.

## Documentation

For detailed instructions on how to set up and use the Chorus One SDK, please visit our [main documentation](http://example.com/todo-fix-me). There, you'll find comprehensive guides, examples, and API references to help you get started with building your staking dApp.

## Installation

The Chorus One SDK is available as a set of npm packages and supports both Node.js and browser environments.

- Please ensure you have **Node.js (v20)** installed on your machine.

To install the SDK, run some of the following commands depending on your setup:

```bash
# Networks

npm install @chorus-one/ethereum --save
npm install @chorus-one/solana --save
npm install @chorus-one/ton --save
npm install @chorus-one/avalanche --save
npm install @chorus-one/cosmos --save
npm install @chorus-one/near --save
npm install @chorus-one/substrate --save # Polkadot and other Substrate chains

# Signers

npm install @chorus-one/signer-fireblocks --save
npm install @chorus-one/signer-local --save
npm install @chorus-one/signer-keplr --save
npm install @chorus-one/signer-ledger-cosmos --save

# CLI
npm install @chorus-one/staking-cli --save --global
```

## Development

### Project Structure

- [**book**](./book/): Documentation source files.
- [**packages**](./packages/): Source code for individual packages.

### Building the SDK

The SDK is built using TypeScript and supports only ES modules both for Node.js and browser environments. To build the SDK, run the following command:

```bash
npm run build
```

This command will build all packages in the monorepo in a correct order.

### Building the API reference

The project uses typedoc to generate API reference with additional markdown post-processing for better readability.

To build the documentation, run the following command:

```bash
make doc
```

## License

The Chorus One SDK is licensed under the Apache 2.0 License. For more detailed information, please refer to the [LICENSE](./LICENSE) file in the repository.
