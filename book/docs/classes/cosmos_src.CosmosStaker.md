# CosmosStaker

This class provides the functionality to stake, unstake, redelegate, and withdraw rewards for Cosmos-based blockchains.

It also provides the ability to retrieve staking information and rewards for a delegator.

**`Example`**

```ts
import { CosmosStaker } from '@chorus-one/cosmos';
import { FireblocksSigner } from '@chorus-one/signer-fireblocks';

const signer = new FireblocksSigner({...});

const staker = new CosmosStaker({
  signer: signer,
  rpcUrl: 'https://rpc.cosmos.network:26657',
  bechPrefix: 'cosmos',
  denom: 'uatom',
  denomMultiplier: "1000000",
  gas: 200000,
  gasPrice: "0.1",
});

await staker.init();

const { tx } = await staker.buildStakeTx({
 amount: '1', // 1 ATOM
 delegatorAddress: 'cosmos1x88j7vp2xnw3zec8ur3g4waxycyz7m0mahdv3p',
 validatorAddress: 'cosmosvaloper1x88j7vp2xnw3zec8ur3g4waxycyz7m0mahdv3p',
 memo: 'Staking 1 ATOM'
});

const signer = new CosmosFireblocksSigner({...})

const { signedTx } = await staker.sign({ 
  signerAddress: 'cosmos1x88j7vp2xnw3zec8ur3g4waxycyz7m0mahdv3p',
  tx
});

const { transactionHash } = await staker.broadcast({ signedTx });
```

## Table of contents

### Constructors

* [constructor](cosmos_src.CosmosStaker.md#constructor)

### Methods

* [getAddressDerivationFn](cosmos_src.CosmosStaker.md#getaddressderivationfn)
* [init](cosmos_src.CosmosStaker.md#init)
* [buildStakeTx](cosmos_src.CosmosStaker.md#buildstaketx)
* [buildUnstakeTx](cosmos_src.CosmosStaker.md#buildunstaketx)
* [buildRedelegateTx](cosmos_src.CosmosStaker.md#buildredelegatetx)
* [buildWithdrawRewardsTx](cosmos_src.CosmosStaker.md#buildwithdrawrewardstx)
* [getStake](cosmos_src.CosmosStaker.md#getstake)
* [getRewards](cosmos_src.CosmosStaker.md#getrewards)
* [sign](cosmos_src.CosmosStaker.md#sign)
* [broadcast](cosmos_src.CosmosStaker.md#broadcast)

## Constructors

### constructor

• **new CosmosStaker**(`params`): [`CosmosStaker`](cosmos_src.CosmosStaker.md)

This creates a new CosmosStaker instance.

#### Parameters

| Name                     | Type                                           | Description                                                                                                                      |
| ------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `params`                 | `Object`                                       | Initialization parameters                                                                                                        |
| `params.signer`          | [`Signer`](../interfaces/signer_src.Signer.md) | Signer instance                                                                                                                  |
| `params.rpcUrl`          | `string`                                       | RPC URL (e.g. https://celestia.chorus.one:443) Please note that `:port` is required                                              |
| `params.bechPrefix`      | `string`                                       | Address prefix (e.g. celestia)                                                                                                   |
| `params.denom`           | `string`                                       | Coin denom (e.g `utia`)                                                                                                          |
| `params.denomMultiplier` | `string`                                       | Multiplier to convert the base coin unit to its smallest subunit (e.g., `1000000` for 1 TIA = 1000000 utia)                      |
| `params.gas`             | `number`                                       | Default TX gas (e.g 200000)                                                                                                      |
| `params.gasPrice`        | `string`                                       | Gas price (e.g "0.4") See: [Chain registry - Celestia](https://github.com/cosmos/chain-registry/blob/master/celestia/chain.json) |

#### Returns

[`CosmosStaker`](cosmos_src.CosmosStaker.md)

An instance of CosmosStaker.

## Methods

### getAddressDerivationFn

▸ **getAddressDerivationFn**(`params`): (`publicKey`: `Uint8Array`, `_derivationPath`: `string`) => \[`string`]

This **static** method is used to derive an address from a public key.

It can be used for signer initialization, i.e. `FireblocksSigner` or `LocalSigner`.

#### Parameters

| Name                | Type     | Description                           |
| ------------------- | -------- | ------------------------------------- |
| `params`            | `Object` | Parameters for the address derivation |
| `params.bechPrefix` | `string` | Address prefix (e.g. celestia)        |

#### Returns

`fn`

Returns an array containing the derived address.

▸ (`publicKey`, `_derivationPath`): \[`string`]

**Parameters**

| Name              | Type         |
| ----------------- | ------------ |
| `publicKey`       | `Uint8Array` |
| `_derivationPath` | `string`     |

**Returns**

\[`string`]

***

### init

▸ **init**(): `Promise`<`void`>

Initializes the CosmosStaker instance and connects to the blockchain.

#### Returns

`Promise`<`void`>

A promise which resolves once the CosmosStaker instance has been initialized.

***

### buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`<{ `tx`: `EncodeObject` }>

Builds a staking (delegation) transaction.

#### Parameters

| Name                      | Type     | Description                                                                                                     |
| ------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `params`                  | `Object` | Parameters for building the transaction                                                                         |
| `params.delegatorAddress` | `string` | The delegator (wallet) address to stake from                                                                    |
| `params.validatorAddress` | `string` | The validator address to stake to                                                                               |
| `params.amount`           | `string` | The amount to stake, specified in base units of the native token (e.g. `ATOM` for Cosmos or `TIA` for Celestia) |

#### Returns

`Promise`<{ `tx`: `EncodeObject` }>

Returns a promise that resolves to a Cosmos staking transaction.

***

### buildUnstakeTx

▸ **buildUnstakeTx**(`params`): `Promise`<{ `tx`: `EncodeObject` }>

Builds an unstaking (undelegate) transaction.

#### Parameters

| Name                      | Type     | Description                                                                                                       |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `params`                  | `Object` | Parameters for building the transaction                                                                           |
| `params.delegatorAddress` | `string` | The delegator (wallet) address that is unstaking                                                                  |
| `params.validatorAddress` | `string` | The validator address to unstake from                                                                             |
| `params.amount`           | `string` | The amount to unstake, specified in base units of the native token (e.g. `ATOM` for Cosmos or `TIA` for Celestia) |

#### Returns

`Promise`<{ `tx`: `EncodeObject` }>

Returns a promise that resolves to a Cosmos unstaking transaction.

***

### buildRedelegateTx

▸ **buildRedelegateTx**(`params`): `Promise`<{ `tx`: `EncodeObject` }>

Builds a redelegation transaction.

* This allows a wallet to redelegate staked assets to a different validator without unstaking.

#### Parameters

| Name                         | Type     | Description                                                                                                          |
| ---------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `params`                     | `Object` | Parameters for building the transaction                                                                              |
| `params.delegatorAddress`    | `string` | The delegator (wallet) address                                                                                       |
| `params.validatorSrcAddress` | `string` | The source validator address to redelegate from                                                                      |
| `params.validatorDstAddress` | `string` | The destination validator address to redelgate to                                                                    |
| `params.amount`              | `string` | The amount to redelegate, specified in base units of the native token (e.g. `ATOM` for Cosmos or `TIA` for Celestia) |

#### Returns

`Promise`<{ `tx`: `EncodeObject` }>

Returns a promise that resolves to a Cosmos redelegation transaction.

***

### buildWithdrawRewardsTx

▸ **buildWithdrawRewardsTx**(`params`): `Promise`<{ `tx`: `EncodeObject` }>

Builds a withdraw (claim) rewards transaction.

#### Parameters

| Name                      | Type     | Description                                            |
| ------------------------- | -------- | ------------------------------------------------------ |
| `params`                  | `Object` | Parameters for building the transaction                |
| `params.delegatorAddress` | `string` | The delegator (wallet) address                         |
| `params.validatorAddress` | `string` | The validator address to withdraw (claim) rewards from |

#### Returns

`Promise`<{ `tx`: `EncodeObject` }>

Returns a promise that resolves to a Cosmos withdraw (claim) rewards transaction.

***

### getStake

▸ **getStake**(`params`): `Promise`<{ `balance`: `string` }>

Retrieves the staking information for a specified delegator.

#### Parameters

| Name                      | Type     | Description                                              |
| ------------------------- | -------- | -------------------------------------------------------- |
| `params`                  | `Object` | Parameters for the request                               |
| `params.delegatorAddress` | `string` | The delegator (wallet) address                           |
| `params.validatorAddress` | `string` | The validator address to gather staking information from |

#### Returns

`Promise`<{ `balance`: `string` }>

Returns a promise that resolves to the staking information for the specified delegator.

***

### getRewards

▸ **getRewards**(`params`): `Promise`<{ `rewards`: `string` }>

Retrieves the rewards data for a specified delegator.

#### Parameters

| Name                      | Type     | Description                                       |
| ------------------------- | -------- | ------------------------------------------------- |
| `params`                  | `Object` | Parameters for the request                        |
| `params.delegatorAddress` | `string` | The delegator (wallet) address                    |
| `params.validatorAddress` | `string` | The validator address to gather rewards data from |

#### Returns

`Promise`<{ `rewards`: `string` }>

Returns a promise that resolves to the rewards data for the specified delegator.

***

### sign

▸ **sign**(`params`): `Promise`<{ `signedTx`: `Uint8Array` }>

Signs a transaction using the provided signer.

#### Parameters

| Name                   | Type           | Description                                      |
| ---------------------- | -------------- | ------------------------------------------------ |
| `params`               | `Object`       | Parameters for the signing process               |
| `params.signerAddress` | `string`       | The address of the signer                        |
| `params.tx`            | `EncodeObject` | The transaction to sign                          |
| `params.memo?`         | `string`       | An optional memo to include with the transaction |

#### Returns

`Promise`<{ `signedTx`: `Uint8Array` }>

A promise that resolves to an object containing the signed transaction.

***

### broadcast

▸ **broadcast**(`params`): `Promise`<`DeliverTxResponse`>

This method is used to broadcast a signed transaction to the Cosmos network.

#### Parameters

| Name              | Type         | Description                              |
| ----------------- | ------------ | ---------------------------------------- |
| `params`          | `Object`     | Parameters for the broadcast             |
| `params.signedTx` | `Uint8Array` | The signed transaction to be broadcasted |

#### Returns

`Promise`<`DeliverTxResponse`>

Returns a promise that resolves to the response of the transaction that was broadcast to the network.
