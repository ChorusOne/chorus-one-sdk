This class provides the functionality to stake, unstake, and withdraw for Ethereum network.

It also provides the ability to retrieve staking information and rewards for an account.

# Table of contents

## Constructors

- [constructor](ethereum_src.EthereumStaker.md#constructor)

## Methods

- [getAddressDerivationFn](ethereum_src.EthereumStaker.md#getaddressderivationfn)
- [init](ethereum_src.EthereumStaker.md#init)
- [buildStakeTx](ethereum_src.EthereumStaker.md#buildstaketx)
- [buildUnstakeTx](ethereum_src.EthereumStaker.md#buildunstaketx)
- [buildWithdrawTx](ethereum_src.EthereumStaker.md#buildwithdrawtx)
- [buildMintTx](ethereum_src.EthereumStaker.md#buildminttx)
- [buildBurnTx](ethereum_src.EthereumStaker.md#buildburntx)
- [getVault](ethereum_src.EthereumStaker.md#getvault)
- [getStake](ethereum_src.EthereumStaker.md#getstake)
- [getRewardsHistory](ethereum_src.EthereumStaker.md#getrewardshistory)
- [getTxHistory](ethereum_src.EthereumStaker.md#gettxhistory)
- [getUnstakeQueue](ethereum_src.EthereumStaker.md#getunstakequeue)
- [getMint](ethereum_src.EthereumStaker.md#getmint)
- [getMintHealth](ethereum_src.EthereumStaker.md#getminthealth)
- [sign](ethereum_src.EthereumStaker.md#sign)
- [broadcast](ethereum_src.EthereumStaker.md#broadcast)
- [getTxStatus](ethereum_src.EthereumStaker.md#gettxstatus)

# Constructors

## constructor

• **new EthereumStaker**(`params`): [`EthereumStaker`](ethereum_src.EthereumStaker.md)

Creates a EthereumStaker instance.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Initialization configuration |
| `params.network` | `Networks` | The network to connect to |
| `params.rpcUrl?` | `string` | (Optional) The URL of the RPC endpoint. If not provided, the public RPC URL for the network will be used. |

### Returns

[`EthereumStaker`](ethereum_src.EthereumStaker.md)

An instance of EthereumStaker.

# Methods

## getAddressDerivationFn

▸ **getAddressDerivationFn**(): (`publicKey`: `Uint8Array`) => `Promise`\<`string`[]\>

This **static** method is used to derive an address from a public key.

It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.

### Returns

`fn`

Returns an array containing the derived address.

▸ (`publicKey`): `Promise`\<`string`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `Uint8Array` |

#### Returns

`Promise`\<`string`[]\>

___

## init

▸ **init**(): `Promise`\<`void`\>

Initializes the EthereumStaker instance and connects to the Ethereum network.

### Returns

`Promise`\<`void`\>

A promise which resolves once the EthereumStaker instance has been initialized.

___

## buildStakeTx

▸ **buildStakeTx**(`params`): `Promise`\<\{ `tx`: [`Transaction`](../interfaces/ethereum_src.Transaction.md)  }\>

Builds a staking transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator (wallet) address to stake from |
| `params.validatorAddress` | \`0x$\{string}\` | The validator (vault) address to stake with |
| `params.amount` | `string` | The amount to stake, specified in `ETH`. E.g. "1" - 1 ETH |
| `params.referrer?` | \`0x$\{string}\` | (Optional) The address of the referrer. This is used to track the origin of transactions, providing insights into which sources or campaigns are driving activity. This can be useful for analytics and optimizing user acquisition strategies |

### Returns

`Promise`\<\{ `tx`: [`Transaction`](../interfaces/ethereum_src.Transaction.md)  }\>

Returns a promise that resolves to an Ethereum staking transaction.

___

## buildUnstakeTx

▸ **buildUnstakeTx**(`params`): `Promise`\<\{ `tx`: [`Transaction`](../interfaces/ethereum_src.Transaction.md)  }\>

Builds an unstaking transaction.

The unstake transaction effectively moves the user's assets into an unstake queue where they remain until they
become eligible for withdrawal. This queue is a safeguard mechanism that ensures the liquidity and stability of
the vault by managing the flow of assets. To check the status of these assets, use the `getUnstakeQueue`
method.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator (wallet) address that is unstaking |
| `params.validatorAddress` | \`0x$\{string}\` | The validator (vault) address to unstake from |
| `params.amount` | `string` | The amount to unstake, specified in `ETH`. E.g. "1" - 1 ETH |

### Returns

`Promise`\<\{ `tx`: [`Transaction`](../interfaces/ethereum_src.Transaction.md)  }\>

Returns a promise that resolves to an Ethereum unstaking transaction.

___

## buildWithdrawTx

▸ **buildWithdrawTx**(`params`): `Promise`\<\{ `tx`: [`Transaction`](../interfaces/ethereum_src.Transaction.md)  }\>

Builds a withdrawal transaction.

This method is the final step in the unstaking process. Once assets in the unstake queue have reached a
withdrawable state (as determined by the `getUnstakeQueue` method), the `buildWithdrawTx` method prepares the
transaction data necessary for transferring these assets back into the user's wallet.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator (wallet) address |
| `params.validatorAddress` | \`0x$\{string}\` | The validator (vault) address to withdraw from |
| `params.positionTickets?` | `string`[] | (Optional) An array of position tickets to withdraw. If not provided, all withdrawable assets will be withdrawn. (see `getUnstakeQueue`) |

### Returns

`Promise`\<\{ `tx`: [`Transaction`](../interfaces/ethereum_src.Transaction.md)  }\>

Returns a promise that resolves to an Ethereum withdrawal transaction.

___

## buildMintTx

▸ **buildMintTx**(`params`): `Promise`\<\{ `tx`: [`Transaction`](../interfaces/ethereum_src.Transaction.md)  }\>

Builds a mint transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator (wallet) address |
| `params.validatorAddress` | \`0x$\{string}\` | The validator (vault) address to mint shares for |
| `params.amount` | `string` | The amount to mint, specified in `osETH`. E.g. "1" - 1 osETH |
| `params.referrer?` | \`0x$\{string}\` | (Optional) The address of the referrer. This is used to track the origin of transactions, providing insights into which sources or campaigns are driving activity. This can be useful for analytics and optimizing user acquisition strategies. |

### Returns

`Promise`\<\{ `tx`: [`Transaction`](../interfaces/ethereum_src.Transaction.md)  }\>

Returns a promise that resolves to an Ethereum mint transaction.

___

## buildBurnTx

▸ **buildBurnTx**(`params`): `Promise`\<\{ `tx`: [`Transaction`](../interfaces/ethereum_src.Transaction.md)  }\>

Builds a burn transaction.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for building the transaction |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator (wallet) address |
| `params.validatorAddress` | \`0x$\{string}\` | The validator (vault) address to burn shares from |
| `params.amount` | `string` | The amount to burn, specified in `osETH`. E.g. "1" - 1 osETH |

### Returns

`Promise`\<\{ `tx`: [`Transaction`](../interfaces/ethereum_src.Transaction.md)  }\>

Returns a promise that resolves to an Ethereum burn transaction.

___

## getVault

▸ **getVault**(`params`): `Promise`\<\{ `vault`: [`Vault`](../interfaces/ethereum_src.Vault.md)  }\>

Retrieves the staking information for a specified vault, including TVL, APY, description, logo.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.validatorAddress` | \`0x$\{string}\` | The validator (vault) address |

### Returns

`Promise`\<\{ `vault`: [`Vault`](../interfaces/ethereum_src.Vault.md)  }\>

Returns a promise that resolves to the staking information for the specified vault.

___

## getStake

▸ **getStake**(`params`): `Promise`\<\{ `balance`: `string` ; `maxUnstake`: `string`  }\>

Retrieves the staking information for a specified delegator.

The staking information includes the current balance and the maximum amount that can be unstaked.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator (wallet) address |
| `params.validatorAddress` | \`0x$\{string}\` | The validator (vault) address to gather staking information from |

### Returns

`Promise`\<\{ `balance`: `string` ; `maxUnstake`: `string`  }\>

Returns a promise that resolves to the staking information for the delegator.

___

## getRewardsHistory

▸ **getRewardsHistory**(`params`): `Promise`\<\{ `timestamp`: `number` ; `amount`: `string`  }[]\>

Retrieves the rewards history for a specified delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.startTime` | `number` | The start time of the rewards data to retrieve, specified in milliseconds |
| `params.endTime` | `number` | The end time of the rewards data to retrieve, specified in milliseconds |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator (wallet) address |
| `params.validatorAddress` | \`0x$\{string}\` | The validator (vault) address to gather rewards data from |

### Returns

`Promise`\<\{ `timestamp`: `number` ; `amount`: `string`  }[]\>

Returns a promise that resolves to the rewards data for the specified delegator.

___

## getTxHistory

▸ **getTxHistory**(`params`): `Promise`\<\{ `timestamp`: `number` ; `type`: `VaultActionType` = item.type; `amount`: `string` ; `txHash`: `string`  }[]\>

Retrieves the transaction history for a specified delegator.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator (wallet) address |
| `params.validatorAddress` | \`0x$\{string}\` | The validator (vault) address to gather transaction data from |

### Returns

`Promise`\<\{ `timestamp`: `number` ; `type`: `VaultActionType` = item.type; `amount`: `string` ; `txHash`: `string`  }[]\>

Returns a promise that resolves to the transaction history for the specified delegator.

___

## getUnstakeQueue

▸ **getUnstakeQueue**(`params`): `Promise`\<\{ `positionTicket`: `string` ; `timestamp`: `number` ; `isWithdrawable`: `boolean` = item.isWithdrawable; `totalAmount`: `string` ; `withdrawableAmount`: `string`  }[]\>

Retrieves the unstake queue for a specified delegator.

After initiating an unstake request using the `buildUnstakeTx` method, assets are placed into an unstake
queue.

The `getUnstakeQueue` method allows users to query the queue to check the current state of their unstake requests,
including their positionTicket, the amount of assets that are withdrawable, and the total amount.

To prepare the transaction for withdrawing these assets, use the `buildWithdrawTx` method.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator (wallet) address |
| `params.validatorAddress` | \`0x$\{string}\` | The validator (vault) address to gather the unstake queue from |

### Returns

`Promise`\<\{ `positionTicket`: `string` ; `timestamp`: `number` ; `isWithdrawable`: `boolean` = item.isWithdrawable; `totalAmount`: `string` ; `withdrawableAmount`: `string`  }[]\>

Returns a promise that resolves to the unstake queue for the specified delegator.

___

## getMint

▸ **getMint**(`params`): `Promise`\<\{ `balance`: `string` ; `maxMint`: `string`  }\>

Retrieves the mint information for a specified delegator.

The mint information includes the current balance of minted `osETH` and the maximum amount of that can be minted.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.delegatorAddress` | \`0x$\{string}\` | The delegator (wallet) address |
| `params.validatorAddress` | \`0x$\{string}\` | The validator (vault) address to gather mint data from |

### Returns

`Promise`\<\{ `balance`: `string` ; `maxMint`: `string`  }\>

Returns a promise that resolves to the mint information

___

## getMintHealth

▸ **getMintHealth**(`params`): `Promise`\<\{ `health`: ``"healthy"`` \| ``"moderate"`` \| ``"risky"`` \| ``"unhealthy"``  }\>

Retrieves the mint health for a specified stake and mint amount.

Position health tracks the value of osETH minted by stakers relative to the value of their ETH stake in the vault.
Healthy positions have minted osETH that is well-collateralized by staked ETH. As the proportion of minted osETH
increases relative to staked ETH, position health deteriorates.

Factors affecting position health include yield discrepancies (APY) between the vault and osETH, which can result
from:
- Differences in fee structures.
- Variations in attestation performance.
- The ratio of unbounded ETH to the vault's total value locked (TVL).
- Delays in validator activation on the Beacon Chain.
- Losses due to maximal extractable value (MEV) strategies.

Risky positions may enter redemption processes, while positions deemed unhealthy are subject to liquidation.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the request |
| `params.stakeAmount` | `string` | The amount of ETH staked |
| `params.mintAmount` | `string` | The amount of osETH minted |

### Returns

`Promise`\<\{ `health`: ``"healthy"`` \| ``"moderate"`` \| ``"risky"`` \| ``"unhealthy"``  }\>

Returns a promise that resolves to the mint health status('healthy' | 'moderate' | 'risky' | 'unhealthy')

___

## sign

▸ **sign**(`params`): `Promise`\<\{ `signedTx`: \`0x$\{string}\`  }\>

Signs a transaction using the provided signer.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the signing process |
| `params.signer` | `Signer` | A signer instance. |
| `params.signerAddress` | \`0x$\{string}\` | The address of the signer |
| `params.tx` | [`Transaction`](../interfaces/ethereum_src.Transaction.md) | The transaction to sign |
| `params.baseFeeMultiplier?` | `number` | (Optional) The multiplier for fees, which is used to manage fee fluctuations, is applied to the base fee per gas from the latest block to determine the final `maxFeePerGas`. The default value is 1.2. |
| `params.defaultPriorityFee?` | `string` | (Optional) This overrides the the `maxPriorityFeePerGas` estimated by the RPC. |

### Returns

`Promise`\<\{ `signedTx`: \`0x$\{string}\`  }\>

A promise that resolves to an object containing the signed transaction.

___

## broadcast

▸ **broadcast**(`params`): `Promise`\<\{ `txHash`: \`0x$\{string}\`  }\>

Broadcasts a signed transaction to the network.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the broadcast process |
| `params.signedTx` | \`0x$\{string}\` | The signed transaction to broadcast |

### Returns

`Promise`\<\{ `txHash`: \`0x$\{string}\`  }\>

A promise that resolves to the final execution outcome of the broadcast transaction.

___

## getTxStatus

▸ **getTxStatus**(`params`): `Promise`\<`EthereumTxStatus`\>

Retrieves the status of a transaction using the transaction hash.

### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | Parameters for the transaction status request |
| `params.txHash` | \`0x$\{string}\` | The transaction hash to query |

### Returns

`Promise`\<`EthereumTxStatus`\>

A promise that resolves to an object containing the transaction status.
