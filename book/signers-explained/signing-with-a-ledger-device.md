# Signing with a Ledger Device

[Ledger Hardware Wallet](https://www.ledger.com/) is one of the most popular hardware wallet solutions on the market. It enables you to sign transactions on vast variety of blockchain networks through what the Ledger ecosystem calls`apps`.

The Ledger apps are installed on the device through the [Ledger Live](https://www.ledger.com/ledger-live) management software. The user than interacts with them through a variety of software wallet interfaces, such as the web-based browser extensions [Metamask](https://metamask.io/), [Keplr](https://www.keplr.app/) or [Phantom](https://phantom.app/) wallet.

To help illustrate how this process works, let's visualize the signing process on Ledger when using MetaMask as an example.

It would look like this:

```
javascript sign request -> metamask -> ledger app -> ledger device
```

## Signing with a Ledger App

If you're developing a node.js application that doesn't run in a browser environment, you might want to interact with a Ledger device but not be able to use a browser extension as illustrated above.

What to do then?

Don't worry, we got you covered. With the Chorus One SDK you can skip the browser extension entirely and sign your transaction directly as illustrated below:

```
node.js sign request -> ledger app -> ledger device
```

To do this, you will need to implement a new `Signer` that utilizes the desired Ledger app.

You can find all the supported Ledger apps here:

> [https://github.com/LedgerHQ](https://github.com/LedgerHQ/app-cosmos)

## Cosmos Ledger Signer

With the initial Chorus One SDK we released a `signer-ledger-cosmos` reference signer for Cosmos SDK based networks.

With that you can sign transactions for networks such as Cosmos Hub, Celestia, Osmosis and others using your Ledger device.

Here is an example of how to set up and and use the signer:

```javascript
import { LedgerCosmosSigner } from '@chorus-one/signer-ledger-cosmos'

const signer = new LedgerCosmosSigner({
  accounts: [{ hdPath: "m/44'/118'/0'/0/0" }],
  bechPrefix: networkConfig.bechPrefix
})
await signer.init()
```

Behind the scenes, the signer utilizes the `@ledgerhq/hw-app-cosmos` library to interact with the Ledger device.

For instance:

```javascript
import Cosmos from '@ledgerhq/hw-app-cosmos'

const app = new Cosmos(transport)
const { signature, return_code } = await app.sign(account.hdPath, signerData.message)
```

As you can see the Ledger app consumes the same data (hashed message) as the Fireblocks or Mnemonic signer.

- The returned signature is then attached to the unsigned transaction and broadcast to the network.

## How to Support other Ledger Apps?

If you wish us to support another network with Ledger, you can implement the signer on your own and send us a pull request.

As you can see from the reference Cosmos app example, it's not that complicated!

Alternatively, you can open an issue on the Github Repository.
