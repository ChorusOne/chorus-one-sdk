import type { Signer } from '@chorus-one/signer'
import secp256k1 from 'secp256k1'
import { keccak256, hashTypedData, type Hex, type Address, TypedDataDefinition, parseUnits } from 'viem'
import type {
  HyperliquidChain,
  SignatureData,
  DepositToStakingAction,
  WithdrawFromStakingAction,
  DelegateAction,
  SpotSendAction,
  DelegatorSummaryRequest,
  DelegationsRequest,
  DelegatorRewardsRequest,
  DelegatorHistoryRequest,
  SpotBalancesRequest,
  ExchangeRequest,
  UnsignedTx
} from './types.d'
import { ActionType, BridgeActionType } from './types.d'
import { TESTNET_CHAIN_ID, MAINNET_API_URL, TESTNET_API_URL, MAINNET_CHAIN_ID, DECIMALS } from './constants'
import {
  ExchangeApiResponseSchema,
  DelegatorSummarySchema,
  DelegationsResponseSchema,
  StakingRewardsResponseSchema,
  DelegationHistoryResponseSchema,
  SpotBalancesResponseSchema,
  ValidatorAddressSchema,
  type DelegatorSummary,
  type Delegation,
  type StakingReward,
  type DelegationHistoryEvent,
  type SpotBalance,
  type ExchangeApiSuccessResponse
} from './schemas'

/**
 * Nonce manager for generating unique nonces for signing transactions.
 * Uses the current timestamp, and increments if the timestamp is not greater than the last nonce.
 * This prevents nonce collisions when multiple transactions are built in quick succession.
 */
class NonceManager {
  private lastNonce = 0

  getNonce (): number {
    let nonce = Date.now()
    if (nonce <= this.lastNonce) {
      nonce = ++this.lastNonce
    } else {
      this.lastNonce = nonce
    }
    return nonce
  }
}

/**
 * Request queue that ensures sequential execution of async functions.
 * Prevents network-level race conditions by forcing requests to execute in order.
 * This is critical for Hyperliquid's nonce-based transaction ordering, as concurrent
 * requests may arrive at the server out of order due to network timing variations.
 */
export class RequestQueue {
  private queue: Promise<unknown> = Promise.resolve()

  /**
   * Enqueues an async function to execute after all previous functions complete.
   * @param fn - The async function to execute
   * @returns Promise that resolves with fn's result
   */
  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const current = this.queue.then(() => fn())

    this.queue = current.catch(() => {})

    return current
  }
}

/**
 * HyperliquidStaker - TypeScript SDK for Hyperliquid staking operations
 *
 * This class provides the functionality to stake, delegate, and manage staking on Hyperliquid.
 * It uses the Hyperliquid REST API for both read and write operations, with EIP-712 signing for transactions.
 */
export class HyperliquidStaker {
  private readonly hyperliquidChain: HyperliquidChain
  private readonly signatureChainId: Hex
  private readonly apiUrl: string
  private readonly nonceManager = new NonceManager()
  private readonly requestQueue = new RequestQueue()

  /**
   * This **static** method is used to derive an address from a public key.
   *
   * It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.
   *
   * @returns Returns an array containing the derived address with '0x' prefix.
   */
  static getAddressDerivationFn =
    () =>
    async (publicKey: Uint8Array): Promise<Array<string>> => {
      const pkUncompressed = secp256k1.publicKeyConvert(publicKey, false)
      const hash = keccak256(pkUncompressed.subarray(1))
      const ethAddress = '0x' + hash.slice(-40)
      return [ethAddress]
    }

  /**
   * Creates a HyperliquidStaker instance.
   *
   * chain - The Hyperliquid chain to use ('Mainnet' or 'Testnet')
   *
   * @returns An instance of HyperliquidStaker.
   */
  constructor ({ chain }: { chain: HyperliquidChain }) {
    this.apiUrl = chain === 'Mainnet' ? MAINNET_API_URL : TESTNET_API_URL
    this.hyperliquidChain = chain
    this.signatureChainId = chain === 'Mainnet' ? MAINNET_CHAIN_ID : TESTNET_CHAIN_ID
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Makes a request to the Hyperliquid Info endpoint.
   * https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
   *
   * @param request - The request object
   * @param schema - Zod schema for runtime validation
   * @returns The response data
   */
  private async makeInfoRequest<T>(request: object, schema: { parse: (data: unknown) => T }): Promise<T> {
    const response = await fetch(`${this.apiUrl}/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Info request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    try {
      return schema.parse(data)
    } catch (error) {
      throw new Error(`Info request validation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Makes a request to the Hyperliquid Exchange endpoint.
   * https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint
   *
   * @param request - The exchange request object
   * @returns The response data
   */
  private async makeExchangeRequest (request: ExchangeRequest): Promise<ExchangeApiSuccessResponse> {
    const response = await fetch(`${this.apiUrl}/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Exchange request failed: ${response.status} ${response.statusText}`)
    }

    const rawData = await response.json()

    const validationResult = ExchangeApiResponseSchema.safeParse(rawData)
    if (!validationResult.success) {
      throw new Error(`Exchange response validation failed: ${validationResult.error.message}`)
    }

    const data = validationResult.data

    if (data.status === 'err') {
      throw new Error(`Exchange request error: ${data.response}`)
    }
    return data
  }

  // ============================================================================
  // Query Methods (Info Endpoint)
  // ============================================================================

  /**
   * Gets the staking summary for a delegator.
   *
   * @param params - Query parameters
   * @param params.delegatorAddress - The delegator's address
   *
   * @returns A promise that resolves to the delegator's staking summary,
   * including delegated and undelegated amounts
   */
  async getStakingSummary (params: { delegatorAddress: string }): Promise<DelegatorSummary> {
    const request: DelegatorSummaryRequest = {
      type: 'delegatorSummary',
      user: params.delegatorAddress
    }

    return await this.makeInfoRequest<DelegatorSummary>(request, DelegatorSummarySchema)
  }

  /**
   * Gets all active delegations for a delegator.
   *
   * @param params - Query parameters
   * @param params.delegatorAddress - The delegator's address
   *
   * @returns A promise that resolves to an array of active delegations
   */
  async getDelegations (params: { delegatorAddress: string }): Promise<Delegation[]> {
    const request: DelegationsRequest = {
      type: 'delegations',
      user: params.delegatorAddress
    }

    return await this.makeInfoRequest<Delegation[]>(request, DelegationsResponseSchema)
  }

  /**
   * Gets the staking rewards history for a delegator.
   *
   * @param params - Query parameters
   * @param params.delegatorAddress - The delegator's address
   *
   * @returns A promise that resolves to an array of staking rewards
   */
  async getDelegatorRewards (params: { delegatorAddress: string }): Promise<StakingReward[]> {
    const request: DelegatorRewardsRequest = {
      type: 'delegatorRewards',
      user: params.delegatorAddress
    }

    return await this.makeInfoRequest<StakingReward[]>(request, StakingRewardsResponseSchema)
  }

  /**
   * Gets the delegation history for a delegator.
   *
   * @param params - Query parameters
   * @param params.delegatorAddress - The delegator's address
   *
   * @returns A promise that resolves to an array of delegation history events
   */
  async getDelegatorHistory (params: { delegatorAddress: string }): Promise<DelegationHistoryEvent[]> {
    const request: DelegatorHistoryRequest = {
      type: 'delegatorHistory',
      user: params.delegatorAddress
    }

    return await this.makeInfoRequest<DelegationHistoryEvent[]>(request, DelegationHistoryResponseSchema)
  }

  /**
   * Gets the spot account balances for a user.
   *
   * @param params - Query parameters
   * @param params.delegatorAddress - The user's address
   *
   * @returns A promise that resolves to an array of spot balances for different assets(e.g. HYPE, USDC)
   */
  async getSpotBalances (params: { delegatorAddress: string }): Promise<{ balances: SpotBalance[] }> {
    const request: SpotBalancesRequest = {
      type: 'spotClearinghouseState',
      user: params.delegatorAddress
    }

    return await this.makeInfoRequest<{ balances: SpotBalance[] }>(request, SpotBalancesResponseSchema)
  }

  // ============================================================================
  // Transaction Builder Methods
  // ============================================================================

  /**
   * Builds a transaction to move tokens from spot account to staking balance.
   *
   * @param params - Transaction parameters
   * @param params.amount - Amount to deposit in HYPE (e.g., "1.5")
   *
   * @returns Returns a promise that resolves to a DepositToStakingAction
   */
  async buildSpotToStakingTx (params: { amount: string }): Promise<{ tx: UnsignedTx }> {
    const wei = Number(parseUnits(params.amount, DECIMALS))

    const action: DepositToStakingAction = {
      type: ActionType.C_DEPOSIT,
      hyperliquidChain: this.hyperliquidChain,
      signatureChainId: this.signatureChainId,
      wei,
      nonce: this.nonceManager.getNonce()
    }

    return {
      tx: {
        action,
        chainId: this.signatureChainId
      }
    }
  }

  /**
   * Builds a transaction to withdraw tokens from staking balance to spot account.
   * Note: Withdrawals go through a 7-day unstaking queue.
   *
   * @param params - Transaction parameters
   * @param params.amount - Amount to withdraw in tokens (e.g., "1.5")
   *
   * @returns Returns a promise that resolves to a WithdrawFromStakingAction
   */
  async buildWithdrawFromStakingTx (params: { amount: string }): Promise<{ tx: UnsignedTx }> {
    const wei = Number(parseUnits(params.amount, DECIMALS))

    const action: WithdrawFromStakingAction = {
      type: ActionType.C_WITHDRAW,
      hyperliquidChain: this.hyperliquidChain,
      signatureChainId: this.signatureChainId,
      wei,
      nonce: this.nonceManager.getNonce()
    }

    return {
      tx: {
        action,
        chainId: this.signatureChainId
      }
    }
  }

  /**
   * Builds a transaction to delegate tokens to a validator.
   * Note: Delegations have a 1-day lockup period per validator.
   *
   * @param params - Transaction parameters
   * @param params.validatorAddress - Address in 42-character hexadecimal format; e.g. 0x0000000000000000000000000000000000000000
   * @param params.amount - Amount to delegate in HYPE (e.g., "1.5")
   *
   * @returns Returns a promise that resolves to a DelegateAction
   */
  async buildStakeTx (params: { validatorAddress: `0x${string}`; amount: string }): Promise<{ tx: UnsignedTx }> {
    const validatedAddress = ValidatorAddressSchema.parse(params.validatorAddress)
    const wei = Number(parseUnits(params.amount, DECIMALS))

    const action: DelegateAction = {
      type: ActionType.TOKEN_DELEGATE,
      hyperliquidChain: this.hyperliquidChain,
      signatureChainId: this.signatureChainId,
      validator: validatedAddress as Hex,
      isUndelegate: false,
      wei,
      nonce: this.nonceManager.getNonce()
    }

    return {
      tx: {
        action,
        chainId: this.signatureChainId
      }
    }
  }

  /**
   * Builds a transaction to undelegate tokens from a validator.
   * Note: Undelegations have a 1-day lockup period.
   *
   * @param params - Transaction parameters
   * @param params.validatorAddress - Address in 42-character hexadecimal format; e.g. 0x0000000000000000000000000000000000000000
   * @param params.amount - Amount to undelegate in HYPE (e.g., "1.5")
   *
   * @returns Returns a promise that resolves to a DelegateAction
   */
  async buildUnstakeTx (params: { validatorAddress: `0x${string}`; amount: string }): Promise<{ tx: UnsignedTx }> {
    const validatedAddress = ValidatorAddressSchema.parse(params.validatorAddress)
    const wei = Number(parseUnits(params.amount, DECIMALS))

    const action: DelegateAction = {
      type: ActionType.TOKEN_DELEGATE,
      hyperliquidChain: this.hyperliquidChain,
      signatureChainId: this.signatureChainId,
      validator: validatedAddress as Hex,
      isUndelegate: true,
      wei,
      nonce: this.nonceManager.getNonce()
    }

    return {
      tx: {
        action,
        chainId: this.signatureChainId
      }
    }
  }

  // ============================================================================
  // Signing and Broadcasting
  // ============================================================================

  /**
   * Signs a transaction using EIP-712 structured data signing.
   *
   * @param params - Signing parameters
   * @param params.signer - The signer instance
   * @param params.signerAddress - The address of the signer
   * @param params.tx - The unsigned transaction
   *
   * @returns A promise that resolves to the signed transaction
   */
  async sign (params: { signer: Signer; signerAddress: string; tx: UnsignedTx }): Promise<{ signedTx: string }> {
    const { signer, signerAddress, tx } = params

    const typedData = this.buildEIP712TypedData(tx.action)

    const hash = hashTypedData(typedData)

    const { sig } = await signer.sign(signerAddress.toLowerCase(), { message: hash.slice(2) }, {})

    const signatureData: SignatureData = {
      r: `0x${sig.r}` as Hex,
      s: `0x${sig.s}` as Hex,
      v: sig.v !== undefined ? sig.v + 27 : 27
    }

    const exchangeRequest: ExchangeRequest = {
      action: tx.action,
      nonce: tx.action.nonce,
      signature: signatureData
    }

    return {
      signedTx: JSON.stringify(exchangeRequest)
    }
  }

  /**
   * Builds EIP-712 typed data for signing.
   *
   * @param action - The action to sign
   * @returns The EIP-712 typed data object
   */
  private buildEIP712TypedData (
    action: DepositToStakingAction | WithdrawFromStakingAction | DelegateAction | SpotSendAction
  ): TypedDataDefinition {
    const domain = {
      name: 'HyperliquidSignTransaction',
      version: '1',
      chainId: parseInt(this.signatureChainId, 16),
      verifyingContract: '0x0000000000000000000000000000000000000000' as Address
    } as const

    const eip712Domain = [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' }
    ] as const

    const baseStakingFields = [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'wei', type: 'uint64' },
      { name: 'nonce', type: 'uint64' }
    ] as const

    if (action.type === ActionType.C_DEPOSIT) {
      return {
        domain,
        types: {
          EIP712Domain: eip712Domain,
          'HyperliquidTransaction:CDeposit': baseStakingFields
        },
        primaryType: 'HyperliquidTransaction:CDeposit',
        message: {
          hyperliquidChain: action.hyperliquidChain,
          wei: action.wei,
          nonce: action.nonce
        }
      } as const
    }

    if (action.type === ActionType.C_WITHDRAW) {
      return {
        domain,
        types: {
          EIP712Domain: eip712Domain,
          'HyperliquidTransaction:CWithdraw': baseStakingFields
        },
        primaryType: 'HyperliquidTransaction:CWithdraw',
        message: {
          hyperliquidChain: action.hyperliquidChain,
          wei: action.wei,
          nonce: action.nonce
        }
      } as const
    }

    if (action.type === BridgeActionType.SPOT_SEND) {
      return {
        domain,
        types: {
          EIP712Domain: eip712Domain,
          'HyperliquidTransaction:SpotSend': [
            { name: 'hyperliquidChain', type: 'string' },
            { name: 'destination', type: 'string' },
            { name: 'token', type: 'string' },
            { name: 'amount', type: 'string' },
            { name: 'time', type: 'uint64' }
          ]
        },
        primaryType: 'HyperliquidTransaction:SpotSend',
        message: {
          hyperliquidChain: action.hyperliquidChain,
          destination: action.destination,
          token: action.token.toString(),
          amount: action.amount,
          time: action.nonce
        }
      } as const
    }

    return {
      domain,
      types: {
        EIP712Domain: eip712Domain,
        'HyperliquidTransaction:TokenDelegate': [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'validator', type: 'address' },
          { name: 'wei', type: 'uint64' },
          { name: 'isUndelegate', type: 'bool' },
          { name: 'nonce', type: 'uint64' }
        ]
      },
      primaryType: 'HyperliquidTransaction:TokenDelegate',
      message: {
        hyperliquidChain: action.hyperliquidChain,
        validator: action.validator,
        wei: action.wei,
        isUndelegate: action.isUndelegate,
        nonce: action.nonce
      }
    } as const
  }

  /**
   * Broadcasts a signed transaction to the Hyperliquid network.
   *
   * Uses a request queue to ensure transactions are sent sequentially, preventing
   * network-level race conditions that could cause out-of-order nonce errors.
   *
   * @param params - Broadcasting parameters
   * @param params.signedTx - The signed transaction (JSON string)
   *
   * @returns A promise that resolves to the transaction hash
   */
  async broadcast (params: { signedTx: string; delegatorAddress: `0x${string}` }): Promise<{ txHash: string }> {
    return this.requestQueue.enqueue(async () => {
      const exchangeRequest: ExchangeRequest = JSON.parse(params.signedTx)

      await this.makeExchangeRequest(exchangeRequest)

      const history = await this.getDelegatorHistory({ delegatorAddress: params.delegatorAddress })
      const latestTx = history[0]

      if (!latestTx) {
        throw new Error('Unable to retrieve transaction hash from delegator history')
      }

      const deltaKey = Object.keys(latestTx.delta)[0]

      const actionToDeltaKeyMap: Record<string, string> = {
        [ActionType.TOKEN_DELEGATE]: 'delegate',
        [ActionType.C_WITHDRAW]: 'withdrawal',
        [ActionType.C_DEPOSIT]: 'cDeposit'
      }

      const expectedDeltaKey = actionToDeltaKeyMap[exchangeRequest.action.type] ?? exchangeRequest.action.type

      if (deltaKey !== expectedDeltaKey) {
        throw new Error(
          `Transaction type mismatch: expected ${expectedDeltaKey} but found ${deltaKey} in delegator history`
        )
      }

      const txHash = latestTx.hash

      return { txHash }
    })
  }
}
