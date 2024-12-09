# NearStaker

This class provides the functionality to stake, unstake, and withdraw for Near-based blockchains.

It also provides the ability to retrieve staking information and rewards for an account.

**`Example`**

```ts
import { NearStake } from '@chorus-one/near';
import { FireblocksSigner } from '@chorus-one/signer-fireblocks';

const signer = new FireblocksSigner({...});

await signer.init();

const staker = new NearStaker({
  signer,
  networkId: "testnet",
  rpcUrl: "https://rpc.testnet.near.org"
});

await staker.init();

const { tx } = await staker.buildStakeTx({
  amount: '1', // 1 NEAR
  validatorAddress: 'chorusone.pool.f863973.m0',
  validatorAddress: NearStaker.getValidatorAddress(),
});

const { signedTx } = await staker.sign({ tx });
const { transaction: { hash } } = await staker.broadcast({ signedTx });
```

## Table of contents

### Constructors

* [constructor](near_src.NearStaker.md#constructor)

### Methods

* [getAddressDerivationFn](near_src.NearStaker.md#getaddressderivationfn)
* [init](near_src.NearStaker.md#init)
* [buildStakeTx](near_src.NearStaker.md#buildstaketx)
* [buildUnstakeTx](near_src.NearStaker.md#buildunstaketx)
* [buildWithdrawTx](near_src.NearStaker.md#buildwithdrawtx)
* [getStake](near_src.NearStaker.md#getstake)
* [getRewards](near_src.NearStaker.md#getrewards)
* [sign](near_src.NearStaker.md#sign)
* [broadcast](near_src.NearStaker.md#broadcast)

## Constructors

### constructor

• **new NearStaker**(`params`): [`NearStaker`](near_src.NearStaker.md)

Creates a NearStaker instance.

#### Parameters

| Name                      | Type                                           | Description                                                                                                                       |
| ------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `params`                  | `Object`                                       | Initialization configuration                                                                                                      |
| `params.signer`           | [`Signer`](../interfaces/signer_src.Signer.md) | A signer instance.                                                                                                                |
| `params.networkId`        | `string`                                       | The network ID of the Near network (e.g., `mainnet`, `testnet`)                                                                   |
| `params.rpcUrl`           | `string`                                       | The URL of the Near network RPC endpoint                                                                                          |
| `params.denomMultiplier?` | `string`                                       | Multiplier to convert the base coin unit to its smallest subunit (e.g., `10^24` for 1 NEAR = 1000000000000000000000000 yoctoNear) |
| `params.gas?`             | `string`                                       | Amount of gas to be sent with the function calls (e.g "30000000000000" yoctoNear)                                                 |

#### Returns

[`NearStaker`](near_src.NearStaker.md)

An instance of NearStaker.

## Methods

### getAddressDerivationFn

▸ **getAddressDerivationFn**(): (`publicKey`: `Uint8Array`, `_derivationPath`: `string`) => \[`string`]

This **static** method is used to derive an address from a public key.

It can be used for signer initialization, i.e. `FireblocksSigner` or `LocalSigner`.

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

Initializes the NearStaker instance and connects to the Near network.

#### Returns

`Promise`<`void`>

A promise which resolves once the NearStaker instance has been initialized.

***

### buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`<{ `tx`: `Transaction` }>

Builds a staking transaction.

#### Parameters

| Name                      | Type     | Description                                  |
| ------------------------- | -------- | -------------------------------------------- |
| `params`                  | `Object` | Parameters for building the transaction      |
| `params.delegatorAddress` | `string` | The delegator (wallet) address to stake from |
| `params.validatorAddress` | `string` | The validator address to stake with          |
| `params.amount`           | `string` | The amount to stake, specified in `NEAR`     |

#### Returns

`Promise`<{ `tx`: `Transaction` }>

Returns a promise that resolves to a Near staking transaction.

***

### buildUnstakeTx

▸ **buildUnstakeTx**(`params`): `Promise`<{ `tx`: `Transaction` }>

Builds an unstaking transaction.

#### Parameters

| Name                      | Type     | Description                                      |
| ------------------------- | -------- | ------------------------------------------------ |
| `params`                  | `Object` | Parameters for building the transaction          |
| `params.delegatorAddress` | `string` | The delegator (wallet) address that is unstaking |
| `params.validatorAddress` | `string` | The validator address to unstake from            |
| `params.amount`           | `string` | The amount to unstake, specified in `NEAR`       |

#### Returns

`Promise`<{ `tx`: `Transaction` }>

Returns a promise that resolves to a Near unstaking transaction.

***

### buildWithdrawTx

▸ **buildWithdrawTx**(`params`): `Promise`<{ `tx`: `Transaction` }>

Builds a withdrawal transaction.

**The amount to be withdrawn must be previously unstaked.**

* If the amount is not specified, all the available unstaked amount will be withdrawn.

#### Parameters

| Name                      | Type     | Description                                 |
| ------------------------- | -------- | ------------------------------------------- |
| `params`                  | `Object` | Parameters for building the transaction     |
| `params.delegatorAddress` | `string` | The delegator (wallet) address              |
| `params.validatorAddress` | `string` | The validator address to withdraw from      |
| `params.amount`           | `string` | The amount to withdraw, specified in `NEAR` |

#### Returns

`Promise`<{ `tx`: `Transaction` }>

Returns a promise that resolves to a Near withdrawal transaction.

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

▸ **sign**(`params`): `Promise`<{ `signedTx`: `SignedTransaction` }>

Signs a transaction using the provided signer.

#### Parameters

| Name                   | Type          | Description                        |
| ---------------------- | ------------- | ---------------------------------- |
| `params`               | `Object`      | Parameters for the signing process |
| `params.signerAddress` | `string`      | The address of the signer          |
| `params.tx`            | `Transaction` | The transaction to sign            |

#### Returns

`Promise`<{ `signedTx`: `SignedTransaction` }>

A promise that resolves to an object containing the signed transaction.

***

### broadcast

▸ **broadcast**(`params`): `Promise`<`FinalExecutionOutcome`>

Broadcasts a signed transaction to the network.

#### Parameters

| Name              | Type                | Description                          |
| ----------------- | ------------------- | ------------------------------------ |
| `params`          | `Object`            | Parameters for the broadcast process |
| `params.signedTx` | `SignedTransaction` | The signed transaction to broadcast  |

#### Returns

`Promise`<`FinalExecutionOutcome`>

A promise that resolves to the final execution outcome of the broadcast transaction.
