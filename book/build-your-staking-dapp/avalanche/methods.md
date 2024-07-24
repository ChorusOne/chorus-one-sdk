# Methods

This section provides an overview of the key methods available in the **Chorus One Avalanche Network SDK** for staking and transferring assets.

The Chorus One SDK supports various staking operations and inter-chain asset transfers. Below, we explore each method with practical examples to help you get started.

## buildStakeTx

### Description

The `buildStakeTx` method allows you to create a transaction for staking AVAX tokens with a validator.

Staking tokens involves locking them up to support the network's security and operations, and in return, you earn rewards.

### How to Use

To build a staking transaction, you will need to specify the amount to stake, the number of days for stake to be active, the delegator's address (your wallet), and the validator's address where you want to stake your AVAX tokens.

### Example

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: 'P-avax10uzff2f0u8hstlr5ywt2x4lactmn28c5y9uddv',
  validatorAddress: 'NodeID-LkDLSLrAW1E7Sga1zng17L1AqrtkyWTGg',
  amount: '1', // 1 AVAX
  daysCount: 30 // Stake for 30 days
})
```

In this example, we're staking 1 AVAX with the specified validator for 30 days.

- [Read more in the API Reference](../../docs/classes/avalanche_src.AvalancheStaker.md#buildstaketx)

---

## buildExportTx

### Description

The `buildExportTx` method helps you create a transaction to export assets to another Avalanche subnetwork.

This is the initial step in transferring tokens from one Avalanche subnetwork to another.

After issuing this export transaction, you will need to call `buildImportTx` on the destination subnetwork to complete the transfer.

### How to Use

To build an export transaction, you need to specify the source address (the address on the subnetwork from which the assets are being exported), the destination address (the address on the subnetwork to which the assets are being exported), and the amount to export.

### Example

```javascript
const addressSet = publicKeyToAddress(publicKey, 'avax')

const { tx } = await staker.buildExportTx({
  address: addressSet,
  srcChain: 'C',
  dstChain: 'P',
  amount: '1' // 1 AVAX
})
```

In the above example, we are exporting 1 AVAX from a specified source address on one subnetwork to a destination address on another subnetwork within the Avalanche network.

- [Read more in the API Reference](../../docs/classes/avalanche_src.AvalancheStaker.md#buildexporttx)

---

## buildImportTx

### Description

The `buildImportTx` method allows you to create a transaction to import assets from another Avalanche subnetwork.

This method finalizes the transfer of tokens that were initially exported from a different subnetwork.

### How to Use

To build an import transaction, you need to specify the source address (the address on the subnetwork from which the assets are being imported) and the destination address (the address on the subnetwork to which the assets are being imported).

Typically, these addresses will be different to reflect the different subnetworks involved.

### Example

```javascript
const addressSet = publicKeyToAddress(publicKey, 'avax')

const { tx } = await staker.buildImportTx({
  address: addressSet,
  srcChain: 'C',
  dstChain: 'P'
})
```

In this example, we are importing AVAX from a specified source address on one subnetwork to a destination address on another subnetwork within the Avalanche network.

- [Read more in the API Reference](../../docs/classes/avalanche_src.AvalancheStaker.md#buildimporttx)

---

## getStake

### Description

The `getStake` method retrieves the staking information for a specified delegator, including the amount of AVAX tokens currently staked with a specified validator.

### How to Use

To get staking information, you will need to provide the delegator's address (your wallet).

### Example

```javascript
const { balance } = await staker.getStake({
  delegatorAddress: 'P-avax10uzff2f0u8hstlr5ywt2x4lactmn28c5y9uddv'
})
console.log(`Staked balance: ${balance}`)
```

In this example, we are retrieving the staked balance for a specified delegator and validator.

- [Read more in the API Reference](../../docs/classes/avalanche_src.AvalancheStaker.md#getstake)

---

## Further Reading

For more detailed information and additional methods, please refer to the official API reference:

- [AvalancheStaker API Reference](../../docs/classes/avalanche_src.AvalancheStaker.md)

---

This guide aims to simplify the process of using the Chorus One Avalanche network SDK for staking and transferring assets.

- Please follow the provided examples to integrate these functionalities into your applications.
