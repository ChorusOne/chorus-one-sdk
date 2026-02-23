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
import type { Transaction, PolygonNetworkConfig, PolygonTxStatus, StakeInfo, UnbondInfo } from './types'
import { appendReferrerTracking } from './referrer'
import {
  VALIDATOR_SHARE_ABI,
  STAKE_MANAGER_ABI,
  NETWORK_CONTRACTS,
  EXCHANGE_RATE_PRECISION,
  EXCHANGE_RATE_HIGH_PRECISION,
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
 * **Referrer Tracking**
 *
 * Transaction builders that support referrer tracking (stake, unstake, claim rewards, compound)
 * append a tracking marker to the transaction calldata. The marker format is `c1c1` followed by
 * the first 3 bytes of the keccak256 hash of the referrer string. By default, `sdk-chorusone-staking`
 * is used as the referrer.
 *
 * To extract the referrer from on-chain transactions, look for the `c1c1` prefix in the trailing
 * bytes after the function calldata.
 */
const NETWORK_CHAINS: Record<PolygonNetworks, Chain> = {
  mainnet,
  testnet: sepolia
}

export class PolygonStaker {
  private readonly rpcUrl?: string
  private readonly contracts: NetworkContracts
  private readonly publicClient: PublicClient
  private readonly chain: Chain

  private withdrawalDelayCache: bigint | null = null
  private readonly validatorPrecisionCache: Map<Address, bigint> = new Map()

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
    this.rpcUrl = params.rpcUrl
    this.contracts = NETWORK_CONTRACTS[params.network]
    this.chain = NETWORK_CHAINS[params.network]
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(this.rpcUrl)
    })
  }

  /** @deprecated No longer required. Kept for backward compatibility. */
  async init (): Promise<void> {}

  /**
   * Builds a token approval transaction
   *
   * Approves the StakeManager contract to spend POL tokens on behalf of the delegator.
   * This must be called before staking if the current allowance is insufficient.
   *
   * @param params - Parameters for building the transaction
   * @param params.amount - The amount to approve in POL (will be converted to wei internally). Pass "max" for unlimited approval.
   *
   * @returns Returns a promise that resolves to an approval transaction
   */
  async buildApproveTx (params: { amount: string }): Promise<{ tx: Transaction }> {
    const { amount } = params

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
        value: 0n
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
   * @param params.amount - The amount to stake in POL
   * @param params.slippageBps - Slippage tolerance in basis points (e.g., 50 = 0.5%). Used to calculate minSharesToMint. Exactly one of `slippageBps` or `minSharesToMint` must be provided (not both, no default).
   * @param params.minSharesToMint - Minimum validator shares to receive. Exactly one of `slippageBps` or `minSharesToMint` must be provided (not both, no default).
   * @param params.referrer - (Optional) Custom referrer string for tracking. If not provided, uses 'sdk-chorusone-staking'.
   *
   * @returns Returns a promise that resolves to a Polygon staking transaction
   */
  async buildStakeTx (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    amount: string
    slippageBps?: number
    minSharesToMint?: bigint
    referrer?: string
  }): Promise<{ tx: Transaction }> {
    const { delegatorAddress, validatorShareAddress, amount, slippageBps, referrer } = params
    let { minSharesToMint } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isAddress(validatorShareAddress)) {
      throw new Error(`Invalid validator share address: ${validatorShareAddress}`)
    }
    if (slippageBps !== undefined && minSharesToMint !== undefined) {
      throw new Error('Cannot specify both slippageBps and minSharesToMint. Use one or the other.')
    }

    const amountWei = this.parseAmount(amount)

    const allowance = await this.getAllowance(delegatorAddress)
    if (parseEther(allowance) < amountWei) {
      throw new Error(
        `Insufficient POL allowance. Current: ${allowance}, Required: ${amount}. Call buildApproveTx() first.`
      )
    }

    if (slippageBps !== undefined) {
      const [exchangeRate, precision] = await Promise.all([
        this.getExchangeRate(validatorShareAddress),
        this.getExchangeRatePrecision(validatorShareAddress)
      ])
      const expectedShares = (amountWei * precision) / exchangeRate
      minSharesToMint = expectedShares - (expectedShares * BigInt(slippageBps)) / 10000n
    }

    if (minSharesToMint === undefined) {
      throw new Error('Either slippageBps or minSharesToMint must be provided')
    }

    const calldata = encodeFunctionData({
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'buyVoucherPOL',
      args: [amountWei, minSharesToMint]
    })

    return {
      tx: {
        to: validatorShareAddress,
        data: appendReferrerTracking(calldata, referrer),
        value: 0n
      }
    }
  }

  /**
   * Builds an unstaking transaction
   *
   * Creates an unbond request to unstake POL tokens from a validator.
   * After the unbonding period (~80 checkpoints, approximately 3-4 days), call buildWithdrawTx() to claim funds.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   * @param params.amount - The amount to unstake in POL (will be converted to wei internally)
   * @param params.slippageBps - Slippage tolerance in basis points (e.g., 50 = 0.5%). Used to calculate maximumSharesToBurn. Exactly one of `slippageBps` or `maximumSharesToBurn` must be provided (not both, no default).
   * @param params.maximumSharesToBurn - Maximum validator shares willing to burn. Exactly one of `slippageBps` or `maximumSharesToBurn` must be provided (not both, no default).
   * @param params.referrer - (Optional) Custom referrer string for tracking. If not provided, uses 'sdk-chorusone-staking'.
   *
   * @returns Returns a promise that resolves to a Polygon unstaking transaction
   */
  async buildUnstakeTx (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    amount: string
    slippageBps?: number
    maximumSharesToBurn?: bigint
    referrer?: string
  }): Promise<{ tx: Transaction }> {
    const { delegatorAddress, validatorShareAddress, amount, slippageBps, referrer } = params
    let { maximumSharesToBurn } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isAddress(validatorShareAddress)) {
      throw new Error(`Invalid validator share address: ${validatorShareAddress}`)
    }
    if (slippageBps !== undefined && maximumSharesToBurn !== undefined) {
      throw new Error('Cannot specify both slippageBps and maximumSharesToBurn. Use one or the other.')
    }

    const amountWei = this.parseAmount(amount)

    const stake = await this.getStake({ delegatorAddress, validatorShareAddress })
    if (parseEther(stake.balance) < amountWei) {
      throw new Error(`Insufficient stake. Current: ${stake.balance} POL, Requested: ${amount} POL`)
    }

    if (slippageBps !== undefined) {
      const precision = await this.getExchangeRatePrecision(validatorShareAddress)
      const expectedShares = (amountWei * precision) / stake.exchangeRate
      maximumSharesToBurn = expectedShares + (expectedShares * BigInt(slippageBps)) / 10000n
    }

    if (maximumSharesToBurn === undefined) {
      throw new Error('Either slippageBps or maximumSharesToBurn must be provided')
    }

    const calldata = encodeFunctionData({
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'sellVoucher_newPOL',
      args: [amountWei, maximumSharesToBurn]
    })

    return {
      tx: {
        to: validatorShareAddress,
        data: appendReferrerTracking(calldata, referrer),
        value: 0n
      }
    }
  }

  /**
   * Builds a withdraw transaction
   *
   * Claims unstaked POL tokens after the unbonding period has elapsed.
   * Use getUnbond() to check if the unbonding period is complete.
   *
   * Note: Each unstake creates a separate unbond with its own nonce (1, 2, 3, etc.).
   * Withdrawals must be done per-nonce. To withdraw all pending unbonds, iterate
   * through nonces from 1 to getUnbondNonce() and withdraw each eligible one.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator's address that will receive the funds
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   * @param params.unbondNonce - The specific unbond nonce to withdraw
   *
   * @returns Returns a promise that resolves to a Polygon withdrawal transaction
   */
  async buildWithdrawTx (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    unbondNonce: bigint
  }): Promise<{ tx: Transaction }> {
    const { delegatorAddress, validatorShareAddress, unbondNonce } = params

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

    const [currentEpoch, withdrawalDelay] = await Promise.all([this.getEpoch(), this.getWithdrawalDelay()])

    const requiredEpoch = unbond.withdrawEpoch + withdrawalDelay
    if (currentEpoch < requiredEpoch) {
      throw new Error(`Unbonding not complete. Current epoch: ${currentEpoch}, Required epoch: ${requiredEpoch}`)
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
        value: 0n
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
   * @param params.referrer - (Optional) Custom referrer string for tracking. If not provided, uses 'sdk-chorusone-staking'.
   *
   * @returns Returns a promise that resolves to a Polygon claim rewards transaction
   */
  async buildClaimRewardsTx (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    referrer?: string
  }): Promise<{ tx: Transaction }> {
    const { delegatorAddress, validatorShareAddress, referrer } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isAddress(validatorShareAddress)) {
      throw new Error(`Invalid validator share address: ${validatorShareAddress}`)
    }

    const rewards = await this.getLiquidRewards({ delegatorAddress, validatorShareAddress })
    if (parseEther(rewards) === 0n) {
      throw new Error('No rewards available to claim')
    }

    const calldata = encodeFunctionData({
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'withdrawRewardsPOL'
    })

    return {
      tx: {
        to: validatorShareAddress,
        data: appendReferrerTracking(calldata, referrer),
        value: 0n
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
   * @param params.referrer - (Optional) Custom referrer string for tracking. If not provided, uses 'sdk-chorusone-staking'.
   *
   * @returns Returns a promise that resolves to a Polygon compound transaction
   */
  async buildCompoundTx (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    referrer?: string
  }): Promise<{ tx: Transaction }> {
    const { delegatorAddress, validatorShareAddress, referrer } = params

    if (!isAddress(delegatorAddress)) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`)
    }
    if (!isAddress(validatorShareAddress)) {
      throw new Error(`Invalid validator share address: ${validatorShareAddress}`)
    }

    const rewards = await this.getLiquidRewards({ delegatorAddress, validatorShareAddress })
    if (parseEther(rewards) === 0n) {
      throw new Error('No rewards available to compound')
    }

    const calldata = encodeFunctionData({
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'restakePOL'
    })

    return {
      tx: {
        to: validatorShareAddress,
        data: appendReferrerTracking(calldata, referrer),
        value: 0n
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
   *   - balance: Total staked amount formatted in POL
   *   - shares: Total shares held by the delegator
   *   - exchangeRate: Current exchange rate between shares and POL
   */
  async getStake (params: { delegatorAddress: Address; validatorShareAddress: Address }): Promise<StakeInfo> {
    const { delegatorAddress, validatorShareAddress } = params

    const [balance, exchangeRate] = await this.publicClient.readContract({
      address: validatorShareAddress,
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'getTotalStake',
      args: [delegatorAddress]
    })

    const shares = await this.publicClient.readContract({
      address: validatorShareAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [delegatorAddress]
    })

    return { balance: formatEther(balance), shares, exchangeRate }
  }

  /**
   * Retrieves the latest unbond nonce for a delegator
   *
   * Each unstake operation creates a new unbond request with an incrementing nonce.
   * Nonces start at 1 and increment with each unstake.
   * Note: a nonce having existed does not mean it is still pending —
   * claimed unbonds are deleted, but the counter is never decremented.
   *
   * @param params - Parameters for the query
   * @param params.delegatorAddress - Ethereum address of the delegator
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   *
   * @returns Promise resolving to the latest unbond nonce (0n if no unstakes performed)
   */
  async getUnbondNonce (params: { delegatorAddress: Address; validatorShareAddress: Address }): Promise<bigint> {
    return this.publicClient.readContract({
      address: params.validatorShareAddress,
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'unbondNonces',
      args: [params.delegatorAddress]
    })
  }

  /**
   * Retrieves unbond request information for a specific nonce
   *
   * Use this to check the status of individual unbond requests.
   * For fetching multiple unbonds efficiently, use getUnbonds() instead.
   *
   * @param params - Parameters for the query
   * @param params.delegatorAddress - Ethereum address of the delegator
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   * @param params.unbondNonce - The specific unbond nonce to query (1, 2, 3, etc.)
   *
   * @returns Promise resolving to unbond information:
   *   - amount: Amount pending unbonding in POL
   *   - isWithdrawable: Whether the unbond can be withdrawn now
   *   - shares: Shares amount pending unbonding (0n if already withdrawn or doesn't exist)
   *   - withdrawEpoch: Epoch number when the unbond started
   */
  async getUnbond (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    unbondNonce: bigint
  }): Promise<UnbondInfo> {
    const { delegatorAddress, validatorShareAddress, unbondNonce } = params

    const [multicallResults, withdrawalDelay, precision] = await Promise.all([
      this.publicClient.multicall({
        contracts: [
          {
            address: validatorShareAddress,
            abi: VALIDATOR_SHARE_ABI,
            functionName: 'unbonds_new',
            args: [delegatorAddress, unbondNonce]
          },
          {
            address: this.contracts.stakeManagerAddress,
            abi: STAKE_MANAGER_ABI,
            functionName: 'epoch'
          },
          {
            address: validatorShareAddress,
            abi: VALIDATOR_SHARE_ABI,
            functionName: 'withdrawExchangeRate'
          }
        ]
      }),
      this.getWithdrawalDelay(),
      this.getExchangeRatePrecision(validatorShareAddress)
    ])

    const [unbondResult, epochResult, withdrawRateResult] = multicallResults

    if (
      unbondResult.status === 'failure' ||
      epochResult.status === 'failure' ||
      withdrawRateResult.status === 'failure'
    ) {
      throw new Error('Failed to fetch unbond information')
    }

    const [shares, withdrawEpoch] = unbondResult.result
    const currentEpoch = epochResult.result
    const withdrawExchangeRate = withdrawRateResult.result

    const amountWei = (shares * withdrawExchangeRate) / precision
    const amount = formatEther(amountWei)
    const isWithdrawable = shares > 0n && currentEpoch >= withdrawEpoch + withdrawalDelay

    return { amount, isWithdrawable, shares, withdrawEpoch }
  }

  /**
   * Retrieves unbond request information for multiple nonces efficiently
   *
   * This method batches all contract reads into a single RPC call, making it
   * much more efficient than calling getUnbond() multiple times.
   *
   * @param params - Parameters for the query
   * @param params.delegatorAddress - Ethereum address of the delegator
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   * @param params.unbondNonces - Array of unbond nonces to query (1, 2, 3, etc.)
   *
   * @returns Promise resolving to array of unbond information (same order as input nonces)
   */
  async getUnbonds (params: {
    delegatorAddress: Address
    validatorShareAddress: Address
    unbondNonces: bigint[]
  }): Promise<UnbondInfo[]> {
    const { delegatorAddress, validatorShareAddress, unbondNonces } = params

    if (unbondNonces.length === 0) {
      return []
    }

    const unbondContracts = unbondNonces.map((nonce) => ({
      address: validatorShareAddress,
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'unbonds_new' as const,
      args: [delegatorAddress, nonce] as const
    }))

    const [multicallResults, withdrawalDelay, precision] = await Promise.all([
      this.publicClient.multicall({
        contracts: [
          ...unbondContracts,
          {
            address: this.contracts.stakeManagerAddress,
            abi: STAKE_MANAGER_ABI,
            functionName: 'epoch' as const
          },
          {
            address: validatorShareAddress,
            abi: VALIDATOR_SHARE_ABI,
            functionName: 'withdrawExchangeRate' as const
          }
        ]
      }),
      this.getWithdrawalDelay(),
      this.getExchangeRatePrecision(validatorShareAddress)
    ])

    const epochResult = multicallResults[unbondNonces.length]
    const withdrawRateResult = multicallResults[unbondNonces.length + 1]

    if (epochResult.status === 'failure' || withdrawRateResult.status === 'failure') {
      throw new Error('Failed to fetch epoch or exchange rate')
    }

    const currentEpoch = epochResult.result as bigint
    const withdrawExchangeRate = withdrawRateResult.result as bigint

    return unbondNonces.map((nonce, index) => {
      const unbondResult = multicallResults[index]

      if (unbondResult.status === 'failure') {
        throw new Error(`Failed to fetch unbond for nonce ${nonce}`)
      }

      const [shares, withdrawEpoch] = unbondResult.result as [bigint, bigint]
      const amountWei = (shares * withdrawExchangeRate) / precision
      const amount = formatEther(amountWei)
      const isWithdrawable = shares > 0n && currentEpoch >= withdrawEpoch + withdrawalDelay

      return { amount, isWithdrawable, shares, withdrawEpoch }
    })
  }

  /**
   * Retrieves pending liquid rewards for a delegator
   *
   * @param params - Parameters for the query
   * @param params.delegatorAddress - Ethereum address of the delegator
   * @param params.validatorShareAddress - The validator's ValidatorShare contract address
   *
   * @returns Promise resolving to the pending rewards in POL
   */
  async getLiquidRewards (params: { delegatorAddress: Address; validatorShareAddress: Address }): Promise<string> {
    const rewards = await this.publicClient.readContract({
      address: params.validatorShareAddress,
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'getLiquidRewards',
      args: [params.delegatorAddress]
    })
    return formatEther(rewards)
  }

  /**
   * Retrieves the current POL allowance for the StakeManager contract
   *
   * @param ownerAddress - The token owner's address
   *
   * @returns Promise resolving to the current allowance in POL
   */
  async getAllowance (ownerAddress: Address): Promise<string> {
    const allowance = await this.publicClient.readContract({
      address: this.contracts.stakingTokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [ownerAddress, this.contracts.stakeManagerAddress]
    })
    return formatEther(allowance)
  }

  /**
   * Retrieves the current checkpoint epoch from the StakeManager
   *
   * @returns Promise resolving to the current epoch number
   */
  async getEpoch (): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contracts.stakeManagerAddress,
      abi: STAKE_MANAGER_ABI,
      functionName: 'epoch'
    })
  }

  /**
   * Retrieves the withdrawal delay from the StakeManager
   *
   * The withdrawal delay is the number of epochs that must pass after an unbond
   * request before the funds can be withdrawn (~80 checkpoints, approximately 3-4 days).
   *
   * @returns Promise resolving to the withdrawal delay in epochs
   */
  async getWithdrawalDelay (): Promise<bigint> {
    if (this.withdrawalDelayCache !== null) {
      return this.withdrawalDelayCache
    }

    const delay = await this.publicClient.readContract({
      address: this.contracts.stakeManagerAddress,
      abi: STAKE_MANAGER_ABI,
      functionName: 'withdrawalDelay'
    })

    this.withdrawalDelayCache = delay
    return delay
  }

  /**
   * Retrieves the exchange rate precision for a validator
   *
   * Foundation validators (ID < 8) use precision of 100, others use 10^29.
   *
   * @param validatorShareAddress - The validator's ValidatorShare contract address
   *
   * @returns Promise resolving to the precision constant
   */
  async getExchangeRatePrecision (validatorShareAddress: Address): Promise<bigint> {
    const cached = this.validatorPrecisionCache.get(validatorShareAddress)
    if (cached !== undefined) {
      return cached
    }

    const validatorId = await this.publicClient.readContract({
      address: validatorShareAddress,
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'validatorId'
    })

    const precision = validatorId < 8n ? EXCHANGE_RATE_PRECISION : EXCHANGE_RATE_HIGH_PRECISION
    this.validatorPrecisionCache.set(validatorShareAddress, precision)
    return precision
  }

  /**
   * Retrieves the current exchange rate for a validator
   *
   * @param validatorShareAddress - The validator's ValidatorShare contract address
   *
   * @returns Promise resolving to the exchange rate
   */
  private async getExchangeRate (validatorShareAddress: Address): Promise<bigint> {
    const [, exchangeRate] = await this.publicClient.readContract({
      address: validatorShareAddress,
      abi: VALIDATOR_SHARE_ABI,
      functionName: 'getTotalStake',
      args: [validatorShareAddress]
    })
    return exchangeRate
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
      transport: http(this.rpcUrl),
      account: signerAddress
    })

    const request = await client.prepareTransactionRequest({
      chain: undefined,
      account: signerAddress,
      to: tx.to,
      value: tx.value,
      data: tx.data,
      type: 'eip1559'
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
