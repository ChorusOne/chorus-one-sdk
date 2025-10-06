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
  DelegateOptions,
  CompoundOptions,
  WithdrawOptions,
  ClaimRewardsOptions,
  UndelegateOptions,
  DelegatorInfo,
  WithdrawalRequestInfo,
  EpochInfo
} from './types'
import { isValidValidatorId, isValidWithdrawalId } from './utils'
import { MONAD_STAKING_ABI, MONAD_STAKING_CONTRACT_ADDRESS } from './constants'

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

  /**
   * Creates a MonadStaker instance
   *
   * @param params - Initialization configuration
   * @param params.rpcUrl - The URL of the Monad network RPC endpoint
   * @param params.contractAddress - Staking contract address (optional, defaults to 0x0000000000000000000000000000000000001000)
   *
   * @returns An instance of MonadStaker
   */
  constructor (params: MonadNetworkConfig) {
    this.rpcUrl = params.rpcUrl
    this.contractAddress = params.contractAddress ?? MONAD_STAKING_CONTRACT_ADDRESS
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

    await this.publicClient.getBlockNumber()
  }

  /**
   * Builds a delegation transaction
   *
   * Stake becomes active in epoch n+1 (if before boundary block) or epoch n+2 (if after).
   *
   * @param params - Parameters for building the transaction
   * @param params.validatorId - Unique identifier (uint64) for the validator. Assigned when validator joined the network.
   * @param params.amount - The amount to delegate in MON (will be converted to wei internally)
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
   * Stake becomes inactive in epoch n+1 or n+2, then moves to pending state for WITHDRAWAL_DELAY epochs (1 epoch).
   * After delay, call withdraw() to claim funds back to your wallet.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address that will receive funds after withdrawal
   * @param params.validatorId - Unique identifier for the validator to undelegate from
   * @param params.amount - The amount to undelegate in MON (will be converted to wei internally)
   * @param params.withdrawalId - User-chosen ID (0-255) to track this withdrawal request. Allows up to 256 concurrent withdrawals per (validator,delegator) tuple. Can be reused after calling withdraw().
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

    const existingRequest = await this.getWithdrawalRequest({
      validatorId,
      delegatorAddress,
      withdrawalId
    })

    if (existingRequest.withdrawalAmount > 0n) {
      throw new Error(`Withdrawal request ID ${withdrawalId} already exists for this validator`)
    }

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
   * Completes an undelegation by claiming the tokens back to your wallet.
   * Can only be executed once current epoch >= withdrawEpoch (check via getWithdrawalRequest).
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address that will receive the funds
   * @param params.validatorId - Unique identifier for the validator you undelegated from
   * @param params.withdrawalId - The same ID (0-255) you used when calling undelegate. After successful withdrawal, this ID becomes available for reuse.
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
      to: this.contractAddress,
      data,
      value: 0n
    }
  }

  /**
   * Builds a compound rewards transaction
   *
   * Converts accumulated unclaimedRewards into additional stake (auto-restaking).
   * The compounded amount becomes active in epoch n+1 or n+2 (same timing as delegate).
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address
   * @param params.validatorId - Unique identifier for the validator to compound rewards for
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
   * Claims accumulated unclaimedRewards and sends them to your wallet (not auto-restaked like compound).
   * Rewards are available immediately after the transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address that will receive the rewards
   * @param params.validatorId - Unique identifier for the validator to claim rewards from
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
      throw new Error('MonadStaker not initialized. Did you forget to call init()?')
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
   * Use this to check if your undelegated tokens are ready to withdraw.
   *
   * @param params - Parameters for the query
   * @param params.validatorId - Unique identifier for the validator you undelegated from
   * @param params.delegatorAddress - Address that initiated the undelegation
   * @param params.withdrawalId - The ID (0-255) you assigned when calling undelegate
   *
   * @returns Promise resolving to withdrawal information:
   *   - withdrawalAmount: Amount in wei that will be returned when you call withdraw (0 if no request exists)
   *   - accRewardPerToken: Validator's accumulator value when undelegate was called (used for reward calculations)
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
      throw new Error('MonadStaker not initialized. Did you forget to call init()?')
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
