import type { Signature, SignerData } from '@chorus-one/signer'
import { Keplr } from '@keplr-wallet/types'
import { CosmosSigningData } from '@chorus-one/cosmos'

export class KeplrSigner {
  private signer: Keplr
  private chainId: string

  constructor (params: { signer: Keplr; chainId: string }) {
    const { signer, chainId } = params

    this.signer = signer
    this.chainId = chainId
  }

  async init (): Promise<void> {}

  async getPublicKey (address: string): Promise<Uint8Array> {
    const offlineSigner = await this.signer?.getOfflineSignerAuto(this.chainId)
    const accounts = await offlineSigner?.getAccounts()

    if (accounts === undefined || accounts.length === 0) {
      throw new Error('no accounts found')
    }

    const account = accounts.find((account) => account.address.toLowerCase() === address.toLowerCase())

    if (account === undefined) {
      throw new Error('no public key found')
    }

    return account.pubkey
  }

  async sign (
    signerAddress: string,
    signerData: SignerData,
    _options: { note?: string }
  ): Promise<{ sig: Signature; pk: Uint8Array }> {
    if (signerData.data === undefined) {
      throw new Error('missing signer data to sign')
    }

    const { signDoc }: CosmosSigningData = signerData.data

    // if we allow to change the fees, the signature will be invalid as the
    // wallet will change the signDoc
    const signingResponse = await this.signer.signAmino(signDoc.chain_id, signerAddress, signDoc, {
        preferNoSetFee: true,
        preferNoSetMemo: true,
        disableBalanceCheck: false
    })

    const signature = signingResponse.signature.signature
    const rawSig = Uint8Array.from(Buffer.from(signature, 'base64'))

    const sig = {
      fullSig: Buffer.from(rawSig).toString('hex'),
      r: Buffer.from(rawSig.subarray(0, 32)).toString('hex'),
      s: Buffer.from(rawSig.subarray(32, 64)).toString('hex'),
      v: undefined
    }

    return { sig, pk: await this.getPublicKey(signerAddress) }
  }
}
