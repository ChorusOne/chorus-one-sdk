# Signing with a Browser Extension Wallet

The flexible `Signer` abstraction enables the use of vast variety of signers, such as browser extension wallets like [Keplr](https://www.keplr.app/), [Metamask](https://metamask.io/), or [Phantom](https://phantom.app/).\
\
However, unlike the raw signers like `FireblocksSigner` or `LocalSigner`, the wallet extension may require complex data.

To recall, a raw signer will require you to pass only the the hashed message in order to generate a relevant signature to the key type.

Browser-based wallets implement their own API, and we can't ever know what that API is exactly.

However, we can predict the basic data the wallet will need. For example, an unsigned transaction, sender, receiver address, and amount.

- With that data any wallet should be able to sign your transaction regardless the specifics.

All `Staker` classes pass down data to the signer. In this case, this includes a set of "what-we-believe-to-be-required" data so that the signer can craft the request to the wallet extension.

**For example:**

```javascript
export interface CosmosSigningData {
  signDoc: StdSignDoc
}

const signDoc: StdSignDoc = { ... }
const data: CosmosSigningData = { signDoc }
const { sig } = await signer.sign(signerAddress, { message, data }, { note })
```

Here, the `CosmosStaker` will pass to the signer the `CosmosSigningData` with an unsigned network specific object of `StdSignDoc` down to the signer along with the hashed `message`.

- Your signer can then use either one of those, even though only one is necessary.

## Keplr Wallet Browser Extension

[Keplr](https://www.keplr.app/) is a popular browser extension for managing Cosmos-based blockchain accounts.

If you're developing a web dApp and you would like to quickly build & sign a transaction in your application we've got you covered!

```javascript
import { KeplrSigner } from '@chorus-one/signer-keplr'

const signer = new KeplrSigner({
  signer: window.keplr,
  chainId: netoworkConfig.chainId
})

await signer.init()
```

As you can see, the initialization is easy. The only extra thing you need to provide is the handle to the [Keplr wallet extension interface](https://docs.keplr.app/api/). In here, it is `window.keplr`

Once the implementation is done, the signer consumes the `CosmosSigningData` as follows:

```javascript
async sign (
  signerAddress: string,
  signerData: SignerData,
  _options: { note?: string }
): Promise<{ sig: Signature; pk: Uint8Array }> {
  const { signDoc }: CosmosSigningData = signerData.data
  const signingResponse = await this.signer.signAmino(
    signDoc.chain_id,
    signerAddress,
    signDoc
  )
}
```

## How to Support other Browser Extension Wallets?

If the Chorus One SDK does not support the web wallet of your choice, feel free to implement one on your own using the example described in this guide.

Alternatively, feel free to open a Github Issue.
