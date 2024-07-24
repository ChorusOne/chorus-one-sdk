import { transactions, Connection, providers, DEFAULT_FUNCTION_CALL_GAS, utils, Account } from 'near-api-js'
import type { FinalExecutionOutcome } from '@near-js/types'
import { FinalExecutionStatusBasic } from '@near-js/types'
import { PublicKey } from 'near-api-js/lib/utils/key_pair'
import type { Signer } from '@chorus-one/signer'
import type { NearNetworkConfig, NearSigningData, NearTxStatus } from './types'
import { macroToDenomAmount, denomToMacroAmount } from './tx'
import { SafeJSONStringify } from '@chorus-one/utils'
import { sha256 } from '@noble/hashes/sha256'
import { NEARDummySigner } from './signer'
import { fetchAccessKey } from './utils'
import BigNumber from 'bignumber.js'

/**
 * This class provides the functionality to stake, unstake, and withdraw for NEAR-based blockchains.
 *
 * It also provides the ability to retrieve staking information for an account.
 */
export class NearStaker {
  private readonly networkConfig: NearNetworkConfig
  private connection?: Connection
  private provider?: providers.JsonRpcProvider

  /**
   * This **static** method is used to derive an address from a public key.
   *
   * It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.
   *
   * @returns Returns an array containing the derived address.
   */
  static getAddressDerivationFn =
    () =>
    async (publicKey: Uint8Array, _derivationPath: string): Promise<Array<string>> => {
      return [Buffer.from(publicKey).toString('hex')]
    }

  /**
   * Creates a NearStaker instance.
   *
   * @param params - Initialization configuration
   * @param params.networkId - The network ID of the NEAR network (e.g., `mainnet`, `testnet`)
   * @param params.rpcUrl - The URL of the NEAR network RPC endpoint
   * @param params.denomMultiplier - Multiplier to convert the base coin unit to its smallest subunit (e.g., `10^24` for 1 NEAR = 1000000000000000000000000 yoctoNear)
   * @param params.resolveAddress - Converts human-readable NEAR account ID (e.g. `alice.near`) to public key. Enable this option if signer requires the public key but you only expect names from NEAR registry
   * @param params.gas - Amount of gas to be sent with the function calls (e.g "30000000000000" yoctoNear)
   *
   * @returns  An instance of NearStaker.
   */
  constructor (params: {
    networkId: string
    rpcUrl: string
    denomMultiplier?: string
    resolveAddress?: boolean
    gas?: string
  }) {
    const { ...networkConfig } = params
    this.networkConfig = networkConfig

    if (this.networkConfig.resolveAddress === undefined) {
      this.networkConfig.resolveAddress = true
    }
  }

  /**
   * Initializes the NearStaker instance and connects to the Near network.
   *
   * @returns A promise which resolves once the NearStaker instance has been initialized.
   */
  async init (): Promise<void> {
    const nearDummySigner = new NEARDummySigner()
    const provider = new providers.JsonRpcProvider({ url: this.networkConfig.rpcUrl })
    const connection = new Connection(this.networkConfig.networkId, provider, nearDummySigner, '')

    this.provider = provider
    this.connection = connection
  }

  /**
   * Builds a staking transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address to stake from
   * @param params.validatorAddress - The validator address to stake with
   * @param params.amount - The amount to stake, specified in `NEAR`
   *
   * @returns Returns a promise that resolves to a NEAR staking transaction.
   */
  async buildStakeTx (params: {
    delegatorAddress: string
    validatorAddress: string
    amount: string
  }): Promise<{ tx: transactions.Transaction }> {
    const { delegatorAddress, validatorAddress, amount } = params
    const action = transactions.functionCall(
      'deposit_and_stake',
      Buffer.from(JSON.stringify({})),
      this.getGas(),
      BigInt(macroToDenomAmount(amount, this.networkConfig.denomMultiplier))
    )

    const tx = await this.buildUnsignedTransaction(delegatorAddress, validatorAddress, action)

    return { tx }
  }
  /**
   * Builds an unstaking transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address that is unstaking
   * @param params.validatorAddress - The validator address to unstake from
   * @param params.amount - The amount to unstake, specified in `NEAR`
   *
   * @returns Returns a promise that resolves to a NEAR unstaking transaction.
   */
  async buildUnstakeTx (params: {
    delegatorAddress: string
    validatorAddress: string
    amount: string
  }): Promise<{ tx: transactions.Transaction }> {
    const { delegatorAddress, validatorAddress, amount } = params
    const amnt = macroToDenomAmount(amount, this.networkConfig.denomMultiplier)
    let method = 'unstake'
    let args: any = { amount: amnt }

    if (BigInt(amnt) === BigInt(0)) {
      method = 'unstake_all'
      args = {}
    }

    const action = transactions.functionCall(
      method,
      Buffer.from(JSON.stringify(args)),
      this.getGas(),
      BigInt(0) // method doesn't accept any deposit
    )

    const tx = await this.buildUnsignedTransaction(delegatorAddress, validatorAddress, action)

    return { tx }
  }

  /**
   * Builds a withdrawal transaction.
   *
   * **The amount to be withdrawn must be previously unstaked.**
   * - If the amount is not specified, all the available unstaked amount will be withdrawn.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator address to withdraw from
   * @param params.amount - The amount to withdraw, specified in `NEAR`
   *
   * @returns Returns a promise that resolves to a NEAR withdrawal transaction.
   */
  async buildWithdrawTx (params: {
    delegatorAddress: string
    validatorAddress: string
    amount: string
  }): Promise<{ tx: transactions.Transaction }> {
    const { delegatorAddress, validatorAddress, amount } = params
    const amnt = macroToDenomAmount(amount, this.networkConfig.denomMultiplier)
    let method = 'withdraw'
    let args: any = { amount: amnt }

    if (BigInt(amnt) === BigInt(0)) {
      method = 'withdraw_all'
      args = {}
    }

    const action = transactions.functionCall(
      method,
      Buffer.from(JSON.stringify(args)),
      this.getGas(),
      BigInt(0) // method doesn't accept any deposit
    )

    const tx = await this.buildUnsignedTransaction(delegatorAddress, validatorAddress, action)

    return { tx }
  }

  private async buildUnsignedTransaction (
    sourceAddress: string,
    destinationAddress: string,
    action: transactions.Action
  ): Promise<transactions.Transaction> {
    const connection = this.getConnection()
    const recentBlock = await connection.provider.block({ finality: 'final' })
    const recentBlockHash = utils.serialize.base_decode(recentBlock.header.hash)

    const accessKey = await fetchAccessKey(sourceAddress, destinationAddress, connection)
    const nonce = accessKey.access_key.nonce + 1

    return transactions.createTransaction(
      sourceAddress,
      PublicKey.from(accessKey.public_key),
      destinationAddress,
      nonce,
      [action],
      recentBlockHash
    )
  }

  /**
   * Retrieves the staking information for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - (Optional) The validator address to gather staking information from
   *
   * @returns Returns a promise that resolves to the staking information for the specified delegator.
   */
  async getStake (params: { delegatorAddress: string; validatorAddress?: string }): Promise<{ balance: string }> {
    const connection = this.getConnection()
    const { delegatorAddress, validatorAddress } = params

    const acc = new Account(connection, delegatorAddress)
    if (validatorAddress === undefined) {
      const r = await acc.getActiveDelegatedStakeBalance()

      if (r.failedValidators.length > 0) {
        throw new Error(
          `failed to retrieve staking information for ${delegatorAddress} from ${r.failedValidators.map((v) => v.validatorId).join(', ')}`
        )
      }

      const total = typeof r.total === 'bigint' ? r.total.toString(10) : new BigNumber(r.total).toString(10)

      return { balance: denomToMacroAmount(total, this.networkConfig.denomMultiplier) }
    }

    const block = await connection.provider.block({ finality: 'final' })
    const blockHash = block.header.hash

    const yoctoBalance = await acc.viewFunction({
      contractId: validatorAddress,
      methodName: 'get_account_total_balance',
      args: { account_id: delegatorAddress },
      blockQuery: { blockId: blockHash }
    })

    return { balance: denomToMacroAmount(yoctoBalance, this.networkConfig.denomMultiplier) }
  }

  /**
   * Signs a transaction using the provided signer.
   *
   * @param params - Parameters for the signing process
   * @param params.signer - A signer instance.
   * @param params.signerAddress - The address of the signer
   * @param params.tx - The transaction to sign
   *
   * @returns A promise that resolves to an object containing the signed transaction.
   */
  async sign (params: {
    signer: Signer
    signerAddress: string
    tx: transactions.Transaction
  }): Promise<{ signedTx: transactions.SignedTransaction }> {
    const { signer, signerAddress, tx: tx } = params

    const msg = sha256(tx.encode())
    const message = Buffer.from(msg).toString('hex')
    const note = SafeJSONStringify(tx, 2)

    const data: NearSigningData = { tx }

    let signerPublicKeyOrAddr = signerAddress
    if (this.networkConfig.resolveAddress) {
      const accessKey = tx.publicKey.data
      signerPublicKeyOrAddr = Buffer.from(accessKey).toString('hex')
    }

    const { sig, pk } = await signer.sign(signerPublicKeyOrAddr, { message, data }, { note })

    const signedTx = new transactions.SignedTransaction({
      transaction: tx,
      signature: new transactions.Signature({
        keyType: tx.publicKey.keyType,
        data: Buffer.from(sig.fullSig, 'hex')
      })
    })

    const signerPk = Buffer.from(signedTx.transaction.publicKey.data).toString('hex')
    if (signerPk !== Buffer.from(pk).toString('hex')) {
      throw new Error("the transaction's public key does not match the signer's public key")
    }

    return { signedTx }
  }

  /**
   * Broadcasts a signed transaction to the network.
   *
   * @param params - Parameters for the broadcast process
   * @param params.signedTx - The signed transaction to broadcast
   *
   * @returns A promise that resolves to the final execution outcome of the broadcast transaction.
   */
  async broadcast (params: { signedTx: transactions.SignedTransaction }): Promise<FinalExecutionOutcome> {
    const connection = this.getConnection()
    const { signedTx } = params
    return await connection.provider.sendTransaction(signedTx)
  }

  /**
   * Retrieves the status of a transaction using the transaction hash.
   *
   * @param params - Parameters for the transaction status request
   * @param params.txHash - The transaction hash to query
   * @param params.address - The NEAR account that signed the transaction
   *
   * @returns A promise that resolves to an object containing the transaction status.
   */
  async getTxStatus (params: { txHash: string; address: string }): Promise<NearTxStatus> {
    const provider = this.getProvider()
    const { txHash, address } = params
    const response = await provider.txStatus(txHash, address)

    if (typeof response.status === 'object' && typeof response.status.SuccessValue === 'string') {
      if (response.status.SuccessValue) {
        return { status: 'success', receipt: response }
      }
      if (response.status.Failure) {
        return { status: 'failure', receipt: response }
      }
    }

    switch (response.status) {
      case FinalExecutionStatusBasic.NotStarted:
        return { status: 'pending', receipt: response }
      case FinalExecutionStatusBasic.Started:
        return { status: 'pending', receipt: response }
      case FinalExecutionStatusBasic.Failure:
        return { status: 'failure', receipt: response }
      default:
        return { status: 'unknown', receipt: response }
    }
  }

  private getConnection (): Connection {
    if (this.connection === undefined) {
      throw new Error('NearStaker instance not initialized. Did you forget to call init()?')
    }
    return this.connection
  }

  private getProvider (): providers.JsonRpcProvider {
    if (this.provider === undefined) {
      throw new Error('NearStaker instance not initialized. Did you forget to call init()?')
    }
    return this.provider
  }

  private getGas (): bigint {
    return this.networkConfig.gas ? BigInt(this.networkConfig.gas) : DEFAULT_FUNCTION_CALL_GAS
  }
}
