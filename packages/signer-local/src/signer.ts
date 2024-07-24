import type { LocalSignerConfig } from './types'
import type { Signature, SignerData, AddressDerivationFn, MnemonicToSeedFn, SeedToKeypairFn } from '@chorus-one/signer'
import { KeyType } from '@chorus-one/signer'
import type { Logger } from '@chorus-one/utils'
import { nopLogger } from '@chorus-one/utils'
import { mnemonicToSeed } from 'bip39'
import { deriveKey as deriveEd25519, sign as signEd25519 } from './ed25519'
import { deriveKey as deriveSecp256k1, sign as signSecp256k1 } from './secp256k1'

/**
 * The LocalSigner in the Chorus One SDK is a specialized implementation of the Signer interface that utilizes a `BIP39`
 * mnemonic for signing operations.
 *
 * This signer is ideal for local environments where you need a straightforward and
 * secure method to generate and manage cryptographic keys from mnemonic phrases.
 */
export class LocalSigner {
  private readonly config: LocalSignerConfig
  private accounts: Map<string, { hdPath: string; privateKey: Uint8Array; publicKey: Uint8Array }>
  private addressDerivationFn: AddressDerivationFn
  private mnemonicToSeedFn: MnemonicToSeedFn
  private seedToKeypairFn?: SeedToKeypairFn
  private logger: Logger

  /**
   * Constructs a new LocalSigner.
   *
   * @param params - The parameters required to initialize the LocalSigner
   * @param params.mnemonic - A string containing your `BIP39` mnemonic phrase
   * @param params.keyType - An enum specifying the signing key type (e.g. SECP256K1, ED25519)
   * @param params.accounts - An array of account objects, each containing an HD path
   * @param params.addressDerivationFn - A function that derives the address from the public key
   * @param params.logger - (Optional) A logger to use for logging messages, i.e `console`
   *
   * @returns A new instance of LocalSigner.
   */
  constructor (params: {
    mnemonic: string
    accounts: [{ hdPath: string }]
    keyType: KeyType
    addressDerivationFn: AddressDerivationFn
    mnemonicToSeedFn?: MnemonicToSeedFn
    seedToKeypairFn?: SeedToKeypairFn
    logger?: Logger
  }) {
    const { addressDerivationFn, ...config } = params

    this.config = config
    this.accounts = new Map()
    this.logger = params.logger ?? nopLogger
    this.addressDerivationFn = addressDerivationFn
    this.mnemonicToSeedFn = params.mnemonicToSeedFn ?? mnemonicToSeed
    this.seedToKeypairFn = params.seedToKeypairFn
  }

  /**
   * Initializes the signer, performing any necessary setup or configuration.
   * @returns A promise that resolves once the initialization is complete.
   */
  async init (): Promise<void> {
    const seed = await this.mnemonicToSeedFn(this.config.mnemonic)

    this.config.accounts.map(async (account) => {
      let key: { publicKey: Uint8Array; privateKey: Uint8Array }

      switch (this.config.keyType) {
        case undefined:
        case KeyType.SECP256K1: {
          const fn = this.seedToKeypairFn ?? deriveSecp256k1
          key = await fn(seed, account.hdPath)
          break
        }
        case KeyType.ED25519: {
          const fn = this.seedToKeypairFn ?? deriveEd25519
          key = await fn(seed, account.hdPath)
          break
        }
        default:
          throw new Error('unsupported key type')
      }

      const publicKey = key.publicKey
      const privateKey = key.privateKey

      const derivedAddresses = await this.addressDerivationFn(key.publicKey, account.hdPath)
      derivedAddresses.forEach((address) => {
        this.accounts.set(address.toLowerCase(), {
          hdPath: account.hdPath,
          privateKey,
          publicKey
        })
      })
    })
  }

  /**
   * Signs the provided data using the private key associated with the signer's address.
   *
   * @param signerAddress - The address of the signer
   * @param signerData - The data to be signed, which can be a raw message or custom data
   *
   * @returns A promise that resolves to an object containing the signature and public key.
   */
  async sign (signerAddress: string, signerData: SignerData): Promise<{ sig: Signature; pk: Uint8Array }> {
    this.logger.info(`signing data from address: ${signerAddress}`)

    if (signerData.message === undefined) {
      throw new Error('missing message to sign')
    }

    const content = signerData.message
    let sig: Signature | undefined

    switch (this.config.keyType) {
      case undefined:
      case KeyType.SECP256K1:
        sig = await signSecp256k1(content, this.getPrivateKey(signerAddress))
        break
      case KeyType.ED25519:
        sig = await signEd25519(content, this.getPrivateKey(signerAddress))
        break
      default:
        throw new Error('unsupported key type')
    }

    return { sig, pk: await this.getPublicKey(signerAddress) }
  }

  /**
   * Retrieves the public key associated with the signer's address.
   *
   * @param address - The address of the signer
   *
   * @returns A promise that resolves to a Uint8Array representing the public key.
   */
  async getPublicKey (address: string): Promise<Uint8Array> {
    const account = this.accounts.get(address.toLowerCase())
    if (account === undefined) {
      throw new Error(`no public key found for address: ${address}`)
    }

    return account.publicKey
  }

  private getPrivateKey (address: string): Uint8Array {
    const account = this.accounts.get(address.toLowerCase())
    if (account === undefined) {
      throw new Error(`no private key found for address: ${address}`)
    }

    return account.privateKey
  }
}
