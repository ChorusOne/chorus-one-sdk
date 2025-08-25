import type { Signer } from '@chorus-one/signer'
import type {
  AvalancheNetworkConfig,
  AvalancheSigningData,
  AvalancheAddressSet,
  AvalancheFee,
  AvalancheAsset,
  AvalancheTxStatus
} from './types'
import { sha256 } from '@noble/hashes/sha256'
import type { UnsignedTx, Common } from '@avalabs/avalanchejs'
import { JsonRpcProvider } from 'ethers'
import {
  publicKeyToAddress,
  getChainIdFromContext,
  getChainFromAddr,
  validateSrcAndDstChain,
  macroToDenomAmount,
  denomToMacroAmount,
  getDenomMultiplier
} from './tx'
import { networkIDs as constants, utils, pvm, evm, avm, Context, avaxSerial } from '@avalabs/avalanchejs'

/**
 * This class provides the functionality to stake, import, and export assets on the Avalanche network.
 *
 * It also provides the ability to retrieve staking information and rewards for a delegator.
 */
export class AvalancheStaker {
  private readonly networkConfig: AvalancheNetworkConfig

  /**
   * This **static** method is used to derive an address from a public key.
   *
   * It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.
   *
   * @param params - Parameters for the address derivation
   * @param params.hrp - Address prefix (e.g. avax)
   *
   * @returns Returns an array containing the derived C, P, X and Ethereum addresses.
   */
  static getAddressDerivationFn =
    (params: { hrp?: string }) =>
    async (publicKey: Uint8Array, _derivationPath: string): Promise<Array<string>> => {
      const { hrp } = params

      const addrs = publicKeyToAddress(publicKey, AvalancheStaker.getHrp(hrp))
      return [addrs.cAddr, addrs.pAddr, addrs.xAddr, addrs.coreEthAddr]
    }

  /**
   * This creates a new AvalancheStaker instance.
   *
   * @param params - Initialization parameters
   * @param params.rpcUrl - RPC URL (e.g. https://api.avax.network)
   * @param params.hrp - (Optional) Address prefix (e.g. avax)
   * @param params.asset - (Optional) Asset ID used for transactions (e.g. staking)
   * @param params.fee - (Optional) The fee used to pay for the transaction processing
   * @param params.denomMultiplier - (Optional) Multiplier to convert the base coin unit to its smallest subunit (e.g., `1000000000` for 1 AVAX = 1000000 nAVAX)
   *
   * @returns  An instance of AvalancheStaker.
   */
  constructor (params: {
    rpcUrl: string
    hrp?: string
    asset?: AvalancheAsset
    fee?: AvalancheFee
    denomMultiplier?: string
  }) {
    const { ...networkConfig } = params

    this.networkConfig = networkConfig
  }

  /**
   * Initializes the AvalancheStaker instance and connects to the blockchain.
   *
   * @returns A promise which resolves once the AvalancheStaker instance has been initialized.
   */
  async init (): Promise<void> {
    // asset sanity check
    const xApi = new avm.AVMApi(this.networkConfig.rpcUrl)
    const expectedAssetDescription = this.networkConfig.asset?.assetDescription ?? 'AVAX'
    const response = await xApi.getAssetDescription(expectedAssetDescription)

    if (this.networkConfig.asset !== undefined) {
      // ensure user provided assetDescription (regardless teh above default AVAX)
      if (this.networkConfig.asset?.assetDescription === '') {
        throw new Error('assetDescription is empty')
      }

      if (response.assetID !== this.networkConfig.asset?.assetId) {
        throw new Error('assetId does not match with the RPC response')
      }
    }

    // ensure the denomMultiplier is correct
    if (BigInt(10 ** response.denomination) !== BigInt(getDenomMultiplier(this.networkConfig.denomMultiplier))) {
      throw new Error('onchain denomination does not match the denomMultiplier')
    }
  }

  /**
   * Builds a staking (delegation) transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address to stake from
   * @param params.validatorAddress - The validator address to stake to
   * @param params.amount - The amount to stake, specified in `AVAX`
   * @param params.daysCount - The number of days to stake for
   *
   * @returns Returns a promise that resolves to a Avalanche staking transaction.
   */
  async buildStakeTx (params: {
    delegatorAddress: string
    validatorAddress: string
    amount: string
    daysCount: number
  }): Promise<{ tx: UnsignedTx }> {
    const { delegatorAddress, validatorAddress, amount, daysCount } = params

    if (daysCount <= 0) {
      throw new Error('number of days must be greater than 0')
    }

    const chain = getChainFromAddr(delegatorAddress)
    if (chain !== 'P') {
      throw new Error('invalid chain, expected P-Chain address')
    }
    const pChainAddress = delegatorAddress

    const context = await this.getContext()
    const stakingAssetId = this.getAsset(context).assetId

    const pvmApi = new pvm.PVMApi(this.networkConfig.rpcUrl)
    const feeState = await pvmApi.getFeeState()

    const { utxos } = await pvmApi.getUTXOs({ addresses: [pChainAddress] })

    // calculate staking period
    const startTime = await new pvm.PVMApi().getTimestamp()
    const startDate = new Date(startTime.timestamp)
    const start = BigInt(startDate.getTime() / 1000)
    const endTime = new Date(startTime.timestamp)
    endTime.setDate(endTime.getDate() + daysCount)
    const end = BigInt(endTime.getTime() / 1000)

    const tx = pvm.newAddPermissionlessDelegatorTx(
      {
        changeAddressesBytes: [utils.bech32ToBytes(pChainAddress)],
        end,
        feeState,
        fromAddressesBytes: [utils.bech32ToBytes(pChainAddress)],
        locktime: undefined,
        nodeId: validatorAddress,
        memo: Buffer.from(''),
        minIssuanceTime: start,
        rewardAddresses: [utils.bech32ToBytes(pChainAddress)],
        stakingAssetId,
        start,
        subnetId: constants.PrimaryNetworkID.toString(),
        threshold: undefined,
        utxos,
        weight: macroToDenomAmount(amount, this.networkConfig.denomMultiplier)
      },
      context
    )

    return { tx }
  }

  /**
   * Builds a transaction to export assets to another chain.
   *
   * This is the first step of the transferring tokens from one chain to another.
   * After the export transaction is issued on the source chain, call `buildImportTx` to finalize the transfer.
   *
   * @param params - Parameters for building the transaction
   * @param params.address - The source address to export from and the destination address to export to
   * @param params.srcChain - The source chain to export from e.g. 'C', 'P'
   * @param params.dstChain - The destination chain to export to e.g. 'C', 'P'
   * @param params.amount - The amount to export, specified in `AVAX`
   *
   * @returns Returns a promise that resolves to a Avalanche export transaction.
   */
  async buildExportTx (params: {
    address: AvalancheAddressSet
    srcChain: string
    dstChain: string
    amount: string
  }): Promise<{ tx: UnsignedTx }> {
    const { address, srcChain, dstChain, amount } = params

    validateSrcAndDstChain(srcChain, dstChain)

    const [context, srcAddr, dstAddr, dstCoreAddr] = await Promise.all([
      this.getContext(),
      this.getAddress(address, srcChain),
      this.getAddress(address, dstChain),
      this.getAddress(address, dstChain, true)
    ])
    const assetId = this.getAsset(context).assetId

    switch (srcChain) {
      case 'C': {
        const provider = new JsonRpcProvider(this.networkConfig.rpcUrl + '/ext/bc/C/rpc')
        const txCount = await provider.getTransactionCount(srcAddr)
        const evmBaseFee = await this.getFee('evmBaseTxFee')
        const dstAddressBytes = utils.bech32ToBytes(dstAddr)

        const tx = evm.newExportTxFromBaseFee(
          context,
          evmBaseFee / BigInt(getDenomMultiplier(this.networkConfig.denomMultiplier)),
          macroToDenomAmount(amount, this.networkConfig.denomMultiplier),
          getChainIdFromContext(dstChain, context),
          utils.hexToBuffer(srcAddr),
          [dstAddressBytes],
          BigInt(txCount),
          assetId
        )

        return { tx }
      }
      case 'P': {
        const pvmApi = new pvm.PVMApi(this.networkConfig.rpcUrl)
        const { utxos } = await pvmApi.getUTXOs({
          addresses: [srcAddr]
        })

        const amnt = macroToDenomAmount(amount, this.networkConfig.denomMultiplier)
        const tx = pvm.newExportTx(
          {
            changeAddressesBytes: [utils.bech32ToBytes(srcAddr)],
            destinationChainId: getChainIdFromContext(dstChain, context),
            feeState: await pvmApi.getFeeState(),
            fromAddressesBytes: [utils.bech32ToBytes(srcAddr)],
            outputs: [avaxSerial.TransferableOutput.fromNative(assetId, amnt, [utils.bech32ToBytes(dstCoreAddr)])],
            utxos
          },
          context
        )

        return { tx }
      }
      default:
        throw new Error('invalid source chain')
    }
  }

  /**
   * Builds a transaction to import assets from another chain.
   *
   * This is the last step of the transferring tokens from one chain to another.
   *
   * Call `buildExportTx` on the source chain first, then call this method to finalize the transfer.
   *
   * @param params - Parameters for building the transaction
   * @param params.address - The source address to import from and the destination address to import to
   * @param params.srcChain - The source chain to import from e.g. 'C', 'P'
   * @param params.dstChain - The destination chain to import to e.g. 'C', 'P'
   *
   * @returns Returns a promise that resolves to a Avalanche import transaction.
   */
  async buildImportTx (params: {
    address: AvalancheAddressSet
    srcChain: string
    dstChain: string
  }): Promise<{ tx: UnsignedTx }> {
    const { address, srcChain, dstChain } = params

    validateSrcAndDstChain(srcChain, dstChain)

    const [context, srcCoreAddr, dstAddr, dstCoreAddr] = await Promise.all([
      this.getContext(),
      this.getAddress(address, srcChain, true),
      this.getAddress(address, dstChain),
      this.getAddress(address, dstChain, true)
    ])
    const feeAssetId = this.getAsset(context).assetId

    switch (dstChain) {
      case 'C': {
        const evmApi = new evm.EVMApi(this.networkConfig.rpcUrl)
        const evmBaseFee = await this.getFee('evmBaseTxFee')

        const { utxos } = await evmApi.getUTXOs({
          sourceChain: srcChain,
          addresses: [dstCoreAddr]
        })

        const tx = evm.newImportTxFromBaseFee(
          context,
          utils.hexToBuffer(dstAddr),
          [utils.bech32ToBytes(dstCoreAddr)],
          utxos,
          getChainIdFromContext(srcChain, context),
          evmBaseFee / BigInt(getDenomMultiplier(this.networkConfig.denomMultiplier)),
          feeAssetId
        )

        return { tx }
      }
      case 'P': {
        const pvmApi = new pvm.PVMApi(this.networkConfig.rpcUrl)
        const { utxos } = await pvmApi.getUTXOs({
          sourceChain: srcChain,
          addresses: [dstAddr]
        })

        const tx = pvm.newImportTx(
          {
            feeState: await pvmApi.getFeeState(),
            fromAddressesBytes: [utils.bech32ToBytes(srcCoreAddr)],
            sourceChainId: getChainIdFromContext(srcChain, context),
            toAddressesBytes: [utils.bech32ToBytes(dstCoreAddr)],
            utxos
          },
          context
        )

        return { tx }
      }
      default:
        throw new Error('invalid source chain')
    }
  }

  /**
   * Retrieves the staking information for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   *
   * @returns Returns a promise that resolves to the staking information for the specified delegator.
   */
  async getStake (params: { delegatorAddress: string }): Promise<{ balance: string }> {
    const { delegatorAddress } = params

    const pvmApi = new pvm.PVMApi(this.networkConfig.rpcUrl)
    const r = await pvmApi.getStake({ addresses: [delegatorAddress] })

    if (r.stakedOutputs.length > 0) {
      const context = await this.getContext()
      const { assetId } = this.getAsset(context)

      r.stakedOutputs.forEach((output) => {
        if (assetId !== output.assetId.toString()) {
          throw new Error('assetId does not match the staked output assetId')
        }
      })
    }

    return { balance: denomToMacroAmount(r.staked, this.networkConfig.denomMultiplier) }
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
  async sign (params: {
    signer: Signer
    signerAddress: string
    tx: UnsignedTx
  }): Promise<{ signedTx: avaxSerial.SignedTx }> {
    const { signer, signerAddress, tx } = params

    const hrp = AvalancheStaker.getHrp(this.networkConfig.hrp)

    const sh = sha256(tx.toBytes())
    const message = Buffer.from(sh).toString('hex')

    const data: AvalancheSigningData = { tx }
    const note = JSON.stringify(tx.toJSON(), null, 2)

    const { sig, pk } = await signer.sign(signerAddress, { message, data }, { note })

    // avalanchejs/src/crypto/secp256k1.ts recoverPublicKey expects signature with recovery (v) bit
    const signature = new Uint8Array([
      ...Buffer.from(sig.r ?? '', 'hex'),
      ...Buffer.from(sig.s ?? '', 'hex'),
      sig.v ?? 0
    ])

    // verify that signer address matches derived address from signature
    const recoveredAddrs = Object.values(publicKeyToAddress(pk, hrp)).map((a) => a.toLowerCase())
    if (!recoveredAddrs.includes(signerAddress.toLowerCase())) {
      throw new Error('signer address does not match the signature recovered address')
    }

    tx.addSignature(signature)

    return { signedTx: tx.getSignedTx() }
  }

  /**
   * This method is used to broadcast a signed transaction to the Avalanche network.
   *
   * @param params - Parameters for the broadcast
   * @param params.signedTx - The signed transaction to be broadcasted
   * @param params.dstChain - The destination chain for the transaction - 'C', 'P', or 'X'
   *
   * @returns Returns a promise that resolves to the response of the transaction that was broadcast to the network.
   */
  async broadcast (params: { signedTx: avaxSerial.SignedTx; dstChain: string }): Promise<Common.IssueTxResponse> {
    const { signedTx, dstChain: dstChain } = params

    switch (dstChain) {
      case 'C': {
        const evmApi = new evm.EVMApi(this.networkConfig.rpcUrl)
        return await evmApi.issueSignedTx(signedTx)
      }
      case 'P': {
        const pvmApi = new pvm.PVMApi(this.networkConfig.rpcUrl)
        return await pvmApi.issueSignedTx(signedTx)
      }
      case 'X': {
        const avmApi = new avm.AVMApi(this.networkConfig.rpcUrl)
        return await avmApi.issueSignedTx(signedTx)
      }
      default:
        throw new Error('invalid source chain')
    }
  }

  /**
   * Retrieves the status of a transaction using the transaction hash.
   *
   * @param params - Parameters for the transaction status request
   * @param params.txId - The transaction hash to query
   * @param params.chain - The chain to query the transaction status from - 'C', 'P', or 'X'
   *
   * @returns A promise that resolves to an object containing the transaction status.
   */
  async getTxStatus (params: { txId: string; chain: string }): Promise<AvalancheTxStatus> {
    const { txId, chain } = params

    switch (chain) {
      case 'C': {
        const evmApi = new evm.EVMApi(this.networkConfig.rpcUrl)
        const response = await evmApi.getAtomicTxStatus(txId)

        // https://docs.avax.network/reference/avalanchego/c-chain/api#avaxgetatomictxstatus
        switch (response.status) {
          case 'Accepted':
            return { status: 'success', receipt: response }
          case 'Dropped':
            return { status: 'failure', receipt: response }
          case 'Processing':
            return { status: 'pending', receipt: response }
          case 'Unknown':
            return { status: 'unknown', receipt: response }
          default:
            return { status: 'unknown', receipt: response }
        }
      }
      case 'P': {
        const pvmApi = new pvm.PVMApi(this.networkConfig.rpcUrl)
        const response = await pvmApi.getTxStatus({ txID: txId })

        // https://docs.avax.network/reference/avalanchego/p-chain/api#platformgettxstatus
        switch (response.status) {
          case 'Commited':
            return { status: 'success', receipt: response }
          case 'Dropped':
            return { status: 'failure', receipt: response }
          case 'Processing':
            return { status: 'pending', receipt: response }
          case 'Unknown':
            return { status: 'unknown', receipt: response }
          default:
            return { status: 'unknown', receipt: response }
        }
      }
      case 'X': {
        const avmApi = new avm.AVMApi(this.networkConfig.rpcUrl)
        const response = await avmApi.getTxStatus({ txID: txId })

        // https://docs.avax.network/reference/avalanchego/x-chain/api#avmgettxstatus
        switch (response.status) {
          case 'Accepted':
            return { status: 'success', receipt: response }
          case 'Rejected':
            return { status: 'failure', receipt: response }
          case 'Processing':
            return { status: 'pending', receipt: response }
          case 'Unknown':
            return { status: 'unknown', receipt: response }
          default:
            return { status: 'unknown', receipt: response }
        }
      }
      default:
        throw new Error('invalid source chain')
    }
  }

  private async getContext (): Promise<Context.Context> {
    const assetDescription = this.networkConfig.asset?.assetDescription ?? 'AVAX'
    const context = await Context.getContextFromURI(this.networkConfig.rpcUrl, assetDescription)

    // override baseTxFee if it is set in the networkConfig
    if (this.networkConfig.fee !== undefined && this.networkConfig.fee.baseTxFee !== undefined) {
      return Object.freeze(
        Object.assign({}, context, { baseTxFee: BigInt(this.networkConfig.fee.baseTxFee) })
      ) as Context.Context
    }
    return context
  }

  private getAsset (context: Context.Context): { assetId: string; assetDescription: string } {
    if (this.networkConfig.asset !== undefined) {
      return this.networkConfig.asset
    }

    return { assetId: context.avaxAssetID, assetDescription: 'AVAX' }
  }

  private async getFee (feeType: 'baseTxFee' | 'evmBaseTxFee'): Promise<bigint> {
    switch (feeType) {
      case 'baseTxFee': {
        if (this.networkConfig.fee !== undefined && this.networkConfig.fee.baseTxFee !== undefined) {
          return BigInt(this.networkConfig.fee.baseTxFee)
        }

        const context = await this.getContext()
        return context.baseTxFee
      }

      case 'evmBaseTxFee': {
        if (this.networkConfig.fee !== undefined && this.networkConfig.fee.evmBaseTxFee !== undefined) {
          return BigInt(this.networkConfig.fee.evmBaseTxFee)
        }

        const evmApi = new evm.EVMApi(this.networkConfig.rpcUrl)
        return await evmApi.getBaseFee()
      }
    }
  }

  private getAddress (addrs: AvalancheAddressSet, chain: string, core: boolean = false): string {
    switch (chain) {
      case 'C':
        return core ? addrs.coreEthAddr : addrs.cAddr
      case 'P':
        return addrs.pAddr
      case 'X':
        return addrs.xAddr
      default:
        throw new Error('invalid chain')
    }
  }

  private static getHrp (hrp?: string): string {
    return hrp ?? 'avax'
  }
}
