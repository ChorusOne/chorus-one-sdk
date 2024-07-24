import { encodeAddress } from '@polkadot/util-crypto'
import type { SignerOptions } from '@polkadot/api/submittable/types'
import type { GenericExtrinsic } from '@polkadot/types/extrinsic'
import type { ExtrinsicStatus } from '@polkadot/types/interfaces/author'
import type { AnyTuple } from '@polkadot/types-codec/types'
import type { Signer } from '@chorus-one/signer'
import type {
  SubstrateNetworkConfig,
  SubstrateSigningData,
  SubstrateFee,
  SubstrateTxStatus,
  UnsignedTx,
  Indexer
} from './types'
import { getDenomMultiplier, denomToMacroAmount, macroToDenomAmount } from './tx'
import { RewardDestination } from './enums'
import { ApiPromise, WsProvider } from '@polkadot/api'
import type { ISignerPayload } from '@polkadot/types/types'
import { blake2AsHex } from '@polkadot/util-crypto'
import BigNumber from 'bignumber.js'

/**
 * This class provides the functionality to stake, nominate, unbond, and withdraw funds for a Substrate-based blockchains.
 *
 * It also provides the ability to retrieve staking information and rewards for a delegator.
 */
export class SubstrateStaker {
  private readonly networkConfig: SubstrateNetworkConfig
  private api?: ApiPromise

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
      return [encodeAddress(publicKey)]
    }

  /**
   * This creates a new SubstrateStaker instance.
   *
   * @param params - Initialization parameters
   * @param params.rpcUrl - RPC URL (e.g. wss://rpc.polkadot.io)
   * @param params.rewardDestination - Reward destination (e.g., RewardDestination.STASH or RewardDestination.CONTROLLER)
   * @param params.denomMultiplier - (Optional) Multiplier to convert the base coin unit to its smallest subunit (e.g., `1000000000000` for 1 DOT = 1000000000000 Planck)
   * @param params.fee - (Optional) Transaction fee (e.g. '0.001' for 0.001 DOT)
   * @param params.indexer - (Optional) Indexer instance to supplement missing node RPC features
   *
   * @returns  An instance of SusbstrateStaker.
   */
  constructor (params: {
    rpcUrl: string
    rewardDestination: RewardDestination
    denomMultiplier?: string
    fee?: SubstrateFee
    indexer?: Indexer
  }) {
    const { ...networkConfig } = params
    this.networkConfig = networkConfig
  }

  /**
   * Initializes the SubstrateStaker instance and connects to the blockchain.
   *
   * @returns A promise which resolves once the Staker instance has been initialized.
   */

  async init (): Promise<void> {
    const provider = new WsProvider(this.networkConfig.rpcUrl)
    this.api = await ApiPromise.create({ provider, noInitWarn: true })

    if (this.networkConfig.denomMultiplier === undefined) {
      const decimals = this.api.registry.chainDecimals
      if (decimals.length !== 1) {
        throw new Error(`expected one chain decimial information, got ${decimals.length}`)
      }
      this.networkConfig.denomMultiplier = (10 ** this.api.registry.chainDecimals[0]).toString()
    }
  }

  /**
   * Closes the SubstrateStaker instance and disconnects from the blockchain.
   *
   * @returns A promise which resolves once the Staker instance has been closed.
   */
  async close (): Promise<void> {
    const api = this.getApi()
    await api.disconnect()
  }

  /**
   * Builds a staking (delegation) transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.amount - The amount to stake, specified in base units of the native token (e.g. `DOT` for Polkadot)
   *
   * @returns Returns a promise that resolves to a Polkadot staking transaction.
   */
  async buildStakeTx (params: { amount: string }): Promise<{ tx: UnsignedTx }> {
    const { amount } = params

    return this.buildUnsignedTx({ section: 'staking', method: 'bond' }, [
      macroToDenomAmount(amount, getDenomMultiplier(this.networkConfig.denomMultiplier)),
      this.networkConfig.rewardDestination
    ])
  }

  /**
   * Builds a nomination transaction - allows the user to pick trusted validators to delegate to.
   *
   * @param params - Parameters for building the transaction
   * @param params.validatorAddresses - The list of validator addresses to nominate to
   *
   * @returns Returns a promise that resolves to a Substrate nomination transaction.
   */
  async buildNominateTx (params: { validatorAddresses: string[] }): Promise<{ tx: UnsignedTx }> {
    const { validatorAddresses } = params

    return this.buildUnsignedTx({ section: 'staking', method: 'nominate' }, validatorAddresses)
  }

  /**
   * Builds an unstaking (undelegation) transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.amount - The amount to unstake, specified in base units of the native token (e.g. `DOT` for Polkadot)
   *
   * @returns Returns a promise that resolves to a Substrate unstaking transaction.
   */
  async buildUnstakeTx (params: { amount: string }): Promise<{ tx: UnsignedTx }> {
    const { amount } = params

    return this.buildUnsignedTx({ section: 'staking', method: 'unbond' }, [
      macroToDenomAmount(amount, getDenomMultiplier(this.networkConfig.denomMultiplier))
    ])
  }

  /**
   * Builds a transaction to withdraw all unstaked funds from the validator contract.
   *
   * @returns Returns a promise that resolves to a Substrate withdraw transaction.
   */
  async buildWithdrawTx (): Promise<{ tx: UnsignedTx }> {
    return this.buildUnsignedTx({ section: 'staking', method: 'withdrawUnbonded' }, [null /* slashing spans */])
  }

  /**
   * Builds a transaction to delegate more tokens to a validator.
   *
   * @param params - Parameters for building the transaction
   * @param params.amount - The amount to stake, specified in base units of the native token (e.g. `DOT` for Polkadot)
   *
   * @returns Returns a promise that resolves to a Substrate bond extra transaction.
   */
  async buildBondExtraTx (params: { amount: string }): Promise<{ tx: UnsignedTx }> {
    const { amount } = params

    return this.buildUnsignedTx({ section: 'staking', method: 'bondExtra' }, [
      macroToDenomAmount(amount, getDenomMultiplier(this.networkConfig.denomMultiplier))
    ])
  }

  /**
   * Retrieves the staking information for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - (Optional) The validator address to assert the delegator is staking with
   * @param params.status - (Optional) The status of nomination (default: 'active')
   *
   * @returns Returns a promise that resolves to the staking information for the specified delegator.
   */
  async getStake (params: {
    delegatorAddress: string
    validatorAddress?: string
    status?: 'active' | 'total'
  }): Promise<{ balance: string }> {
    const api = this.getApi()
    const { delegatorAddress, validatorAddress, status } = params

    const r = await api.query.staking.ledger(delegatorAddress)
    if (r.isEmpty) {
      return { balance: '0' }
    }
    const v = r.toJSON()

    if (validatorAddress !== undefined) {
      const validators = (await api.query.staking.nominators(delegatorAddress)) as any
      const found = validators.toJSON()['targets'].filter((v: any) => v.toString() === validatorAddress)

      if (found.length === 0) {
        throw new Error('validator not found in nominators')
      }
    }

    if (status === 'total') {
      const total = v?.['total']
      if (typeof total !== 'string') {
        throw new Error('JSON value is malformed')
      }
      return { balance: denomToMacroAmount(total, getDenomMultiplier(this.networkConfig.denomMultiplier)) }
    }

    const active = v?.['active']
    if (typeof active !== 'string') {
      throw new Error('JSON value is malformed')
    }

    return { balance: denomToMacroAmount(active, getDenomMultiplier(this.networkConfig.denomMultiplier)) }
  }

  /**
   * Signs a transaction using the provided signer.
   *
   * @param params - Parameters for the signing process
   * @param params.signer - Signer instance
   * @param params.signerAddress - The address of the signer
   * @param params.tx - The transaction to sign
   * @param params.blocks - (Optional) The number of blocks until the transaction expires
   *
   * @returns A promise that resolves to an object containing the signed transaction.
   */
  async sign (params: {
    signer: Signer
    signerAddress: string
    tx: UnsignedTx
    blocks?: number
  }): Promise<{ signedTx: GenericExtrinsic<AnyTuple> }> {
    const api = this.getApi()
    const { signer, signerAddress, tx: unsignedTx, blocks } = params

    const options: Partial<SignerOptions> = {}
    if (blocks === 0) {
      // forever living extrinsic
      options.era = 0
    } else if (blocks !== undefined) {
      const signedBlock = await api.rpc.chain.getBlock()
      options.blockHash = signedBlock.block.header.hash

      options.era = api.createType('ExtrinsicEra', {
        current: signedBlock.block.header.number,
        period: blocks
      })
    }

    let tip = '0'
    if (this.networkConfig.fee !== undefined) {
      if (this.networkConfig.fee.tip !== undefined) {
        const tipBig = BigNumber(this.networkConfig.fee.tip)
        if (tipBig.isNaN()) {
          throw new Error('tip is not a number')
        }

        tip = tipBig.multipliedBy(getDenomMultiplier(this.networkConfig.denomMultiplier)).toString(10)
      }
    }

    const signingInfo = await api.derive.tx.signingInfo(signerAddress, undefined, options.era)
    const payload = api.createType('SignerPayload', {
      address: signerAddress,
      blockNumber: signingInfo.header ? signingInfo.header.number : 0,
      method: unsignedTx.method,
      nonce: signingInfo.nonce,
      era: options.era,
      genesisHash: api.genesisHash,
      blockHash: signingInfo.header ? signingInfo.header.hash : api.genesisHash,
      runtimeVersion: api.runtimeVersion,
      signedExtensions: api.registry.signedExtensions,
      version: api.extrinsicVersion,
      tip
    })

    const signature = await this.signRaw(signer, payload)

    return {
      signedTx: unsignedTx.addSignature(signerAddress, signature as `0x${string}`, payload.toPayload())
    }
  }

  /**
   * This method is used to broadcast a signed transaction to the Substrate network.
   *
   * @param params - Parameters for the broadcast
   * @param params.signedTx - The signed transaction to be broadcasted
   *
   * @returns Returns a promise that resolves to the response of the transaction that was broadcast to the network.
   */
  async broadcast (params: { signedTx: GenericExtrinsic }): Promise<{ txHash: string; status: ExtrinsicStatus }> {
    const api = this.getApi()
    const { signedTx } = params

    // NOTE: Alternative approach to sign and send (useful for troubleshooting)
    // const options: Partial<SignerOptions> = { signer: new SubstrateSigner(...) }
    // const submittableExtrinsic = await unsignedTx.signAsync(account, optionss)
    const status = await api.rpc.author.submitAndWatchExtrinsic(signedTx)
    if (status === undefined) {
      throw new Error('broadcast failed with empty response')
    }

    return {
      txHash: signedTx.hash.toHex(),
      status
    }
  }

  /**
   * Retrieves the status of a transaction using the transaction hash.
   *
   * @param params - Parameters for the transaction status request
   * @param params.txHash - The transaction hash to query
   *
   * @returns A promise that resolves to an object containing the transaction status.
   */
  async getTxStatus (params: { txHash: string }): Promise<SubstrateTxStatus> {
    const { txHash } = params

    if (this.networkConfig.indexer == undefined) {
      throw new Error('unable to find indexer instance')
    }

    const indexer = this.networkConfig.indexer

    return await indexer.getTxStatus(txHash)
  }

  private getApi (): ApiPromise {
    if (this.api === undefined) {
      throw new Error('SubstrateStaker instance is not initialized. Did you forget to call init()?')
    }
    return this.api
  }

  private async buildUnsignedTx (
    txCall: { section: string; method: string },
    params: any[]
  ): Promise<{ tx: UnsignedTx }> {
    const api = this.getApi()
    if (!(txCall.section in api.tx && txCall.method in api.tx[txCall.section])) {
      throw new Error(`unable to find method ${txCall.section}.${txCall.method}`)
    }

    return { tx: api.tx[txCall.section][txCall.method](...params) }
  }

  private async signRaw (signer: Signer, payload: ISignerPayload): Promise<string> {
    const { data, address } = payload.toRaw()

    const msg = data.length > (256 + 1) * 2 ? blake2AsHex(data) : data
    const message = msg.substring(2)
    const signerData: SubstrateSigningData = { payload }

    const { sig } = await signer.sign(
      address,
      { message, data: signerData },
      { note: JSON.stringify(payload.toPayload(), null, 2) }
    )

    return '0x00' + sig.fullSig
  }
}
