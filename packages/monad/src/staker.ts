import {
  createPublicClient,
  http,
  getContract,
  encodeFunctionData,
  parseEther,
  formatEther,
  isAddress,
  type PublicClient,
  type Address,
  type Hex,
  type Chain,
  type GetContractReturnType
} from 'viem'
import type {
  MonadNetworkConfig,
  MonadTimingConfig,
  DelegateOptions,
  CompoundOptions,
  WithdrawOptions,
  ClaimRewardsOptions,
  UndelegateOptions,
  ValidatorInfo,
  DelegatorInfo,
  WithdrawalRequestInfo,
  EpochInfo,
  PendingActivation
} from './types'
import { isValidValidatorId, isValidWithdrawalId, calculateActivationTiming, calculateWithdrawalTiming } from './utils'
import { MONAD_STAKING_ABI, MONAD_NETWORKS } from './constants'

/**
 * MonadStaker - TypeScript SDK for Monad blockchain staking operations
 *
 * This class provides the functionality to delegate, undelegate, compound rewards,
 * claim rewards, and withdraw for Monad blockchain.
 *
 * Built with viem for type-safety and modern patterns.
 */
export class MonadStaker {
  private readonly rpcUrl: string
  private publicClient?: PublicClient
  private contract?: GetContractReturnType<typeof MONAD_STAKING_ABI, PublicClient>
  private readonly contractAddress: Address
  private chain!: Chain
  private readonly timing: Required<MonadTimingConfig>

  /**
   * Creates a MonadStaker instance
   *
   * @param params - Initialization configuration
   * @param params.rpcUrl - The URL of the Monad network RPC endpoint
   * @param params.contractAddress - Staking contract address
   * @param params.network - Network identifier (defaults to 'mainnet')
   * @param params.timing - Optional timing configuration (overrides network defaults)
   *
   * @returns An instance of MonadStaker
   */
  constructor (params: MonadNetworkConfig) {
    this.rpcUrl = params.rpcUrl
    this.contractAddress = params.contractAddress

    // Get network config (default to mainnet)
    const networkConfig = MONAD_NETWORKS[params.network ?? 'mainnet']

    // Apply timing configuration (user override > network defaults)
    this.timing = {
      blocksPerEpoch: params.timing?.blocksPerEpoch ?? networkConfig.timing.blocksPerEpoch,
      epochDelayPeriod: params.timing?.epochDelayPeriod ?? networkConfig.timing.epochDelayPeriod,
      blockTimeSeconds: params.timing?.blockTimeSeconds ?? networkConfig.timing.blockTimeSeconds
    }
  }

  /**
   * Initializes the MonadStaker instance and connects to the blockchain
   *
   * @returns A promise which resolves once the MonadStaker instance has been initialized
   */
  async init (): Promise<void> {
    // Create temporary client to fetch chain ID
    const tempClient = createPublicClient({
      transport: http(this.rpcUrl)
    })

    const chainId = await tempClient.getChainId()

    // Define Monad chain with fetched chain ID
    this.chain = {
      id: chainId,
      name: 'Monad',
      nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
      rpcUrls: {
        default: { http: [this.rpcUrl] },
        public: { http: [this.rpcUrl] }
      }
    }

    // Create public client with chain
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(this.rpcUrl)
    })

    // Create contract instance
    this.contract = getContract({
      address: this.contractAddress,
      abi: MONAD_STAKING_ABI,
      client: this.publicClient
    })

    // Verify connection
    await this.publicClient.getBlockNumber()
  }

  /**
   * Builds a delegation transaction
   *
   * @param params - Parameters for building the transaction
   * @param params.validatorId - The validator ID to delegate to
   * @param params.amount - The amount to delegate in MON
   *
   * @returns Returns a promise that resolves to a transaction object for viem's sendTransaction
   */
  async buildDelegateTx (params: DelegateOptions): Promise<{ to: Address; data: Hex; value: bigint }> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized. Did you forget to call init()?')
    }
    const { validatorId, amount } = params

    if (!isValidValidatorId(validatorId)) {
      throw new Error(`Invalid validator ID: ${validatorId}`)
    }

    const amountWei = parseEther(amount)

    const data = encodeFunctionData({
      abi: MONAD_STAKING_ABI,
      functionName: 'delegate',
      args: [BigInt(validatorId)]
    })

    return {
      to: this.contractAddress,
      data,
      value: amountWei
    }
  }

  /**
   * Builds an undelegation transaction
   *
   * Creates a withdrawal request to undelegate tokens from a validator.
   * Tokens become available for withdrawal after the epoch delay.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address
   * @param params.validatorId - The validator ID to undelegate from
   * @param params.amount - The amount to undelegate in MON
   * @param params.withdrawalId - Withdrawal request ID (0-255)
   *
   * @returns Returns a promise that resolves to a transaction object for viem's sendTransaction
   */
  async buildUndelegateTx (params: UndelegateOptions): Promise<{ to: Address; data: Hex; value: bigint }> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized. Did you forget to call init()?')
    }
    const { delegatorAddress, validatorId, amount, withdrawalId } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isValidValidatorId(validatorId)) {
      throw new Error(`Invalid validator ID: ${validatorId}`)
    }
    if (!isValidWithdrawalId(withdrawalId)) {
      throw new Error(`Invalid withdrawal ID: ${withdrawalId}. Must be 0-255.`)
    }

    // Check if withdrawal request already exists
    const existingRequest = await this.getWithdrawalRequest({
      validatorId,
      delegatorAddress,
      withdrawalId
    })

    if (existingRequest.withdrawalAmount > 0n) {
      throw new Error(`Withdrawal request ID ${withdrawalId} already exists for this validator`)
    }

    // Check delegator has sufficient stake
    const delegatorInfo = await this.getDelegator({ validatorId, delegatorAddress })
    const amountWei = parseEther(amount)

    if (delegatorInfo.stake < amountWei) {
      throw new Error(`Insufficient stake. Current: ${formatEther(delegatorInfo.stake)} MON, Requested: ${amount} MON`)
    }

    const data = encodeFunctionData({
      abi: MONAD_STAKING_ABI,
      functionName: 'undelegate',
      args: [BigInt(validatorId), amountWei, withdrawalId]
    })

    return {
      to: this.contractAddress,
      data,
      value: 0n
    }
  }

  /**
   * Builds a withdraw transaction
   *
   * Withdraws tokens from a completed undelegation request.
   * Can only be executed after the withdrawal epoch has passed.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address
   * @param params.validatorId - The validator ID
   * @param params.withdrawalId - Withdrawal request ID to withdraw from
   *
   * @returns Returns a promise that resolves to a transaction object for viem's sendTransaction
   */
  async buildWithdrawTx (params: WithdrawOptions): Promise<{ to: Address; data: Hex; value: bigint }> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized. Did you forget to call init()?')
    }
    const { delegatorAddress, validatorId, withdrawalId } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isValidValidatorId(validatorId)) {
      throw new Error(`Invalid validator ID: ${validatorId}`)
    }
    if (!isValidWithdrawalId(withdrawalId)) {
      throw new Error(`Invalid withdrawal ID: ${withdrawalId}`)
    }

    // Verify withdrawal request exists
    const withdrawalRequest = await this.getWithdrawalRequest({
      validatorId,
      delegatorAddress,
      withdrawalId
    })

    if (withdrawalRequest.withdrawalAmount === 0n) {
      throw new Error(`No withdrawal request found for ID ${withdrawalId}`)
    }

    // Check if withdrawal is ready (epoch check)
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
      to: this.contractAddress,
      data,
      value: 0n
    }
  }

  /**
   * Builds a compound rewards transaction
   *
   * Automatically restakes accumulated rewards as additional delegation.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address
   * @param params.validatorId - The validator ID to compound rewards for
   *
   * @returns Returns a promise that resolves to a transaction object for viem's sendTransaction
   */
  async buildCompoundTx (params: CompoundOptions): Promise<{ to: Address; data: Hex; value: bigint }> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized. Did you forget to call init()?')
    }
    const { delegatorAddress, validatorId } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isValidValidatorId(validatorId)) {
      throw new Error(`Invalid validator ID: ${validatorId}`)
    }

    // Check if there are rewards to compound
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
      to: this.contractAddress,
      data,
      value: 0n
    }
  }

  /**
   * Builds a claim rewards transaction
   *
   * Claims accumulated staking rewards to the delegator's address.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address
   * @param params.validatorId - The validator ID to claim rewards from
   *
   * @returns Returns a promise that resolves to a transaction object for viem's sendTransaction
   */
  async buildClaimRewardsTx (params: ClaimRewardsOptions): Promise<{ to: Address; data: Hex; value: bigint }> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized. Did you forget to call init()?')
    }
    const { delegatorAddress, validatorId } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isValidValidatorId(validatorId)) {
      throw new Error(`Invalid validator ID: ${validatorId}`)
    }

    // Check if there are rewards to claim
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
      to: this.contractAddress,
      data,
      value: 0n
    }
  }

  // ========== QUERY METHODS ==========

  /**
   * Retrieves validator information
   *
   * @param params - Parameters for the query
   * @param params.validatorId - Validator ID to query
   *
   * @returns Promise resolving to validator information
   */
  async getValidator (params: { validatorId: number }): Promise<ValidatorInfo> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized. Did you forget to call init()?')
    }
    const { validatorId } = params

    const result = await this.contract.read.getValidator([BigInt(validatorId)])

    return {
      authAddress: result[0],
      flags: result[1],
      stake: result[2],
      accRewardPerToken: result[3],
      commission: result[4],
      unclaimedRewards: result[5],
      consensusStake: result[6],
      consensusCommission: result[7],
      snapshotStake: result[8],
      snapshotCommission: result[9],
      secpPubKey: result[10],
      blsPubKey: result[11]
    }
  }

  /**
   * Retrieves delegator information for a specific validator
   *
   * @param params - Parameters for the query
   * @param params.validatorId - Validator ID
   * @param params.delegatorAddress - Delegator address
   *
   * @returns Promise resolving to delegator information with activation timing
   */
  async getDelegator (params: { validatorId: number; delegatorAddress: Address }): Promise<DelegatorInfo> {
    if (!this.contract || !this.publicClient) {
      throw new Error('MonadStaker not initialized. Did you forget to call init()?')
    }
    const { validatorId, delegatorAddress } = params

    // Get current epoch info and block number for timing calculations
    const [epochInfo, currentBlock] = await Promise.all([
      this.getEpoch(),
      this.publicClient.getBlockNumber()
    ])

    // @ts-expect-error - getDelegator is marked as nonpayable in precompile ABI but is actually a read function
    const result = await this.contract.read.getDelegator([BigInt(validatorId), delegatorAddress])

    const deltaStake = result[3]
    const nextDeltaStake = result[4]
    const deltaEpoch = result[5]
    const nextDeltaEpoch = result[6]

    // Calculate pending activations
    const pendingActivations: PendingActivation[] = []

    if (deltaStake > 0n) {
      pendingActivations.push(
        calculateActivationTiming(
          deltaEpoch,
          epochInfo.epoch,
          currentBlock,
          deltaStake,
          this.timing.blocksPerEpoch,
          this.timing.epochDelayPeriod,
          this.timing.blockTimeSeconds
        )
      )
    }

    if (nextDeltaStake > 0n) {
      pendingActivations.push(
        calculateActivationTiming(
          nextDeltaEpoch,
          epochInfo.epoch,
          currentBlock,
          nextDeltaStake,
          this.timing.blocksPerEpoch,
          this.timing.epochDelayPeriod,
          this.timing.blockTimeSeconds
        )
      )
    }

    return {
      stake: result[0],
      accRewardPerToken: result[1],
      unclaimedRewards: result[2],
      deltaStake,
      nextDeltaStake,
      deltaEpoch,
      nextDeltaEpoch,
      pendingActivations
    }
  }

  /**
   * Retrieves withdrawal request information
   *
   * @param params - Parameters for the query
   * @param params.validatorId - Validator ID
   * @param params.delegatorAddress - Delegator address
   * @param params.withdrawalId - Withdrawal request ID
   *
   * @returns Promise resolving to withdrawal request information with timing
   */
  async getWithdrawalRequest (params: {
    validatorId: number
    delegatorAddress: Address
    withdrawalId: number
  }): Promise<WithdrawalRequestInfo> {
    if (!this.contract || !this.publicClient) {
      throw new Error('MonadStaker not initialized. Did you forget to call init()?')
    }
    const { validatorId, delegatorAddress, withdrawalId } = params

    // Get current epoch info and block number for timing calculations
    const [epochInfo, currentBlock] = await Promise.all([
      this.getEpoch(),
      this.publicClient.getBlockNumber()
    ])

    // @ts-expect-error - getWithdrawalRequest is marked as nonpayable in precompile ABI but is actually a read function
    const result = await this.contract.read.getWithdrawalRequest([BigInt(validatorId), delegatorAddress, withdrawalId])

    const withdrawalAmount = result[0]
    const accRewardPerToken = result[1]
    const withdrawEpoch = result[2]

    // Calculate withdrawal timing
    const withdrawalTiming = calculateWithdrawalTiming(
      withdrawEpoch,
      epochInfo.epoch,
      currentBlock,
      this.timing.blocksPerEpoch,
      this.timing.blockTimeSeconds
    )

    return {
      withdrawalAmount,
      accRewardPerToken,
      withdrawEpoch,
      ...withdrawalTiming
    }
  }

  /**
   * Retrieves current epoch information
   *
   * @returns Promise resolving to epoch information
   */
  private async getEpoch (): Promise<EpochInfo> {
    if (!this.contract) {
      throw new Error('MonadStaker not initialized. Did you forget to call init()?')
    }

    // @ts-expect-error - getEpoch is marked as nonpayable in precompile ABI but is actually a read function
    const result = await this.contract.read.getEpoch()

    return {
      epoch: result[0],
      inEpochDelayPeriod: result[1]
    }
  }
}
