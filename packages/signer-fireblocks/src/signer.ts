import { PeerType, TransactionOperation, TransactionStatus } from 'fireblocks-sdk'
import type {
  TransactionArguments,
  VaultAccountResponse,
  PublicKeyInfoForVaultAccountArgs,
  PublicKeyResponse,
  TransactionResponse
} from 'fireblocks-sdk'

import { FireblocksSDK } from 'fireblocks-sdk'
import type { Signature, SignerData, AddressDerivationFn } from '@chorus-one/signer'
import type { Logger } from '@chorus-one/utils'
import type { FireblocksSignerConfig } from './types'
import { nopLogger } from '@chorus-one/utils'
import { getAuthProvider } from './authProvider'
import { formatEther } from 'viem'
import type { Hex } from 'viem'
/**
 * The FireblocksSigner in the Chorus One SDK is a specialized implementation of the Signer interface that integrates
 * with the Fireblocks platform.
 *
 * Fireblocks is known for its advanced security features, including multi-party computation (MPC) and secure wallet
 * infrastructure, making it an ideal choice for enterprises requiring robust security and compliance.
 */

interface FireblocksTxStatus {
  status: 'success' | 'failure' | 'pending' | 'unknown'
  reason?: string
  receipt: TransactionResponse | null
}
export class FireblocksSigner {
  private readonly config: FireblocksSignerConfig
  private fireblocksClient?: FireblocksSDK
  private vault?: VaultAccountResponse
  private addressDerivationFn: AddressDerivationFn
  private accounts: Map<string, { hdPath: string; publicKey: Uint8Array }>
  private logger: Logger

  /**
   * Constructs a new FireblocksSigner.
   *
   * @param params - The parameters required to initialize the FireblocksSigner
   * @param params.apiSecretKey - Fireblocks API Secret key
   * @param params.apiKey - Fireblocks API Key
   * @param params.vaultName - The name of the Fireblocks vault where the assets are stored
   * @param params.assetId - The identifier for the asset you intend to manage
   * @param params.addressDerivationFn - A function that derives the address from the public key
   * @param params.timeout - (Optional) The maximum time (in ms) to wait for the Fireblocks API sign request to complete
   * @param params.pollInterval - (Optional) The interval (in ms) at which the signer polls the Fireblocks API to check if the sign request has completed
   * @param params.apiUrl - (Optional) The URL of the Fireblocks API, defaults to `https://api.fireblocks.io`
   * @param params.logger - (Optional) A logger to use for logging messages, i.e `console`
   *
   * @returns A new instance of FireblocksSigner.
   */
  constructor (params: {
    apiSecretKey: string
    apiKey: string
    vaultName: string
    assetId: string
    addressDerivationFn: AddressDerivationFn
    timeout?: number
    pollInterval?: number
    apiUrl?: string
    logger?: Logger
  }) {
    const { addressDerivationFn, ...config } = params

    this.config = { ...config, apiUrl: params.apiUrl ?? 'https://api.fireblocks.io' }
    this.logger = params.logger ?? nopLogger
    this.addressDerivationFn = addressDerivationFn
    this.accounts = new Map()
  }

  /**
   * Initializes the signer, performing any necessary setup or configuration.
   * @returns A promise that resolves once the initialization is complete.
   */
  async init (): Promise<void> {
    const backend = await newFireblocksSignerBackend(this.config)
    const vaults = await backend
      .getVaultAccountsWithPageInfo({
        namePrefix: this.config.vaultName
      })
      .then((res) => {
        return res.accounts.filter((account) => account.name === this.config.vaultName)
      })

    if (vaults.length !== 1) {
      throw new Error('fireblocks vault name not found, expected exactly 1 result, got: ' + vaults.length)
    }

    this.fireblocksClient = backend
    this.vault = vaults[0]

    // BIP44 format: m / purpose' / coin_type' / account' / change / address_index
    const response = await this.fireblocksClient.getMaxBip44IndexUsed(this.vault.id, this.config.assetId)
    const maxChangeAddress = response.maxBip44ChangeAddressIndexUsed ?? 0
    const maxAddressIndex = response.maxBip44AddressIndexUsed ?? 0

    const promises: Array<Promise<PublicKeyResponse>> = []
    for (let change = 0; change <= maxChangeAddress; change++) {
      for (let addressIndex = 0; addressIndex <= maxAddressIndex; addressIndex++) {
        promises.push(this.getPublicKeyInfoForVaultAccount(change, addressIndex))
      }
    }

    const publicKeysResponse = await Promise.all(promises)
    publicKeysResponse.forEach(async (response) => {
      const pk = Uint8Array.from(Buffer.from(response.publicKey, 'hex'))
      const pth = response.derivationPath

      // fireblocks hardens the first 3 indexes
      const derivationPath = `m/${pth[0]}'/${pth[1]}'/${pth[2]}'/${pth[3]}/${pth[4]}`
      const derivedAddresses = await this.addressDerivationFn(pk, derivationPath)

      derivedAddresses.forEach((address) => {
        this.accounts.set(address.toLowerCase(), {
          hdPath: derivationPath,
          publicKey: pk
        })
      })
    })
  }

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
  async sign (
    signerAddress: string,
    signerData: SignerData,
    options?: { note?: string }
  ): Promise<{ sig: Signature; pk: Uint8Array }> {
    if (!this.vault) {
      throw new Error('FireblocksSigner instance is not initialized')
    }
    const args: TransactionArguments = {
      assetId: this.config.assetId,
      source: {
        type: PeerType.VAULT_ACCOUNT,
        id: this.vault.id,
        address: signerAddress
      },
      note: options?.note ?? '',
      operation: TransactionOperation.RAW,
      extraParameters: {
        rawMessageData: {
          messages: [
            {
              content: signerData.message
            }
          ]
        }
      }
    }

    // https://developers.fireblocks.com/docs/raw-message-signing
    this.logger.info('wait for the TX signature from the remote signer')
    if (!this.fireblocksClient) {
      throw new Error('FireblocksSigner instance is not initialized')
    }
    const { id } = await this.fireblocksClient.createTransaction(args)

    let txInfo = await this.fireblocksClient.getTransactionById(id)
    let status = txInfo.status

    const states = [TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.BLOCKED]

    const pollInterval = this.config.pollInterval ?? 1000
    const startTime = Date.now()

    while (!states.some((x) => x === status)) {
      try {
        this.logger.info(`* signer request ID: ${id} with status: ${status}`)
        txInfo = await this.fireblocksClient.getTransactionById(id)

        status = txInfo.status
      } catch (err) {
        this.logger.error('probing remote signer failed', err)
      }

      // trigger timeout if the signer takes too long
      if (this.config.timeout !== undefined && Date.now() - startTime > this.config.timeout) {
        throw new Error('timeout waiting for the signer to complete')
      }

      await new Promise((resolve, _) => setTimeout(resolve, pollInterval))
    }

    const details = txInfo.subStatus === '' ? 'none' : txInfo.subStatus
    this.logger.info(`* signer request ID finished with status ${status}; details: ${details}`)

    if (txInfo.signedMessages === undefined || txInfo.signedMessages.length !== 1) {
      throw new Error(
        ('expected exactly 1 signed message, got: ' +
          (txInfo.signedMessages === undefined ? 0 : txInfo.signedMessages.length)) as string
      )
    }

    return {
      sig: txInfo.signedMessages[0].signature,
      pk: Uint8Array.from(Buffer.from(txInfo.signedMessages[0].publicKey, 'hex'))
    }
  }

  /**
   * Signs an Ethereum contract call transaction using Fireblocks.
   *
   * @param params - Parameters for the contract call
   * @param params.to - The destination contract address
   * @param params.value - The amount to send in wei (optional)
   * @param params.data - The contract call data
   * @param params.gasLimit - Gas limit for the transaction (optional)
   * @param params.maxFeePerGas - Maximum fee per gas in wei (optional)
   * @param params.maxPriorityFeePerGas - Maximum priority fee per gas in wei (optional)
   * @param params.note - Optional note for the transaction
   *
   * @returns A promise that resolves to the transaction response from Fireblocks.
   */
  async contractCall (params: {
    to: Hex
    value?: bigint
    data: Hex
    gas: bigint
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
    gasPrice: bigint
    note?: string
  }): Promise<FireblocksTxStatus> {
    const { to, value, data, gas, maxFeePerGas, maxPriorityFeePerGas, gasPrice, note } = params
    if (!this.vault) {
      throw new Error('FireblocksSigner instance is not initialized')
    }

    if (!this.fireblocksClient) {
      throw new Error('FireblocksSigner instance is not initialized')
    }

    const amount = value ? formatEther(value) : '0'

    const args: TransactionArguments = {
      assetId: this.config.assetId,
      source: {
        type: PeerType.VAULT_ACCOUNT,
        id: this.vault.id
      },
      destination: {
        type: PeerType.ONE_TIME_ADDRESS,
        oneTimeAddress: {
          address: to
        }
      },
      amount: amount,
      note,
      operation: TransactionOperation.CONTRACT_CALL,
      extraParameters: {
        contractCallData: data
      },
      gasLimit: gas?.toString(),
      maxFee: maxFeePerGas?.toString(),
      priorityFee: maxPriorityFeePerGas?.toString(),
      gasPrice: gasPrice?.toString()
    }

    this.logger.info('Creating contract call transaction in Fireblocks')
    const { id } = await this.fireblocksClient.createTransaction(args)

    // Wait for transaction completion
    let txInfo = await this.fireblocksClient.getTransactionById(id)
    let status = txInfo.status

    const completedStates = [TransactionStatus.COMPLETED]
    const failedStates = [
      TransactionStatus.FAILED,
      TransactionStatus.BLOCKED,
      TransactionStatus.CANCELLED,
      TransactionStatus.REJECTED
    ]

    const pollInterval = this.config.pollInterval ?? 1000
    const startTime = Date.now()

    while (!completedStates.includes(status) && !failedStates.includes(status)) {
      try {
        this.logger.info(`* Contract call transaction ID: ${id} with status: ${status}`)
        txInfo = await this.fireblocksClient.getTransactionById(id)
        status = txInfo.status
      } catch (err) {
        this.logger.error('Error checking transaction status', err)
      }

      // Handle failed states
      if (failedStates.includes(status)) {
        const errorMessages: Record<string, string> = {
          BLOCKED: 'The transaction has been blocked by the TAP security policy.',
          FAILED: 'The transaction has failed.',
          CANCELLED: 'The transaction has been cancelled.',
          REJECTED: 'The transaction has been rejected by the TAP security policy.'
        }

        return {
          status: 'failure',
          reason: errorMessages[status],
          receipt: txInfo
        }
      }

      // Trigger timeout if the transaction takes too long
      if (this.config.timeout !== undefined && Date.now() - startTime > this.config.timeout) {
        return {
          status: 'failure',
          reason: 'Timeout waiting for the contract call transaction to complete',
          receipt: txInfo
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    const details = txInfo.subStatus === '' ? 'none' : txInfo.subStatus
    this.logger.info(`* Contract call transaction completed with status ${status}; details: ${details}`)

    return {
      status: 'success',
      receipt: txInfo
    }
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

  private async getPublicKeyInfoForVaultAccount (change: number, addressIndex: number): Promise<PublicKeyResponse> {
    if (!this.fireblocksClient || !this.vault) {
      throw new Error('FireblocksSigner instance is not initialized')
    }
    const pubKeyArgs: PublicKeyInfoForVaultAccountArgs = {
      assetId: this.config.assetId,
      vaultAccountId: Number.parseInt(this.vault.id),
      change,
      addressIndex
    }

    return await this.fireblocksClient.getPublicKeyInfoForVaultAccount(pubKeyArgs)
  }
}

export async function newFireblocksSignerBackend (config: FireblocksSignerConfig): Promise<FireblocksSDK> {
  const { apiSecretKey, apiKey, apiUrl } = config

  const authProvider = getAuthProvider(apiSecretKey, apiKey)
  return new FireblocksSDK(apiSecretKey.trim(), apiKey.trim(), apiUrl, authProvider)
}
