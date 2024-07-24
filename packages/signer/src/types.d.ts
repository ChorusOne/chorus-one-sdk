/**
 * Represents a raw digital signature.
 */
export interface Signature {
  /**
   * A string representing the complete signature, often a concatenation of the `r` and `s` values.
   */
  fullSig: string

  /**
   * A hexadecimal string representing the first part of the ECDSA signature.
   */
  r?: string

  /**
   * A hexadecimal string representing the second part of the ECDSA signature.
   */
  s?: string

  /**
   * An integer representing the recovery id, which is used in some blockchains to recover the public key from the signature.
   */
  v?: number
}

/**
 * Defines the interface for a signer that can sign data, retrieve its public key.
 */
export interface Signer {
  /**
   * Initializes the signer, performing any necessary setup or configuration.
   * @returns A promise that resolves once the initialization is complete.
   */
  init: () => Promise<void>

  /**
   * Signs the provided data using the private key associated with the signer's address.
   *
   * @param signerAddress - The address of the signer
   * @param signerData - The data to be signed, which can be a raw message or custom data
   * @param options - Additional options
   * @param options.note - An optional note to include with the transaction
   *
   * @returns A promise that resolves to an object containing the signature and public key.
   */
  sign: (
    signerAddress: string,
    signerData: SignerData,
    options: { note?: string }
  ) => Promise<{ sig: Signature; pk: Uint8Array }>

  /**
   * Retrieves the public key associated with the signer's address.
   *
   * @param address - The address of the signer
   *
   * @returns A promise that resolves to a Uint8Array representing the public key.
   */
  getPublicKey: (address: string) => Promise<Uint8Array>
}

/**
 * Represents the data to be signed by a signer.
 */
export interface SignerData {
  /**
   * `sha256` serialized transaction data. Use this for raw `secp256k1` or `ed25519` signing.
   *
   * Use case: raw signer uses native `secp256k1` to sign the message. i.e `FireblocksSigner`
   */
  message?: string

  /**
   * Custom data of the transaction for a signer to process and sign specific to the blockchain.
   *
   * Use case: integration with web wallets (i.e Keplr Wallet) that don't expose raw signing,
   * but instead require blockchain specific objects, such as `SignDoc` for Cosmos networks
   */
  data?: any
}

/**
 * @ignore
 * Defines a function type for deriving addresses from a public key and HD path.
 *
 * @param publicKey - The public key to derive addresses from
 * @param hdPath - The HD path used for derivation
 *
 * @returns An array of derived addresses.
 */
export type AddressDerivationFn = (publicKey: Uint8Array, hdPath: string) => Promise<Array<string>>

/**
 * @ignore
 * Defines a function type for converting a mnemonic seed phrase to a seed
 *
 * @param mnemonic - The BIP39 compliant mnemonic seed phrase
 * @param password - (optional) The password used to generate the mnemonic seed phrase
 *
 * @returns The seeed
 */
export type MnemonicToSeedFn = (mnemonic: string, password?: string) => Promise<Uint8Array>

/**
 * @ignore
 * Defines a function type for converting a seed to a keypair
 *
 * @param seed - Seed phrase used to generate the keypair
 * @param hdPath - (optional) The BIP44 HD path used for derivation
 *
 * @returns A keypair containing the public and private keys
 */
export type SeedToKeypairFn = (
  seed: Uint8Array,
  hdPath?: string
) => Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }>
