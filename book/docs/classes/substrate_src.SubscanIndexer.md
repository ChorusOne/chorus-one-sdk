This class provides the functionality to interact with Subscan Indexer API.

# Table of contents

## Constructors

- [constructor](substrate_src.SubscanIndexer.md#constructor)

## Methods

- [getTxStatus](substrate_src.SubscanIndexer.md#gettxstatus)

# Constructors

## constructor

• **new SubscanIndexer**(`params`): [`SubscanIndexer`](substrate_src.SubscanIndexer.md)

This creates a new SubscanIndexer instance.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Initialization parameters |
| `params.network` | `string` | Substrate network name e.g. 'polkadot', 'kusama' |
| `params.headers?` | `Record`\<`string`, `string`\>[] | (Optional) HTTP headers to include in requests |

### Returns

[`SubscanIndexer`](substrate_src.SubscanIndexer.md)

An instance of SubscanIndexer.

# Methods

## getTxStatus

▸ **getTxStatus**(`txHash`): `Promise`\<`SubstrateTxStatus`\>

### Parameters

| Name | Type |
| :------ | :------ |
| `txHash` | `string` |

### Returns

`Promise`\<`SubstrateTxStatus`\>
