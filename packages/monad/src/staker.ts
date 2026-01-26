import {
  createPublicClient,
  http,
  getContract,
  encodeFunctionData,
  parseEther,
  formatEther,
  isAddress,
  keccak256,
  serializeTransaction,
  createWalletClient,
  type PublicClient,
  type Address,
  type Hex,
  type Chain,
  type GetContractReturnType
} from 'viem'
import { secp256k1 } from '@noble/curves/secp256k1'
import type { Signer } from '@chorus-one/signer'
import type { DelegatorInfo, WithdrawalRequestInfo, EpochInfo, Transaction, MonadTxStatus } from './types.d'
import { isValidValidatorId, isValidWithdrawalId } from './utils'
import { buildReferrerTracking } from './referrer'
import { MONAD_STAKING_ABI, MONAD_STAKING_CONTRACT_ADDRESS } from './constants'

/**
 * MonadStaker - TypeScript SDK for Monad blockchain staking operations
 *
 * This class provides the functionality to stake, unstake, compound rewards,
 * claim rewards, and withdraw for Monad blockchain.
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
export class MonadStaker {
  private readonly rpcUrl: string
  private publicClient?: PublicClient
  private contract?: GetContractReturnType<typeof MONAD_STAKING_ABI, PublicClient>
  private readonly contractAddress: Address // Monad staking precompile - same across all networks
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
      const point = secp256k1.Point.fromHex(publicKey)
      const pkUncompressed = point.toBytes(false)
      const hash = keccak256(pkUncompressed.subarray(1))
      const ethAddress = hash.slice(-40)
      return [ethAddress]
    }

  /**
   * Creates a MonadStaker instance
   *
   * @param params - Initialization configuration
   * @param params.rpcUrl - The URL of the Monad network RPC endpoint
   *
   * @returns An instance of MonadStaker
   */
  constructor (params: { rpcUrl: string }) {
    this.rpcUrl = params.rpcUrl
    this.contractAddress = MONAD_STAKING_CONTRACT_ADDRESS
  }

  /**
   * Initializes the MonadStaker instance and connects to the blockchain
   *
   * @returns A promise which resolves once the MonadStaker instance has been initialized
   */
  async init (): Promise<void> {
    const tempClient = createPublicClient({
      transport: http(this.rpcUrl)
    })

    const chainId = await tempClient.getChainId()

    this.chain = {
      id: chainId,
      name: 'Monad',
      nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
      rpcUrls: {
        default: { http: [this.rpcUrl] },
        public: { http: [this.rpcUrl] }
      }
    }

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(this.rpcUrl)
    })

    this.contract = getContract({
      address: this.contractAddress,
      abi: MONAD_STAKING_ABI,
      client: this.publicClient
    })
  }

  /**
   * Builds a staking transaction
   *
   * Stake becomes active in epoch n+1 (if before boundary block) or epoch n+2 (if after).
   *
   * @param params - Parameters for building the transaction
   * @param params.validatorId - Unique identifier (uint64) for the validator. Assigned when validator joined the network.
   * @param params.amount - The amount to stake in MON (will be converted to wei internally)
   * @param params.referrer - (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding.
   *
   * @returns Returns a promise that resolves to a Monad staking transaction
   *
   * @remarks
   * The returned transaction includes an EIP-2930 access list for referrer tracking.
   * Some wallets (e.g., Phantom) do not support this. See the class documentation for a fallback pattern.
   */
  async buildStakeTx (params: { validatorId: number; amount: string; referrer?: Hex }): Promise<{ tx: Transaction }> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized, call init() to initialize')
    }
    const { validatorId, amount, referrer } = params

    if (!isValidValidatorId(validatorId)) {
      throw new Error(`Invalid validator ID: ${validatorId}`)
    }

    const amountWei = this.parseMonad(amount)

    const data = encodeFunctionData({
      abi: MONAD_STAKING_ABI,
      functionName: 'delegate',
      args: [BigInt(validatorId)]
    })

    return {
      tx: {
        to: this.contractAddress,
        data,
        value: amountWei,
        accessList: buildReferrerTracking(referrer)
      }
    }
  }

  /**
   * Builds an unstaking transaction
   *
   * Creates a withdrawal request to unstake tokens from a validator.
   * Stake becomes inactive in epoch n+1 or n+2, then moves to pending state for WITHDRAWAL_DELAY epochs (1 epoch).
   * After delay, call buildWithdrawTx() to claim funds back to your wallet.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address that will receive funds after withdrawal
   * @param params.validatorId - Unique identifier for the validator to unstake from
   * @param params.amount - The amount to unstake in MON (will be converted to wei internally)
   * @param params.withdrawalId - User-chosen ID (0-255) to track this withdrawal request. Allows up to 256 concurrent withdrawals per (validator,delegator) tuple. Can be reused after calling withdraw().
   * @param params.referrer - (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding.
   *
   * @returns Returns a promise that resolves to a Monad unstaking transaction
   */
  async buildUnstakeTx (params: {
    delegatorAddress: Address
    validatorId: number
    amount: string
    withdrawalId: number
    referrer?: Hex
  }): Promise<{ tx: Transaction }> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized, call init() to initialize')
    }
    const { delegatorAddress, validatorId, amount, withdrawalId, referrer } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isValidValidatorId(validatorId)) {
      throw new Error(`Invalid validator ID: ${validatorId}`)
    }
    if (!isValidWithdrawalId(withdrawalId)) {
      throw new Error(`Invalid withdrawal ID: ${withdrawalId}. Must be 0-255.`)
    }

    const existingRequest = await this.getWithdrawalRequest({
      validatorId,
      delegatorAddress,
      withdrawalId
    })

    if (existingRequest.withdrawalAmount > 0n) {
      throw new Error(`Withdrawal request ID ${withdrawalId} already exists for this validator`)
    }

    const delegatorInfo = await this.getDelegator({ validatorId, delegatorAddress })
    const amountWei = this.parseMonad(amount)

    if (delegatorInfo.stake < amountWei) {
      throw new Error(`Insufficient stake. Current: ${formatEther(delegatorInfo.stake)} MON, Requested: ${amount} MON`)
    }

    const data = encodeFunctionData({
      abi: MONAD_STAKING_ABI,
      functionName: 'undelegate',
      args: [BigInt(validatorId), amountWei, withdrawalId]
    })

    return {
      tx: {
        to: this.contractAddress,
        data,
        value: 0n,
        accessList: buildReferrerTracking(referrer)
      }
    }
  }

  /**
   * Builds a withdraw transaction
   *
   * Completes an unstaking by claiming the tokens back to your wallet.
   * Can only be executed once current epoch >= withdrawEpoch (check via getWithdrawalRequest).
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address that will receive the funds
   * @param params.validatorId - Unique identifier for the validator you unstaked from
   * @param params.withdrawalId - The same ID (0-255) you used when calling buildUnstakeTx. After successful withdrawal, this ID becomes available for reuse.
   * @param params.referrer - (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding.
   *
   * @returns Returns a promise that resolves to a Monad withdrawal transaction
   */
  async buildWithdrawTx (params: {
    delegatorAddress: Address
    validatorId: number
    withdrawalId: number
    referrer?: Hex
  }): Promise<{ tx: Transaction }> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized, call init() to initialize')
    }
    const { delegatorAddress, validatorId, withdrawalId, referrer } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isValidValidatorId(validatorId)) {
      throw new Error(`Invalid validator ID: ${validatorId}`)
    }
    if (!isValidWithdrawalId(withdrawalId)) {
      throw new Error(`Invalid withdrawal ID: ${withdrawalId}`)
    }

    const withdrawalRequest = await this.getWithdrawalRequest({
      validatorId,
      delegatorAddress,
      withdrawalId
    })

    if (withdrawalRequest.withdrawalAmount === 0n) {
      throw new Error(`No withdrawal request found for ID ${withdrawalId}`)
    }

    const currentEpoch = await this.getEpoch()
    if (currentEpoch.epoch < withdrawalRequest.withdrawEpoch) {
      throw new Error(
        `Withdrawal not ready. Current epoch: ${currentEpoch.epoch}, Withdrawal epoch: ${withdrawalRequest.withdrawEpoch}`
      )
    }

    const data = encodeFunctionData({
      abi: MONAD_STAKING_ABI,
      functionName: 'withdraw',
      args: [BigInt(validatorId), withdrawalId]
    })

    return {
      tx: {
        to: this.contractAddress,
        data,
        value: 0n,
        accessList: buildReferrerTracking(referrer)
      }
    }
  }

  /**
   * Builds a compound rewards transaction
   *
   * Converts accumulated unclaimedRewards into additional stake (auto-restaking).
   * The compounded amount becomes active in epoch n+1 or n+2 (same timing as staking).
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address
   * @param params.validatorId - Unique identifier for the validator to compound rewards for
   * @param params.referrer - (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding.
   *
   * @returns Returns a promise that resolves to a Monad compound transaction
   */
  async buildCompoundTx (params: {
    delegatorAddress: Address
    validatorId: number
    referrer?: Hex
  }): Promise<{ tx: Transaction }> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized, call init() to initialize')
    }
    const { delegatorAddress, validatorId, referrer } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isValidValidatorId(validatorId)) {
      throw new Error(`Invalid validator ID: ${validatorId}`)
    }

    const delegatorInfo = await this.getDelegator({ validatorId, delegatorAddress })
    if (delegatorInfo.unclaimedRewards === 0n) {
      throw new Error('No rewards available to compound')
    }

    const data = encodeFunctionData({
      abi: MONAD_STAKING_ABI,
      functionName: 'compound',
      args: [BigInt(validatorId)]
    })

    return {
      tx: {
        to: this.contractAddress,
        data,
        value: 0n,
        accessList: buildReferrerTracking(referrer)
      }
    }
  }

  /**
   * Builds a claim rewards transaction
   *
   * Claims accumulated unclaimedRewards and sends them to your wallet (not auto-restaked like compound).
   * Rewards are available immediately after the transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address that will receive the rewards
   * @param params.validatorId - Unique identifier for the validator to claim rewards from
   * @param params.referrer - (Optional) Custom 32-byte hex string for tracking. If not provided, uses default Chorus One encoding.
   *
   * @returns Returns a promise that resolves to a Monad claim rewards transaction
   */
  async buildClaimRewardsTx (params: {
    delegatorAddress: Address
    validatorId: number
    referrer?: Hex
  }): Promise<{ tx: Transaction }> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized, call init() to initialize')
    }
    const { delegatorAddress, validatorId, referrer } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isValidValidatorId(validatorId)) {
      throw new Error(`Invalid validator ID: ${validatorId}`)
    }

    const delegatorInfo = await this.getDelegator({ validatorId, delegatorAddress })
    if (delegatorInfo.unclaimedRewards === 0n) {
      throw new Error('No rewards available to claim')
    }

    const data = encodeFunctionData({
      abi: MONAD_STAKING_ABI,
      functionName: 'claimRewards',
      args: [BigInt(validatorId)]
    })

    return {
      tx: {
        to: this.contractAddress,
        data,
        value: 0n,
        accessList: buildReferrerTracking(referrer)
      }
    }
  }

  // ========== QUERY METHODS ==========

  /**
   * Retrieves delegator information for a specific validator
   *
   * @param params - Parameters for the query
   * @param params.validatorId - Unique identifier for the validator
   * @param params.delegatorAddress - Ethereum address of the delegator to query
   *
   * @returns Promise resolving to delegator information including:
   *   - stake: Currently active stake earning rewards right now (in wei). Does NOT include pending activations.
   *   - accRewardPerToken: Last checked accumulator value (internal accounting, multiplied by 1e36)
   *   - unclaimedRewards: Rewards earned but not yet claimed or compounded (in wei)
   *   - deltaStake: Pending stake activating at deltaEpoch (submitted before boundary block, in wei)
   *   - nextDeltaStake: Pending stake activating at nextDeltaEpoch (submitted after boundary block, in wei)
   *   - deltaEpoch: Epoch number when deltaStake becomes active
   *   - nextDeltaEpoch: Epoch number when nextDeltaStake becomes active
   *
   * Note: Two pending slots exist because stakes before boundary block activate in epoch n+1 (deltaStake),
   * while stakes after boundary block activate in epoch n+2 (nextDeltaStake).
   */
  async getDelegator (params: { validatorId: number; delegatorAddress: Address }): Promise<DelegatorInfo> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized, call init() to initialize')
    }
    const { validatorId, delegatorAddress } = params

    // @ts-expect-error - getDelegator is marked as nonpayable in precompile ABI but is actually a read function
    const result = await this.contract.read.getDelegator([BigInt(validatorId), delegatorAddress])

    return {
      stake: result[0],
      accRewardPerToken: result[1],
      unclaimedRewards: result[2],
      deltaStake: result[3],
      nextDeltaStake: result[4],
      deltaEpoch: result[5],
      nextDeltaEpoch: result[6]
    }
  }

  /**
   * Retrieves withdrawal request information
   *
   * Use this to check if your unstaked tokens are ready to withdraw.
   *
   * @param params - Parameters for the query
   * @param params.validatorId - Unique identifier for the validator you unstaked from
   * @param params.delegatorAddress - Address that initiated the unstaking
   * @param params.withdrawalId - The ID (0-255) you assigned when calling buildUnstakeTx
   *
   * @returns Promise resolving to withdrawal information:
   *   - withdrawalAmount: Amount in wei that will be returned when you call withdraw (0 if no request exists)
   *   - accRewardPerToken: Validator's accumulator value when unstaking was initiated (used for reward calculations)
   *   - withdrawEpoch: Epoch number when funds become withdrawable. Compare with current epoch from getEpoch() to check if ready.
   *
   * To check if withdrawable: currentEpoch >= withdrawEpoch (get currentEpoch via getEpoch())
   */
  async getWithdrawalRequest (params: {
    validatorId: number
    delegatorAddress: Address
    withdrawalId: number
  }): Promise<WithdrawalRequestInfo> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized, call init() to initialize')
    }
    const { validatorId, delegatorAddress, withdrawalId } = params

    // @ts-expect-error - getWithdrawalRequest is marked as nonpayable in precompile ABI but is actually a read function
    const result = await this.contract.read.getWithdrawalRequest([BigInt(validatorId), delegatorAddress, withdrawalId])

    return {
      withdrawalAmount: result[0],
      accRewardPerToken: result[1],
      withdrawEpoch: result[2]
    }
  }

  /**
   * Retrieves current epoch information
   *
   * @returns Promise resolving to epoch timing information:
   *   - epoch: Current consensus epoch number. An epoch is ~5.5 hours on mainnet (50,000 blocks) during which the validator set remains unchanged.
   *   - inEpochDelayPeriod: Boolean indicating if we're past the "boundary block" (the last 10% of blocks in an epoch).
   *     false = stake changes activate in epoch n+1
   *     true = stake changes activate in epoch n+2
   */
  async getEpoch (): Promise<EpochInfo> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized, call init() to initialize')
    }

    // @ts-expect-error - getEpoch is marked as nonpayable in precompile ABI but is actually a read function
    const result = await this.contract.read.getEpoch()

    return {
      epoch: result[0],
      inEpochDelayPeriod: result[1]
    }
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
      throw new Error('MonadStaker not initialized, call init() to initialize')
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
      throw new Error('MonadStaker not initialized, call init() to initialize')
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
  async getTxStatus (params: { txHash: Hex }): Promise<MonadTxStatus> {
    if (!this.publicClient) {
      throw new Error('MonadStaker not initialized, call init() to initialize')
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

  /**
   * Internal method to parse and validate MON amount strings
   *
   * @param amount - Amount in MON (e.g., "1.5" for 1.5 MON)
   * @returns Amount in wei as bigint
   * @throws Error if amount is invalid
   */
  private parseMonad (amount: string): bigint {
    if (typeof amount === 'bigint') {
      throw new Error(
        'Amount must be a string, denominated in MON. e.g. "1.5" - 1.5 MON. You can use `formatEther` to convert a `bigint` to a string'
      )
    }
    if (typeof amount !== 'string') {
      throw new Error('Amount must be a string, denominated in MON. e.g. "1.5" - 1.5 MON.')
    }
    if (amount === '') throw new Error('Amount cannot be empty')

    let result: bigint
    try {
      result = parseEther(amount)
    } catch (e) {
      throw new Error('Amount must be a valid number denominated in MON. e.g. "1.5" - 1.5 MON')
    }

    if (result <= 0n) throw new Error('Amount must be greater than 0')
    return result
  }
}
