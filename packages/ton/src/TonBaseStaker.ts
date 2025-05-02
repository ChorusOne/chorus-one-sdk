import axios, { AxiosAdapter, AxiosError, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { Signer } from '@chorus-one/signer'
import type {
  TonNetworkConfig,
  TonSigningData,
  AddressDerivationConfig,
  UnsignedTx,
  SignedTx,
  TonTxStatus,
  PoolData
} from './types'
import {
  toNano,
  fromNano,
  WalletContractV4,
  internal,
  MessageRelaxed,
  SendMode,
  Address,
  TransactionDescriptionGeneric,
  beginCell,
  storeMessage,
  Transaction
} from '@ton/ton'
import { mnemonicToSeed, deriveEd25519Path, keyPairFromSeed } from '@ton/crypto'
import { pbkdf2_sha512 } from '@ton/crypto-primitives'
import { TonClient } from './TonClient'
import { createWalletTransferV4, externalMessage, sign } from './tx'

/**
 * This class provides the functionality to stake assets on the Ton network.
 *
 * It also provides the ability to retrieve staking information and rewards for a delegator.
 */
export class TonBaseStaker {
  /** @ignore */
  protected readonly networkConfig: Required<TonNetworkConfig>
  /** @ignore */
  protected readonly addressDerivationConfig: AddressDerivationConfig
  /** @ignore */
  protected client?: TonClient

  /**
   * This **static** method is used to derive an address from a public key.
   *
   * It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.
   *
   * @param params - Parameters for the address derivation
   * @param params.addressDerivationConfig - TON address derivation configuration
   *
   * @returns Returns a single address derived from the public key
   */
  static getAddressDerivationFn =
    (params?: { addressDerivationConfig: AddressDerivationConfig | undefined }) =>
    async (publicKey: Uint8Array, _derivationPath: string): Promise<Array<string>> => {
      const { walletContractVersion, workchain, bounceable, testOnly, urlSafe } =
        params?.addressDerivationConfig ?? defaultAddressDerivationConfig()

      // NOTE: different wallet versions may result in different addresses
      const wallet = getWalletContract(walletContractVersion, workchain, Buffer.from(publicKey))

      return [wallet.address.toString({ bounceable, urlSafe, testOnly })]
    }

  /**
   * This **static** method is used to convert BIP39 mnemonic to seed. In TON
   * network the seed is used as a private key.
   *
   * It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.
   *
   * @param params.addressDerivationConfig - TON address derivation configuration
   *
   * @returns Returns a seed derived from the mnemonic
   */
  static getMnemonicToSeedFn =
    (params?: { addressDerivationConfig: AddressDerivationConfig | undefined }) =>
    async (mnemonic: string, password?: string): Promise<Uint8Array> => {
      const { isBIP39 } = params?.addressDerivationConfig ?? defaultAddressDerivationConfig()

      // the logic is based on the following implementation:
      // https://github.com/xssnick/tonutils-go/blob/619c2aa1f6b992997bf322f8f9bfc4ae036a5181/ton/wallet/seed.go#L82
      if (isBIP39) {
        const pass = password ?? ''
        return await pbkdf2_sha512(mnemonic, 'mnemonic' + pass, 2048, 64)
      }

      const seed = await mnemonicToSeed(mnemonic.split(' '), 'TON default seed', password)
      return seed.slice(0, 32)
    }

  /**
   * This **static** method is used to convert a seed to a keypair. Note that
   * TON network doesn't use BIP44 HD Path for address derivation.
   *
   * It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.
   *
   * @param params.addressDerivationConfig - TON address derivation configuration
   *
   * @returns Returns a public and private keypair derived from the seed
   */
  static getSeedToKeypairFn =
    (params?: { addressDerivationConfig: AddressDerivationConfig | undefined }) =>
    async (seed: Uint8Array, hdPath?: string): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> => {
      const { isBIP39 } = params?.addressDerivationConfig ?? defaultAddressDerivationConfig()

      // the logic is based on the following implementation:
      // https://github.com/xssnick/tonutils-go/blob/619c2aa1f6b992997bf322f8f9bfc4ae036a5181/ton/wallet/seed.go#L82

      let newSeed = Buffer.from(seed)
      if (isBIP39) {
        const path = hdPath
          ? hdPath
              .replace('m/', '')
              .split('/')
              .map((x) => parseInt(x))
          : []
        newSeed = await deriveEd25519Path(newSeed, path)
      }

      const keypair = keyPairFromSeed(newSeed)
      return {
        publicKey: keypair.publicKey,
        privateKey: keypair.secretKey.slice(0, 32)
      }
    }

  /**
   * This creates a new TonStaker instance.
   *
   * @param params - Initialization parameters
   * @param params.rpcUrl - RPC URL (e.g. https://toncenter.com/api/v2/jsonRPC)
   * @param params.allowSeamlessWalletDeployment - (Optional) If enabled, the wallet contract is deployed automatically when needed
   * @param params.allowTransferToInactiveAccount - (Optional) Allow token transfers to inactive accounts
   * @param params.minimumExistentialBalance - (Optional) The amount of TON to keep in the wallet
   * @param params.addressDerivationConfig - (Optional) TON address derivation configuration
   *
   * @returns An instance of TonStaker.
   */
  constructor (params: {
    rpcUrl: string
    allowSeamlessWalletDeployment?: boolean
    allowTransferToInactiveAccount?: boolean
    minimumExistentialBalance?: string
    addressDerivationConfig?: AddressDerivationConfig
  }) {
    const networkConfig = {
      ...params,
      allowSeamlessWalletDeployment: params.allowSeamlessWalletDeployment ?? false,
      allowTransferToInactiveAccount: params.allowTransferToInactiveAccount ?? false,
      minimumExistentialBalance: params.minimumExistentialBalance ?? '5',
      addressDerivationConfig: params.addressDerivationConfig ?? defaultAddressDerivationConfig()
    }

    this.networkConfig = networkConfig

    const cfg = networkConfig.addressDerivationConfig
    this.networkConfig.addressDerivationConfig = cfg
    this.addressDerivationConfig = cfg
  }

  /**
   * Initializes the TonStaker instance and connects to the blockchain.
   *
   * @returns A promise which resolves once the TonStaker instance has been initialized.
   */
  async init (): Promise<void> {
    const rateLimitRetryAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      const maxRetries = 3
      const retryDelay = 1000

      let retries = 0

      const defaultAdapter = axios.getAdapter(axios.defaults.adapter)
      if (!defaultAdapter) {
        throw new Error('Axios default adapter is not available')
      }

      while (retries <= maxRetries) {
        try {
          // Send the request using the default adapter
          return await defaultAdapter({
            ...config,
            headers: AxiosHeaders.from({
              ...(config.headers || {}),
              'Content-Type': 'application/json'
            })
          })
        } catch (err) {
          const error = err as AxiosError

          const status = error.response?.status

          // If rate limit hit (429), wait and retry
          if (status === 429 && retries < maxRetries) {
            retries += 1
            console.log(`Rate limit hit, try ${retries}/${maxRetries}`)

            await new Promise((resolve) => setTimeout(resolve, retryDelay))
          } else {
            throw error
          }
        }
      }

      // Should never reach this point
      throw new Error(`Rate limit exceeded after ${maxRetries} retries.`)
    }

    this.client = new TonClient({
      endpoint: this.networkConfig.rpcUrl,
      httpAdapter: rateLimitRetryAdapter
    })
  }

  /** @ignore */
  async buildTransferTx (params: {
    destinationAddress: string
    amount: string
    validUntil?: number
    memo?: string
  }): Promise<{ tx: UnsignedTx }> {
    const client = this.getClient()
    const { destinationAddress, amount, validUntil, memo } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(destinationAddress)

    // To transfer tokens to inactive account (without wallet contract deployed)
    // one should send transaction with non-bounce mode. Source:
    //   https://docs.ton.org/develop/dapps/asset-processing/#wallet-deployment
    //
    // To minimize the risk of losing tokens, we should check if the destination
    // address has an active wallet contract deployed. If the amount of tokens
    // is small then we allow the unbouncable mode transfer. Otherwise the code
    // bails out.
    //
    // This is based on the recommendation from the TON SDK:
    //   https://docs.ton.org/develop/smart-contracts/guidelines/non-bouncable-messages
    let bounceable = true
    const parsedAddress = Address.parse(destinationAddress)
    const state = await client.getContractState(parsedAddress)
    if (state.state !== 'active') {
      if (toNano(amount) > toNano('5') && !this.networkConfig.allowTransferToInactiveAccount) {
        throw new Error(
          `contract at ${destinationAddress} is not active: ${state.state} and the amount is too large (>5) to send in non-bounceable mode`
        )
      }

      bounceable = false
    }

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      messages: [
        {
          address: destinationAddress,
          bounceable: bounceable,
          amount: toNano(amount),
          payload: memo ?? ''
        }
      ]
    }

    return { tx }
  }

  /**
   * Builds a wallet deployment transaction
   *
   * @param params - Parameters for building the transaction
   * @param params.address - The address to deploy the wallet contract to
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON wallet deployment transaction.
   */
  async buildDeployWalletTx (params: { address: string; validUntil?: number }): Promise<{ tx: UnsignedTx }> {
    const client = this.getClient()
    const { address, validUntil } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(address)

    const isDeployed = await client.isContractDeployed(Address.parse(address))
    if (isDeployed) {
      throw new Error('wallet contract is already deployed')
    }

    // To deploy a wallet contract we need to setup a non-bounceable message
    // with empty payload and non-empty stateInit
    // * bounceable - is set to false at the external message stage
    // * stateInit - is set at the `sign` method
    //
    // reference: https://docs.ton.org/develop/smart-contracts/guidelines/non-bouncable-messages
    const tx = {
      validUntil: defaultValidUntil(validUntil)
    }

    return { tx }
  }

  /** @ignore */
  async getBalance (params: { address: string }): Promise<{ amount: string }> {
    const client = this.getClient()
    const { address } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(address)

    const amount = await client.getBalance(Address.parse(address))
    return { amount: fromNano(amount) }
  }

  /**
   * Signs a transaction using the provided signer.
   *
   * @param params - Parameters for the signing process
   * @param params.signer - Signer instance
   * @param params.signerAddress - The address of the signer
   * @param params.tx - The transaction to sign
   *
   * @returns A promise that resolves to an object containing the signed transaction.
   */
  async sign (params: { signer: Signer; signerAddress: string; tx: UnsignedTx }): Promise<SignedTx> {
    const client = this.getClient()
    const { signer, signerAddress, tx } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(signerAddress)

    const pk = await signer.getPublicKey(signerAddress)
    const wallet = getWalletContract(
      this.addressDerivationConfig.walletContractVersion,
      this.addressDerivationConfig.workchain,
      Buffer.from(pk)
    )

    let internalMsgs: MessageRelaxed[] = []
    const msgs = tx.messages

    if (msgs !== undefined && msgs.length > 0) {
      msgs.map((msg) => {
        if (msg.payload === undefined) {
          throw new Error('missing payload')
        }

        // ensure the address is for the right network
        this.checkIfAddressTestnetFlagMatches(msg.address)

        // ensure the balance is above the minimum existential balance
        this.checkMinimumExistentialBalance(signerAddress, fromNano(msg.amount))

        // TON TEP-0002 defines how the flags within the address should be handled
        // reference: https://github.com/ton-blockchain/TEPs/blob/master/text/0002-address.md#wallets-applications
        //
        // The Chorus TON SDK is not strictly a wallet application, so we follow most (but not all) of the rules.
        // Specifically, we force the bounce flag wherever possible (for safety), but don't enforce user to specify
        // the bounceable source address. This is because a user may use fireblocks signer where the address is in non-bounceable format.
        internalMsgs.push(
          internal({
            value: msg.amount,
            bounce: msg.bounceable,
            to: msg.address,
            body: msg.payload,
            init: msg.stateInit
          })
        )
      })
    } else {
      internalMsgs = []
    }

    const contract = client.open(wallet)
    const seqno: number = await contract.getSeqno()

    // safety check for createWalletTransferV4
    if (this.addressDerivationConfig.walletContractVersion !== 4) {
      throw new Error('unsupported wallet contract version')
    }
    const txArgs = {
      seqno,
      // As explained here: https://docs.ton.org/develop/smart-contracts/messages#message-modes
      // IGNORE_ERRORS ignores only selected errors, such as insufficient funds etc
      //
      // The lack of that flag in case of insufficient funds would result in the internal mesasge being executed
      // "in a loop" until the transaction expires, effectively draining the account (by incurring fees).
      //
      // To confirm this is a 'recommended practice' here are a few references from other wallets:
      // * tonweb - https://github.com/toncenter/tonweb/blob/76dfd0701714c0a316aee503c2962840acaf74ef/src/contract/wallet/WalletContract.js#L184
      // * tonkeeper - https://github.com/tonkeeper/wallet/blob/7452e11f8c6313f5a1f60bbc93e1b6a5e858470e/packages/mobile/src/blockchain/wallet.ts#L401
      //
      // The unfortunate consequence of the transaction error being ignored, the TX status is a success. This can be misleading to end user.
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      walletId: wallet.walletId,
      messages: internalMsgs,
      timeout: tx.validUntil
    }

    const preparedTx = createWalletTransferV4(txArgs)
    const signingData: TonSigningData = {
      tx,
      txArgs,
      txCell: preparedTx
    }

    // sign transaction via signer
    const signedTx = await sign(signerAddress, signer, signingData)

    // decide whether to deploy wallet contract along with the transaction
    const isContractDeployed = await client.isContractDeployed(Address.parse(signerAddress))
    let shouldDeployWallet = false
    if (!isContractDeployed) {
      // if contract is missing and there is no messages, it must be the init transaction
      if (internalMsgs.length === 0) {
        shouldDeployWallet = true
      } else if (this.networkConfig.allowSeamlessWalletDeployment) {
        shouldDeployWallet = true
      } else {
        throw new Error('wallet contract is not deployed and seamless wallet deployment is disabled')
      }
    }

    return {
      tx: signedTx,
      address: signerAddress,
      txHash: signedTx.hash().toString('hex'),
      stateInit: shouldDeployWallet ? wallet.init : undefined
    }
  }

  /**
   * This method is used to broadcast a signed transaction to the TON network.
   *
   * @param params - Parameters for the broadcast
   * @param params.signedTx - The signed transaction to be broadcasted
   *
   * @returns Returns a promise that resolves to the response of the transaction that was broadcast to the network.
   */
  async broadcast (params: { signedTx: SignedTx }): Promise<string> {
    const client = this.getClient()
    const { signedTx } = params

    const external = await externalMessage(client, Address.parse(signedTx.address), signedTx.tx, signedTx.stateInit)

    await client.sendFile(external.toBoc())

    return external.hash().toString('hex')
  }

  /**
   * Retrieves the status of a transaction using the transaction hash.
   *
   * This method is intended to check for transactions made recently (within limit) and not for historical transactions.
   *
   * @param params - Parameters for the transaction status request
   * @param params.address - The account address to query
   * @param params.txHash - The transaction hash to query
   * @param params.limit - (Optional) The maximum number of transactions to fetch
   *
   * @returns A promise that resolves to an object containing the transaction status.
   */
  async getTxStatus (params: { address: string; txHash: string; limit?: number }): Promise<TonTxStatus> {
    const transaction = await this.getTransactionByHash(params)
    return this.matchTransactionStatus(transaction)
  }

  /** @ignore */
  protected matchTransactionStatus (transaction: Transaction | undefined): TonTxStatus {
    if (transaction === undefined) {
      return { status: 'unknown', receipt: null }
    }

    if (transaction.description.type === 'generic') {
      const description = transaction.description as TransactionDescriptionGeneric

      if (description.aborted) {
        return { status: 'failure', receipt: transaction, reason: 'aborted' }
      }

      if (description.computePhase.type === 'vm') {
        const compute = description.computePhase

        if (description.actionPhase && description.actionPhase?.resultCode === 50 && compute.exitCode === 0) {
          return { status: 'failure', receipt: transaction, reason: 'out_of_storage' }
        }

        if (compute.exitCode !== 0 || compute.success === false) {
          return { status: 'failure', receipt: transaction, reason: 'compute_phase' }
        }
      }

      if (description.actionPhase) {
        const action = description.actionPhase

        if (action.success === false || action.valid === false) {
          return { status: 'failure', receipt: transaction, reason: 'action_phase' }
        }
      }

      // the transaction bounced if this is present (so likely it bounced due to error in the contract)
      if (description.bouncePhase) {
        return { status: 'failure', receipt: transaction, reason: 'bounce_phase' }
      }
    }

    // at this point we can assume the transaction was successful
    return { status: 'success', receipt: transaction }
  }

  /** @ignore */
  protected async getTransactionByHash (params: {
    address: string
    txHash: string
    limit?: number
  }): Promise<Transaction | undefined> {
    const client = this.getClient()
    const { address, txHash, limit } = params

    const transactions = await client.getTransactions(Address.parse(address), { limit: limit ?? 10 })
    const transaction = transactions.find((tx) => {
      // Check tx hash
      if (tx.hash().toString('hex') === txHash) return true

      // Check inMessage tx hash(that is the one we get from broadcast method)
      if (tx.inMessage && beginCell().store(storeMessage(tx.inMessage)).endCell().hash().toString('hex') === txHash)
        return true

      return false
    })

    return transaction
  }

  /** @ignore */
  protected getClient (): TonClient {
    if (!this.client) {
      throw new Error('TonStaker not initialized. Did you forget to call init()?')
    }

    return this.client
  }

  /** @ignore */
  protected checkIfAddressTestnetFlagMatches (address: string): void {
    const addr = Address.parseFriendly(address)

    if (addr.isTestOnly !== this.addressDerivationConfig.testOnly) {
      if (addr.isTestOnly) {
        throw new Error(`address ${address} is a testnet address but the configuration is for mainnet`)
      } else {
        throw new Error(`address ${address} is a mainnet address but the configuration is for testnet`)
      }
    }
  }

  /** @ignore */
  protected async checkMinimumExistentialBalance (address: string, amount: string): Promise<void> {
    const balance = await this.getBalance({ address })
    const minBalance = this.networkConfig.minimumExistentialBalance

    if (toNano(balance.amount) - toNano(amount) < toNano(minBalance)) {
      throw new Error(
        `sending ${amount} would result in balance below the minimum existential balance of ${minBalance} for address ${address}`
      )
    }
  }

  // NOTE: this method is used only by Nominator and SingleNominator stakers, not by Pool
  /** @ignore */
  protected async getNominatorContractPoolData (contractAddress: string): Promise<PoolData> {
    const client = this.getClient()
    const response = await client.runMethod(Address.parse(contractAddress), 'get_pool_data', [])

    // reference: https://github.com/ton-blockchain/nominator-pool/blob/main/func/pool.fc#L198
    if (response.stack.remaining !== 17) {
      throw new Error('invalid get_pool_data response, expected 17 fields got ' + response.stack.remaining)
    }

    const skipN = (n: number) => {
      for (let i = 0; i < n; i++) {
        response.stack.skip()
      }
    }

    skipN(1)
    const nominators_count = response.stack.readNumber() // index: 1
    skipN(4)
    const max_nominators_count = response.stack.readNumber() // index: 6
    skipN(1)
    const min_nominator_stake = response.stack.readBigNumber() // index: 8

    return {
      nominators_count,
      max_nominators_count,
      min_nominator_stake
    }
  }
}

function defaultAddressDerivationConfig (): AddressDerivationConfig {
  return {
    walletContractVersion: 4,
    workchain: 0,
    bounceable: false,
    testOnly: false,
    urlSafe: true,
    isBIP39: false
  }
}

// scaffold for future wallet releases
function getWalletContract (version: number, workchain: number, publicKey: Buffer, walletId?: number): WalletContractV4 {
  switch (version) {
    case 4:
      return WalletContractV4.create({ workchain, publicKey, walletId })
    default:
      throw new Error('unsupported wallet contract version')
  }
}

export function defaultValidUntil (validUntil?: number): number {
  return validUntil ?? Math.floor(Date.now() / 1000) + 180 // 3 minutes
}

export function getRandomQueryId () {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
}

export function getDefaultGas () {
  return 100000
}
