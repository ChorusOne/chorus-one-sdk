import { Signer as AbstractSigner } from 'near-api-js'
import type { Signature } from 'near-api-js/lib/utils/key_pair'
import { PublicKey } from 'near-api-js/lib/utils/key_pair'

export class NEARDummySigner extends AbstractSigner {
  constructor () {
    super()
  }

  /**
   * Creates new key and returns public key.
   * @param accountId accountId to retrieve from.
   * @param networkId The targeted network. (ex. default, betanet, etc…)
   */
  async createKey (_accountId: string, _networkId?: string): Promise<PublicKey> {
    throw new Error('create key is not supported')
  }

  /**
   * Returns public key for given account / network.
   * @param accountId accountId to retrieve from.
   * @param networkId The targeted network. (ex. default, betanet, etc…)
   */
  async getPublicKey (_accountId?: string, _networkId?: string): Promise<PublicKey> {
    throw new Error('get public key is not supported')
  }

  /**
   * Signs given message, by first hashing with sha256.
   * @param message message to sign.
   * @param accountId accountId to use for signing.
   * @param networkId The targeted network. (ex. default, betanet, etc…)
   */
  async signMessage (_message: Uint8Array, _accountId?: string, _networkId?: string): Promise<Signature> {
    throw new Error('sign message is not supported')
  }
}
