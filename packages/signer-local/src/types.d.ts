import { KeyType } from '@chorus-one/signer'

/** @ignore */
export interface LocalSignerConfig {
  // BIP39 mnemonic seed phrase
  mnemonic: string

  // BIP39 address derivation path
  accounts: [{ hdPath: string }]

  // signing key type
  //
  // @default KeyType.SECP256K1
  keyType?: KeyType
}
