# SignerData

Represents the data to be signed by a signer.

### Table of contents

#### Properties

* [message](signer_src.SignerData.md#message)
* [data](signer_src.SignerData.md#data)

### Properties

#### message

• `Optional` **message**: `string`

`sha256` serialized transaction data. Use this for raw `secp256k1` or `ed25519` signing.

Use case: raw signer uses native `secp256k1` to sign the message. i.e `FireblocksSigner`

***

#### data

• `Optional` **data**: `any`

Custom data of the transaction for a signer to process and sign specific to the blockchain.

Use case: integration with web wallets (i.e Keplr Wallet) that don't expose raw signing, but instead require blockchain specific objects, such as `SignDoc` for Cosmos networks
