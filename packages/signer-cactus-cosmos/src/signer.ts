import type { Signature, SignerData } from '@chorus-one/signer'
import { CactusLinkCosmos, Key } from './types'
import { CosmosSigningData } from '@chorus-one/cosmos'

export class CactusCosmosSigner {
  private signer: CactusLinkCosmos
  private chainId: string
  private walletKey: Key | undefined

  constructor (params: { signer: CactusLinkCosmos; chainId: string }) {
    const { signer, chainId } = params

    this.signer = signer
    this.chainId = chainId
    this.walletKey = undefined
  }

  async init (): Promise<void> {
    this.walletKey = await this.signer.getKey(this.chainId)
  }

  async getPublicKey (address: string): Promise<Uint8Array> {
    if (this.walletKey === undefined) {
      throw new Error('the signer has not been initialized')
    }

    if (this.walletKey?.bech32Address !== address) {
      throw new Error('address does not match signer address')
    }

    return Uint8Array.from(Buffer.from(this.walletKey.pubKey, 'hex'))
  }

  async getAddress (): Promise<string> {
    if (this.walletKey === undefined) {
      throw new Error('the signer has not been initialized')
    }

    return this.walletKey?.bech32Address
  }

  async sign (
    signerAddress: string,
    signerData: SignerData,
    _options: { note?: string }
  ): Promise<{ sig: Signature; pk: Uint8Array }> {
    if (this.walletKey === undefined) {
      throw new Error('the signer has not been initialized')
    }

    const { signDoc }: CosmosSigningData = signerData.data

    const signingResponse = await this.signer.signAmino(signDoc.chain_id, signerAddress, signDoc)

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
