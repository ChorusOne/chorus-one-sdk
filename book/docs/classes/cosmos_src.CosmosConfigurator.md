This class provides the functionality to auto configure the Cosmos network
based on the chain registry: https://github.com/cosmos/chain-registry

The CosmosStaker requires a user to provide information about gas, fees and denom. This data varies per network and changes over time.
With this class that configuration is done automatically, based on the external community-based chain registry.

# Table of contents

## Constructors

- [constructor](cosmos_src.CosmosConfigurator.md#constructor)

## Methods

- [genNetworkConfig](cosmos_src.CosmosConfigurator.md#gennetworkconfig)

# Constructors

## constructor

• **new CosmosConfigurator**(): [`CosmosConfigurator`](cosmos_src.CosmosConfigurator.md)

### Returns

[`CosmosConfigurator`](cosmos_src.CosmosConfigurator.md)

# Methods

## genNetworkConfig

▸ **genNetworkConfig**(`network`, `gas?`, `gasPrice?`): `Promise`\<`CosmosNetworkConfig`\>

This **static** method is used to generate the network configuration for the Cosmos network.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `network` | `string` | Network name (e.g. celestia) |
| `gas?` | `number` \| ``"auto"`` | (Optional) Gas limit for the transaction |
| `gasPrice?` | `string` | (Optional) Gas price per unit of gas |

### Returns

`Promise`\<`CosmosNetworkConfig`\>

Returns an CosmosNetworkConfig object
