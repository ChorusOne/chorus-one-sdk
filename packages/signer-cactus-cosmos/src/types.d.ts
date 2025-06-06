// NOTE: CactusLink cosmos extension doesn't have typescript intefrace exposed.
// This is the best effort "loose" type representation of the CactusLink cosmos extension.
export interface Key {
  name: string
  algo: string
  pubKey: string
  address: string
  bech32Address: string
  ethereumAddress: string
  isNanoLedger: boolean
}

export interface SignAminoResponse {
  signature: {
    signature: string
    pub_key: {
      type: string
      value: string
    }
  }

  signed: any
}

export interface CactusLinkCosmos {
  getKey(chainId: string): Promise<Key>

  signAmino(chainId: string, signer: string, signDoc: any): Promise<SignAminoResponse>
}
