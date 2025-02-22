import { nopLogger } from '@chorus-one/utils'
import type { Logger } from '@chorus-one/utils'
import type { LedgerTonSignerConfig } from './types'
import type { Signature, SignerData } from '@chorus-one/signer'
import { TonTransport as Ton, TonPayloadFormat } from '@ton-community/ton-ledger'
import Transport from '@ledgerhq/hw-transport'
import { TonSigningData } from '@chorus-one/ton'
import { Address, Cell } from '@ton/ton'

/**
 * The LedgerTonSigner in the Chorus One SDK is a specialized implementation of the Signer interface that
 * utilizes a Ledger Ton App
 *
 * Ledger is known for its advanced security features, including secure hardware wallets and robust key management,
 * making it an ideal choice for retail and enterprise customers
 */
export class LedgerTonSigner {
  private readonly config: LedgerTonSignerConfig
  private readonly transport: Transport
  private accounts: Map<string, { hdPath: string; publicKey: Uint8Array }>
  private app?: Ton
  private logger: Logger

  /**
   * Constructs a new LedgerTonSigner.
   *
   * @param params - The parameters required to initialize the LedgerTonSigner
   * @param params.transport - The Ledger HW transport object to use for communication with the Ledger device
   * @param params.accounts - An array of account objects, each containing an HD path
   * @param params.bounceable - Address derivation setting to enable bounceable addresses
   * @param params.logger - (Optional) A logger to use for logging messages, i.e `console`
   *
   * @returns A new instance of LedgerTonSigner.
   */
  constructor (params: { transport: Transport; accounts: [{ hdPath: string }]; bounceable: boolean; logger?: Logger }) {
    const { transport, ...config } = params

    this.transport = transport
    this.config = config
    this.logger = params.logger ?? nopLogger
    this.accounts = new Map()
  }

  /**
   * Initializes the signer, performing any necessary setup or configuration.
   * @returns A promise that resolves once the initialization is complete.
   */
  async init (): Promise<void> {
    const app = new Ton(this.transport)
    this.app = app

    this.config.accounts.forEach(async (account: { hdPath: string }) => {
      const hdPath = account.hdPath
        .replace('m/', '')
        .split('/')
        .map((i: string) => Number(i.replace("'", '')))

      // TON Ledger app requires 6 elements in the HD path
      if (hdPath.length < 6) {
        throw new Error('Invalid path, expected at least 5 elements')
      }

      const network = hdPath[2]
      const chain = hdPath[3]
      const testOnly = network === 1

      const response = await app.getAddress(hdPath, {
        bounceable: this.config.bounceable,
        chain,
        testOnly
      })

      this.accounts.set(response.address.toLowerCase(), {
        hdPath: account.hdPath,
        publicKey: response.publicKey
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
    if (this.app === undefined) {
      throw new Error('LedgerTonSigner not initialized. Did you forget to call init()?')
    }
    this.logger.info(`signing data from address: ${signerAddress} with Ledger Ton App`)

    if (signerData.data === undefined) {
      throw new Error('missing message to sign')
    }

    const data: TonSigningData = signerData.data
    const account = this.getAccount(signerAddress)
    const path = account.hdPath
      .replace('m/', '')
      .split('/')
      .map((i: string) => Number(i.replace("'", '')))

    if (data.tx.messages !== undefined && data.tx.messages.length > 1) {
      throw new Error(
        'Ledger App can only sign one message per transaction. The requested TX has ' +
          data.tx.messages.length +
          ' messages'
      )
    }

    const msg = data.tx.messages !== undefined ? data.tx.messages[0] : undefined
    const timeout = data.txArgs.timeout || data.tx.validUntil || Math.floor(Date.now() / 1000) + 180 // 3 minutes

    let payload: TonPayloadFormat | undefined = undefined
    if (msg !== undefined) {
      if (msg.payload !== undefined && !(msg.payload instanceof Cell)) {
        throw new Error('Ledger App can only sign Cell payloads')
      }
      payload = {
        type: 'unsafe',
        message: msg.payload === undefined ? Cell.EMPTY : (msg.payload as Cell)
      }
    }

    const common = {
      sendMode: data.txArgs.sendMode,
      seqno: data.txArgs.seqno,
      timeout,
      payload
    }

    const args =
      msg !== undefined
        ? {
            to: Address.parse(msg.address),
            bounce: msg.bounceable,
            amount: msg.amount,
            stateInit: msg.stateInit,
            ...common
          }
        : {
            // A transaction without message is still a valid TX (e.g. for deploying wallet contract) however,
            // the Ledger App requires one message to be present in the transaction,
            // therefore we create a dummy message with zero amount and no stateInit
            // that sends 0 tokens to self
            to: Address.parse(signerAddress),
            bounce: false,
            amount: BigInt(0),
            stateInit: undefined,
            ...common
          }

    const signedTx: Cell = await this.app.signTransaction(path, args)
    const sig = {
      // sneaking signed transaction into sig field
      fullSig: signedTx.toBoc().toString('hex'),
      r: '',
      s: '',
      v: 0
    }

    return { sig, pk: account.publicKey }
  }

  /**
   * Retrieves the public key associated with the signer's address.
   *
   * @param address - The address of the signer
   *
   * @returns A promise that resolves to a Uint8Array representing the public key.
   */
  async getPublicKey (address: string): Promise<Uint8Array> {
    return this.getAccount(address).publicKey
  }

  private getAccount (address: string): { hdPath: string; publicKey: Uint8Array } {
    const account = this.accounts.get(address.toLowerCase())
    if (account === undefined) {
      throw new Error(`no account found for address: ${address}`)
    }

    return account
  }
}
