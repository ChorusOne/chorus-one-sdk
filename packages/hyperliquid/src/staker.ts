import type { Signer } from '@chorus-one/signer'
import secp256k1 from 'secp256k1'
import { keccak256, hashTypedData, type Hex } from 'viem'
import {
  HyperliquidChain,
  SignatureData,
  DepositToStakingAction,
  WithdrawFromStakingAction,
  DelegateAction,
  DelegatorSummary,
  Delegation,
  StakingReward,
  DelegationHistoryEvent,
  DelegatorSummaryRequest,
  DelegationsRequest,
  DelegatorRewardsRequest,
  DelegatorHistoryRequest,
  SpotBalancesRequest,
  ExchangeRequest,
  StakingResponse,
  UnsignedTx,
  SpotBalance
} from './types'
import { TESTNET_CHAIN_ID, MAINNET_API_URL, TESTNET_API_URL, MAINNET_CHAIN_ID } from './constants'
import { tokensToWei } from './utils'

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
  constructor({ chain }: { chain: HyperliquidChain }) {
    this.apiUrl = chain === 'Mainnet' ? MAINNET_API_URL : TESTNET_API_URL
    this.hyperliquidChain = chain
    this.signatureChainId = chain === 'Mainnet' ? MAINNET_CHAIN_ID : TESTNET_CHAIN_ID
  }

  /**
   * Initializes the HyperliquidStaker instance.
   *
   * @returns A promise which resolves once the HyperliquidStaker instance has been initialized.
   */
  async init(): Promise<void> {
    // No initialization needed for REST API client
    // This method exists for API consistency with other staker implementations
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Makes a request to the Hyperliquid Info endpoint.
   * https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
   *
   * @param request - The request object
   * @returns The response data
   */
  private async makeInfoRequest<T>(request: object): Promise<T> {
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
    return data as T
  }

  /**
   * Makes a request to the Hyperliquid Exchange endpoint.
   * https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint
   *
   * @param request - The exchange request object
   * @returns The response data
   */
  private async makeExchangeRequest(request: ExchangeRequest): Promise<StakingResponse> {
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

    const data = await response.json()
    return data as StakingResponse
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
  async getStakingSummary(params: { delegatorAddress: string }): Promise<DelegatorSummary> {
    const request: DelegatorSummaryRequest = {
      type: 'delegatorSummary',
      user: params.delegatorAddress
    }

    return await this.makeInfoRequest<DelegatorSummary>(request)
  }

  /**
   * Gets all active delegations for a delegator.
   *
   * @param params - Query parameters
   * @param params.delegatorAddress - The delegator's address
   *
   * @returns A promise that resolves to an array of active delegations
   */
  async getDelegations(params: { delegatorAddress: string }): Promise<Delegation[]> {
    const request: DelegationsRequest = {
      type: 'delegations',
      user: params.delegatorAddress
    }

    return await this.makeInfoRequest<Delegation[]>(request)
  }

  /**
   * Gets the staking rewards history for a delegator.
   *
   * @param params - Query parameters
   * @param params.delegatorAddress - The delegator's address
   *
   * @returns A promise that resolves to an array of staking rewards
   */
  async getDelegatorRewards(params: { delegatorAddress: string }): Promise<StakingReward[]> {
    const request: DelegatorRewardsRequest = {
      type: 'delegatorRewards',
      user: params.delegatorAddress
    }

    return await this.makeInfoRequest<StakingReward[]>(request)
  }

  /**
   * Gets the delegation history for a delegator.
   *
   * @param params - Query parameters
   * @param params.delegatorAddress - The delegator's address
   *
   * @returns A promise that resolves to an array of delegation history events
   */
  async getDelegatorHistory(params: { delegatorAddress: string }): Promise<DelegationHistoryEvent[]> {
    const request: DelegatorHistoryRequest = {
      type: 'delegatorHistory',
      user: params.delegatorAddress
    }

    return await this.makeInfoRequest<DelegationHistoryEvent[]>(request)
  }

  /**
   * Gets the spot account balances for a user.
   *
   * @param params - Query parameters
   * @param params.userAddress - The user's address
   *
   * @returns A promise that resolves to an array of spot balances for different assets(e.g. HYPE, USDC)
   */
  async getSpotBalances(params: { userAddress: string }): Promise<{ balances: SpotBalance[] }> {
    const request: SpotBalancesRequest = {
      type: 'spotClearinghouseState',
      user: params.userAddress
    }

    return await this.makeInfoRequest<{ balances: SpotBalance[] }>(request)
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
  async buildSpotToStakingTx(params: { amount: string }): Promise<{ tx: UnsignedTx }> {
    const wei = tokensToWei(params.amount)

    const action: DepositToStakingAction = {
      type: 'cDeposit',
      hyperliquidChain: this.hyperliquidChain,
      signatureChainId: this.signatureChainId,
      wei,
      nonce: Date.now()
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
  async buildWithdrawFromStakingTx(params: { amount: string }): Promise<{ tx: UnsignedTx }> {
    const wei = tokensToWei(params.amount)

    const action: WithdrawFromStakingAction = {
      type: 'cWithdraw',
      hyperliquidChain: this.hyperliquidChain,
      signatureChainId: this.signatureChainId,
      wei,
      nonce: Date.now()
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
   * @param params.validatorAddress - The validator's address
   * @param params.amount - Amount to delegate in HYPE (e.g., "1.5")
   *
   * @returns Returns a promise that resolves to a DelegateAction
   */
  async buildStakeTx(params: { validatorAddress: string; amount: string }): Promise<{ tx: UnsignedTx }> {
    const wei = tokensToWei(params.amount)

    const action: DelegateAction = {
      type: 'tokenDelegate',
      hyperliquidChain: this.hyperliquidChain,
      signatureChainId: this.signatureChainId,
      validator: params.validatorAddress as Hex,
      isUndelegate: false,
      wei,
      nonce: Date.now()
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
   * @param params.validatorAddress - The validator's address
   * @param params.amount - Amount to undelegate in HYPE (e.g., "1.5")
   *
   * @returns Returns a promise that resolves to a DelegateAction
   */
  async buildUnstakeTx(params: { validatorAddress: string; amount: string }): Promise<{ tx: UnsignedTx }> {
    const wei = tokensToWei(params.amount)

    const action: DelegateAction = {
      type: 'tokenDelegate',
      hyperliquidChain: this.hyperliquidChain,
      signatureChainId: this.signatureChainId,
      validator: params.validatorAddress as Hex,
      isUndelegate: true,
      wei,
      nonce: Date.now()
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
  async sign(params: { signer: Signer; signerAddress: string; tx: UnsignedTx }): Promise<{ signedTx: string }> {
    const { signer, signerAddress, tx } = params

    // Build EIP-712 typed data
    const typedData = this.buildEIP712TypedData(tx.action) as any

    // Hash the typed data according to EIP-712
    const hash = hashTypedData(typedData)

    // Sign the hash (signer message expects hex string without '0x' prefix)
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
  private buildEIP712TypedData(action: DepositToStakingAction | WithdrawFromStakingAction | DelegateAction): object {
    // EIP-712 domain
    const domain = {
      name: 'HyperliquidSignTransaction',
      version: '1',
      chainId: parseInt(this.signatureChainId, 16),
      verifyingContract: '0x0000000000000000000000000000000000000000'
    }

    // Determine types and message based on action type
    let types: Record<string, Array<{ name: string; type: string }>>
    let message: object
    let primaryType: string

    // EIP712Domain type definition (required by Hyperliquid)
    const eip712Domain = [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' }
    ]

    if (action.type === 'cDeposit') {
      primaryType = 'HyperliquidTransaction:CDeposit'
      types = {
        EIP712Domain: eip712Domain,
        'HyperliquidTransaction:CDeposit': [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'wei', type: 'uint64' },
          { name: 'nonce', type: 'uint64' }
        ]
      }
      message = {
        hyperliquidChain: action.hyperliquidChain,
        wei: action.wei,
        nonce: action.nonce
      }
    } else if (action.type === 'cWithdraw') {
      primaryType = 'HyperliquidTransaction:CWithdraw'
      types = {
        EIP712Domain: eip712Domain,
        'HyperliquidTransaction:CWithdraw': [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'wei', type: 'uint64' },
          { name: 'nonce', type: 'uint64' }
        ]
      }
      message = {
        hyperliquidChain: action.hyperliquidChain,
        wei: action.wei,
        nonce: action.nonce
      }
    } else {
      // tokenDelegate
      primaryType = 'HyperliquidTransaction:TokenDelegate'
      types = {
        EIP712Domain: eip712Domain,
        'HyperliquidTransaction:TokenDelegate': [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'validator', type: 'address' },
          { name: 'wei', type: 'uint64' },
          { name: 'isUndelegate', type: 'bool' },
          { name: 'nonce', type: 'uint64' }
        ]
      }
      message = {
        hyperliquidChain: action.hyperliquidChain,
        validator: action.validator,
        wei: action.wei,
        isUndelegate: action.isUndelegate,
        nonce: action.nonce
      }
    }

    return {
      domain,
      types,
      primaryType,
      message
    }
  }

  /**
   * Broadcasts a signed transaction to the Hyperliquid network.
   *
   * @param params - Broadcasting parameters
   * @param params.signedTx - The signed transaction (JSON string)
   *
   * @returns A promise that resolves to the transaction hash
   */
  async broadcast(params: { signedTx: string; delegatorAddress: `0x${string}` }): Promise<{ txHash: string }> {
    const exchangeRequest: ExchangeRequest = JSON.parse(params.signedTx)
    console.log('Broadcasting transaction of type: ', exchangeRequest.action)

    const response = await this.makeExchangeRequest(exchangeRequest)

    if (response.status === 'error') {
      throw new Error(`Transaction broadcast failed: ${JSON.stringify(response)}`)
    }

    const history = await this.getDelegatorHistory({ delegatorAddress: params.delegatorAddress })
    const latestTx = history[0]
    console.log('🔥 Found the latest tx: ', latestTx)

    if (!latestTx) {
      throw new Error('Unable to retrieve transaction hash from delegator history')
    }

    const deltaKey = Object.keys(latestTx.delta)[0]
    const expectedDeltaKey =
      exchangeRequest.action.type === 'tokenDelegate'
        ? 'delegate'
        : exchangeRequest.action.type === 'cWithdraw'
          ? 'withdrawal'
          : exchangeRequest.action.type

    if (deltaKey !== expectedDeltaKey) {
      throw new Error(
        `Transaction type mismatch: expected ${expectedDeltaKey} but found ${deltaKey} in delegator history`
      )
    }

    const txHash = latestTx.hash

    return { txHash }
  }
}
