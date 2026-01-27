import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseEther,
  formatEther,
  isAddress,
  keccak256,
  serializeTransaction,
  createWalletClient,
  maxUint256,
  erc20Abi,
  type PublicClient,
  type Address,
  type Hex,
  type Chain
} from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import type { Signer } from '@chorus-one/signer'
import type { Transaction, PolygonNetworkConfig, PolygonTxStatus, StakeInfo, UnbondInfo } from './types.d'
import { buildReferrerTracking } from './referrer'
import {
  VALIDATOR_SHARE_ABI,
  STAKE_MANAGER_ABI,
  NETWORK_CONTRACTS,
  type PolygonNetworks,
  type NetworkContracts
} from './constants'

/**
 * PolygonStaker - TypeScript SDK for Polygon PoS staking operations
 *
 * This class provides the functionality to stake (delegate), unstake, withdraw,
 * claim rewards, and compound rewards on Polygon PoS via ValidatorShare contracts
 * deployed on Ethereum L1.
 *
 * Built with viem for type-safety and modern patterns.
 *
 * ---
 *
 * **⚠️ EIP-2930 Access List Compatibility Warning**
 *
 * All transaction builders include an EIP-2930 access list for referrer tracking by default.
 * Some wallets (e.g., Phantom) do not support EIP-2930 access lists and will fail during
 * gas estimation with `InvalidInputRpcError` or `InvalidParamsRpcError`.
 *
 * If you need to support these wallets, implement a fallback that retries without the access list:
 *
 * @example
 * ```typescript
 * import { BaseError, InvalidInputRpcError, InvalidParamsRpcError } from 'viem'
 *
 * const shouldRetryWithoutAccessList = (error: unknown): boolean => {
 *   const matches = (err: unknown) =>
 *     err instanceof InvalidInputRpcError || err instanceof InvalidParamsRpcError
 *   if (error instanceof BaseError) {
 *     return Boolean(error.walk(matches))
 *   }
 *   return false
 * }
 *
 * const sendTransaction = async (tx: Transaction) => {
 *   try {
 *     return await walletClient.sendTransaction(tx)
 *   } catch (err) {
 *     if (tx.accessList && shouldRetryWithoutAccessList(err)) {
 *       const { accessList: _omit, ...fallbackTx } = tx
 *       return await walletClient.sendTransaction(fallbackTx)
 *     }
 *     throw err
 *   }
 * }
 * ```
 */
const NETWORK_CHAINS: Record<PolygonNetworks, Chain> = {
  mainnet,
  testnet: sepolia
}

export class PolygonStaker {
  private readonly rpcUrl?: string
  private readonly network: PolygonNetworks
  private readonly contracts: NetworkContracts
  private publicClient?: PublicClient
  private chain!: Chain

  /**
   * This **static** method is used to derive an address from a public key.
   *
   * It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.
   *
   * @returns Returns an array containing the derived address.
   */
  static getAddressDerivationFn =
    () =>
    async (publicKey: Uint8Array): Promise<Array<string>> => {
      const pkUncompressed = secp256k1.Point.fromBytes(publicKey).toBytes(false)
      const hash = keccak256(pkUncompressed.subarray(1))
      const ethAddress = hash.slice(-40)
      return [ethAddress]
    }

  /**
   * Creates a PolygonStaker instance
   *
   * @param params - Initialization configuration
   * @param params.network - Network to use: 'mainnet' (Ethereum L1) or 'testnet' (Sepolia L1)
   * @param params.rpcUrl - Optional RPC endpoint URL override. If not provided, uses viem's default for the network.
   *
   * @returns An instance of PolygonStaker
   */
  constructor (params: PolygonNetworkConfig) {
    this.network = params.network
    this.rpcUrl = params.rpcUrl
    this.contracts = NETWORK_CONTRACTS[params.network]
  }

  /**
   * Initializes the PolygonStaker instance and connects to the blockchain
   *
   * @returns A promise which resolves once the PolygonStaker instance has been initialized
   */
  async init (): Promise<void> {
    this.chain = NETWORK_CHAINS[this.network]

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(this.rpcUrl)
    })
  }

  /**
   * Builds a token approval transaction
   *
   * Approves the StakeManager contract to spend POL tokens on behalf of the delegator.
   * This must be called before staking if the current allowance is insufficient.
   *
   * @param params - Parameters for building the transaction
   * @param params.amount - The amount to approve in POL (will be converted to wei internally). Pass "max" for unlimited approval.
   * @param params.referrer - (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding.
   *
   * @returns Returns a promise that resolves to an approval transaction
   */
  async buildApproveTx (params: { amount: string; referrer?: Hex }): Promise<{ tx: Transaction }> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }
    const { amount, referrer } = params

    const amountWei = amount === 'max' ? maxUint256 : this.parseAmount(amount)

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [this.contracts.stakeManagerAddress, amountWei]
    })

    return {
      tx: {
        to: this.contracts.stakingTokenAddress,
        data,
        value: 0n,
        accessList: buildReferrerTracking(referrer)
      }
    }
  }

  /**
   * Builds a staking (delegation) transaction
   *
   * Delegates POL tokens to a validator via their ValidatorShare contract.
   * Requires prior token approval to the StakeManager contract.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's Ethereum address
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   * @param params.amount - The amount to stake in POL (will be converted to wei internally)
   * @param params.referrer - (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding.
   *
   * @returns Returns a promise that resolves to a Polygon staking transaction
   */
  async buildStakeTx (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    amount: string
    referrer?: Hex
  }): Promise<{ tx: Transaction }> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }
    const { delegatorAddress, validatorShareAddress, amount, referrer } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isAddress(validatorShareAddress)) {
      throw new Error(`Invalid validator share address: ${validatorShareAddress}`)
    }

    const amountWei = this.parseAmount(amount)

    const allowance = await this.getAllowance(delegatorAddress)
    if (allowance < amountWei) {
      throw new Error(
        `Insufficient POL allowance. Current: ${formatEther(allowance)}, Required: ${amount}. Call buildApproveTx() first.`
      )
    }

    const data = encodeFunctionData({
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'buyVoucherPOL',
      args: [amountWei, 0n]
    })

    return {
      tx: {
        to: validatorShareAddress,
        data,
        value: 0n,
        accessList: buildReferrerTracking(referrer)
      }
    }
  }

  /**
   * Builds an unstaking transaction
   *
   * Creates an unbond request to unstake POL tokens from a validator.
   * After the unbonding period (~80 checkpoints), call buildWithdrawTx() to claim funds.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   * @param params.amount - The amount to unstake in POL (will be converted to wei internally)
   * @param params.referrer - (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding.
   *
   * @returns Returns a promise that resolves to a Polygon unstaking transaction
   */
  async buildUnstakeTx (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    amount: string
    referrer?: Hex
  }): Promise<{ tx: Transaction }> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }
    const { delegatorAddress, validatorShareAddress, amount, referrer } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isAddress(validatorShareAddress)) {
      throw new Error(`Invalid validator share address: ${validatorShareAddress}`)
    }

    const amountWei = this.parseAmount(amount)

    const stake = await this.getStake({ delegatorAddress, validatorShareAddress })
    if (stake.totalStaked < amountWei) {
      throw new Error(
        `Insufficient stake. Current: ${formatEther(stake.totalStaked)} POL, Requested: ${amount} POL`
      )
    }

    const data = encodeFunctionData({
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'sellVoucher_newPOL',
      args: [amountWei, amountWei]
    })

    return {
      tx: {
        to: validatorShareAddress,
        data,
        value: 0n,
        accessList: buildReferrerTracking(referrer)
      }
    }
  }

  /**
   * Builds a withdraw transaction
   *
   * Claims unstaked POL tokens after the unbonding period has elapsed.
   * Use getUnbond() to check if the unbonding period is complete.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address that will receive the funds
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   * @param params.unbondNonce - The unbond nonce from the unstaking operation
   * @param params.referrer - (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding.
   *
   * @returns Returns a promise that resolves to a Polygon withdrawal transaction
   */
  async buildWithdrawTx (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    unbondNonce: bigint
    referrer?: Hex
  }): Promise<{ tx: Transaction }> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }
    const { delegatorAddress, validatorShareAddress, unbondNonce, referrer } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isAddress(validatorShareAddress)) {
      throw new Error(`Invalid validator share address: ${validatorShareAddress}`)
    }

    const unbond = await this.getUnbond({ delegatorAddress, validatorShareAddress, unbondNonce })
    if (unbond.shares === 0n) {
      throw new Error(`No unbond request found for nonce ${unbondNonce}`)
    }

    const currentEpoch = await this.getEpoch()
    if (currentEpoch < unbond.withdrawEpoch) {
      throw new Error(
        `Unbonding not complete. Current epoch: ${currentEpoch}, Withdraw epoch: ${unbond.withdrawEpoch}`
      )
    }

    const data = encodeFunctionData({
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'unstakeClaimTokens_newPOL',
      args: [unbondNonce]
    })

    return {
      tx: {
        to: validatorShareAddress,
        data,
        value: 0n,
        accessList: buildReferrerTracking(referrer)
      }
    }
  }

  /**
   * Builds a claim rewards transaction
   *
   * Claims accumulated delegation rewards and sends them to the delegator's wallet.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address that will receive the rewards
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   * @param params.referrer - (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding.
   *
   * @returns Returns a promise that resolves to a Polygon claim rewards transaction
   */
  async buildClaimRewardsTx (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    referrer?: Hex
  }): Promise<{ tx: Transaction }> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }
    const { delegatorAddress, validatorShareAddress, referrer } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isAddress(validatorShareAddress)) {
      throw new Error(`Invalid validator share address: ${validatorShareAddress}`)
    }

    const rewards = await this.getLiquidRewards({ delegatorAddress, validatorShareAddress })
    if (rewards === 0n) {
      throw new Error('No rewards available to claim')
    }

    const data = encodeFunctionData({
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'withdrawRewardsPOL'
    })

    return {
      tx: {
        to: validatorShareAddress,
        data,
        value: 0n,
        accessList: buildReferrerTracking(referrer)
      }
    }
  }

  /**
   * Builds a compound (restake) rewards transaction
   *
   * Restakes accumulated rewards back into the validator, increasing delegation without new tokens.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   * @param params.referrer - (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding.
   *
   * @returns Returns a promise that resolves to a Polygon compound transaction
   */
  async buildCompoundTx (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    referrer?: Hex
  }): Promise<{ tx: Transaction }> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }
    const { delegatorAddress, validatorShareAddress, referrer } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isAddress(validatorShareAddress)) {
      throw new Error(`Invalid validator share address: ${validatorShareAddress}`)
    }

    const rewards = await this.getLiquidRewards({ delegatorAddress, validatorShareAddress })
    if (rewards === 0n) {
      throw new Error('No rewards available to compound')
    }

    const data = encodeFunctionData({
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'restakePOL'
    })

    return {
      tx: {
        to: validatorShareAddress,
        data,
        value: 0n,
        accessList: buildReferrerTracking(referrer)
      }
    }
  }

  // ========== QUERY METHODS ==========

  /**
   * Retrieves the delegator's staking information for a specific validator
   *
   * @param params - Parameters for the query
   * @param params.delegatorAddress - Ethereum address of the delegator
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   *
   * @returns Promise resolving to stake information:
   *   - totalStaked: Total staked amount in wei
   *   - shares: Total shares held by the delegator
   */
  async getStake (params: { delegatorAddress: Address; validatorShareAddress: Address }): Promise<StakeInfo> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }
    const { delegatorAddress, validatorShareAddress } = params

    const result = await this.publicClient.readContract({
      address: validatorShareAddress,
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'getTotalStake',
      args: [delegatorAddress]
    })

    return {
      totalStaked: result[0],
      shares: result[1]
    }
  }

  /**
   * Retrieves the current unbond nonce for a delegator
   *
   * The nonce represents the index of the latest unbond request.
   * The first unbond is stored at nonce 1. The latest unbond request has nonce = unbondNonces.
   *
   * @param params - Parameters for the query
   * @param params.delegatorAddress - Ethereum address of the delegator
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   *
   * @returns Promise resolving to the current unbond nonce
   */
  async getUnbondNonce (params: { delegatorAddress: Address; validatorShareAddress: Address }): Promise<bigint> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }

    return this.publicClient.readContract({
      address: params.validatorShareAddress,
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'unbondNonces',
      args: [params.delegatorAddress]
    })
  }

  /**
   * Retrieves unbond request information
   *
   * @param params - Parameters for the query
   * @param params.delegatorAddress - Ethereum address of the delegator
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   * @param params.unbondNonce - The unbond nonce to query
   *
   * @returns Promise resolving to unbond information:
   *   - shares: Shares amount pending unbonding (0 if no request exists)
   *   - withdrawEpoch: Epoch number when the unbond becomes claimable
   */
  async getUnbond (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    unbondNonce: bigint
  }): Promise<UnbondInfo> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }
    const { delegatorAddress, validatorShareAddress, unbondNonce } = params

    const result = await this.publicClient.readContract({
      address: validatorShareAddress,
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'unbonds_new',
      args: [delegatorAddress, unbondNonce]
    })

    return {
      shares: result[0],
      withdrawEpoch: result[1]
    }
  }

  /**
   * Retrieves pending liquid rewards for a delegator
   *
   * @param params - Parameters for the query
   * @param params.delegatorAddress - Ethereum address of the delegator
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   *
   * @returns Promise resolving to the pending rewards in wei
   */
  async getLiquidRewards (params: { delegatorAddress: Address; validatorShareAddress: Address }): Promise<bigint> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }

    return this.publicClient.readContract({
      address: params.validatorShareAddress,
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'getLiquidRewards',
      args: [params.delegatorAddress]
    })
  }

  /**
   * Retrieves the current POL allowance for the StakeManager contract
   *
   * @param ownerAddress - The token owner's address
   *
   * @returns Promise resolving to the current allowance in wei
   */
  async getAllowance (ownerAddress: Address): Promise<bigint> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }

    return this.publicClient.readContract({
      address: this.contracts.stakingTokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [ownerAddress, this.contracts.stakeManagerAddress]
    })
  }

  /**
   * Retrieves the current checkpoint epoch from the StakeManager
   *
   * @returns Promise resolving to the current epoch number
   */
  async getEpoch (): Promise<bigint> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }

    return this.publicClient.readContract({
      address: this.contracts.stakeManagerAddress,
      abi: STAKE_MANAGER_ABI,
      functionName: 'epoch'
    })
  }

  /**
   * Signs a transaction using the provided signer.
   *
   * @param params - Parameters for the signing process
   * @param params.signer - A signer instance
   * @param params.signerAddress - The address of the signer
   * @param params.tx - The transaction to sign
   * @param params.baseFeeMultiplier - (Optional) The multiplier for fees, which is used to manage fee fluctuations, is applied to the base fee per gas from the latest block to determine the final `maxFeePerGas`. The default value is 1.2
   * @param params.defaultPriorityFee - (Optional) This overrides the `maxPriorityFeePerGas` estimated by the RPC
   *
   * @returns A promise that resolves to an object containing the signed transaction
   */
  async sign (params: {
    signer: Signer
    signerAddress: Address
    tx: Transaction
    baseFeeMultiplier?: number
    defaultPriorityFee?: string
  }): Promise<{ signedTx: Hex }> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }

    const { signer, signerAddress, tx, baseFeeMultiplier, defaultPriorityFee } = params

    const baseChain = this.chain
    const baseFees = baseChain.fees ?? {}
    const fees = {
      ...baseFees,
      baseFeeMultiplier: baseFeeMultiplier ?? baseFees.baseFeeMultiplier,
      defaultPriorityFee:
        defaultPriorityFee === undefined ? baseFees.maxPriorityFeePerGas : parseEther(defaultPriorityFee)
    }

    const chain: Chain = {
      ...baseChain,
      fees
    }

    const client = createWalletClient({
      chain,
      transport: http(),
      account: signerAddress
    })

    const request = await client.prepareTransactionRequest({
      chain: undefined,
      account: signerAddress,
      to: tx.to,
      value: tx.value,
      data: tx.data,
      type: 'eip1559',
      ...(tx.accessList && { accessList: tx.accessList })
    })

    const message = keccak256(serializeTransaction(request)).slice(2)
    const data = { tx }

    const { sig } = await signer.sign(signerAddress.toLowerCase().slice(2), { message, data }, {})

    const signature = {
      r: `0x${sig.r}` as const,
      s: `0x${sig.s}` as const,
      v: sig.v ? 28n : 27n,
      yParity: sig.v
    }

    const signedTx = serializeTransaction(request, signature)

    return { signedTx }
  }

  /**
   * Broadcasts a signed transaction to the network.
   *
   * @param params - Parameters for the broadcast process
   * @param params.signedTx - The signed transaction to broadcast
   *
   * @returns A promise that resolves to the transaction hash
   */
  async broadcast (params: { signedTx: Hex }): Promise<{ txHash: Hex }> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }

    const { signedTx } = params
    const hash = await this.publicClient.sendRawTransaction({ serializedTransaction: signedTx })
    return { txHash: hash }
  }

  /**
   * Retrieves the status of a transaction using the transaction hash.
   *
   * @param params - Parameters for the transaction status request
   * @param params.txHash - The transaction hash to query
   *
   * @returns A promise that resolves to an object containing the transaction status
   */
  async getTxStatus (params: { txHash: Hex }): Promise<PolygonTxStatus> {
    if (!this.publicClient) {
      throw new Error('PolygonStaker not initialized, call init() to initialize')
    }

    const { txHash } = params

    try {
      const tx = await this.publicClient.getTransactionReceipt({
        hash: txHash
      })

      if (tx.status === 'reverted') {
        return { status: 'failure', receipt: tx }
      }

      return { status: 'success', receipt: tx }
    } catch (e) {
      return {
        status: 'unknown',
        receipt: null
      }
    }
  }

  private parseAmount (amount: string): bigint {
    if (typeof amount === 'bigint') {
      throw new Error(
        'Amount must be a string, denominated in POL. e.g. "1.5" - 1.5 POL. You can use `formatEther` to convert a `bigint` to a string'
      )
    }
    if (typeof amount !== 'string') {
      throw new Error('Amount must be a string, denominated in POL. e.g. "1.5" - 1.5 POL.')
    }
    if (amount === '') throw new Error('Amount cannot be empty')

    let result: bigint
    try {
      result = parseEther(amount)
    } catch (e) {
      throw new Error('Amount must be a valid number denominated in POL. e.g. "1.5" - 1.5 POL')
    }

    if (result <= 0n) throw new Error('Amount must be greater than 0')
    return result
  }
}
