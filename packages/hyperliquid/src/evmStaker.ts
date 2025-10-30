import type { Signer } from '@chorus-one/signer'
import secp256k1 from 'secp256k1'
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseUnits,
  encodeFunctionData,
  encodeAbiParameters,
  decodeAbiParameters,
  serializeTransaction,
  parseEventLogs,
  type PublicClient,
  type Address,
  type Hex,
  type Chain,
  type TransactionRequest
} from 'viem'
import { CoreWriterActionId, HyperliquidChain, type EvmSpotBalance, type EvmDelegatorSummary } from './types.d'
import {
  CORE_WRITER_ADDRESS,
  CORE_WRITER_ABI,
  DECIMALS,
  HYPE_TOKEN_INDEX,
  SPOT_BALANCE_PRECOMPILE_ADDRESS,
  DELEGATOR_SUMMARY_PRECOMPILE_ADDRESS,
  HYPE_SYSTEM_CONTRACT_ADDRESS,
  HYPE_SYSTEM_CONTRACT_ABI,
  MAINNET_HYPERLIQUID_EVM_RPC_URL,
  TESTNET_HYPERLIQUID_EVM_RPC_URL
} from './constants'

/**
 * HyperliquidEvmStaker - TypeScript SDK for Hyperliquid staking from HyperEVM
 *
 * This class enables staking operations on HyperCore from HyperEVM smart contracts
 * or EVM wallets. It uses the CoreWriter system contract to send actions from
 * HyperEVM that are executed on HyperCore.
 *
 * Key differences from HyperliquidStaker:
 * - Uses viem for EVM transaction signing (not EIP-712)
 * - Encodes actions using CoreWriter format (4-byte header + ABI encoding)
 * - Transactions are sent to CoreWriter contract (0x3333...3333)
 * - Actions are delayed by a few seconds to prevent MEV advantages
 *
 * Reference: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore
 */
export class HyperliquidEvmStaker {
  private readonly rpcUrl: string
  public publicClient!: PublicClient
  private chain!: Chain
  private hypeSystemAddress: Address // HYPE bridge contract

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
   * Creates a HyperliquidEvmStaker instance.
   *
   * @param params - Initialization configuration
   * @param params.rpcUrl - The URL of the HyperEVM RPC endpoint
   *
   * Note: Recommended RPC endpoints for HyperEVM:
   * https://hyperliquid.gitbook.io/hyperliquid-docs/builder-tools/hyperevm-tools#rpc
   *
   * @returns An instance of HyperliquidEvmStaker.
   */
  constructor({ chain }: { chain: HyperliquidChain }) {
    this.rpcUrl = chain === 'Mainnet' ? MAINNET_HYPERLIQUID_EVM_RPC_URL : TESTNET_HYPERLIQUID_EVM_RPC_URL
    this.hypeSystemAddress = HYPE_SYSTEM_CONTRACT_ADDRESS
  }

  /**
   * Initializes the HyperliquidEvmStaker instance and connects to HyperEVM.
   *
   * @returns A promise which resolves once the HyperliquidEvmStaker instance has been initialized.
   */
  async init(): Promise<void> {
    const tempClient = createPublicClient({
      transport: http(this.rpcUrl)
    })

    const chainId = await tempClient.getChainId()

    this.chain = {
      id: chainId,
      name: 'HyperEVM',
      nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
      rpcUrls: {
        default: { http: [this.rpcUrl] },
        public: { http: [this.rpcUrl] }
      },
      blockExplorers: {
        testnet: {
          name: 'HyperEVM Testnet Explorer',
          url: ' https://testnet.purrsec.com/'
        },
        mainnet: {
          name: 'HyperEVM Explorer',
          url: 'https://hyperevmscan.io/'
        },
        default: {
          name: 'HyperEVM Explorer',
          url: 'https://www.hyperscan.com'
        }
      }
    }

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(this.rpcUrl)
    })
  }

  // ============================================================================
  // Action Encoding Methods
  // ============================================================================

  /**
   * Encodes an action for CoreWriter using the 4-byte header format:
   * - Byte 1: Encoding version (currently version 1)
   * - Bytes 2-4: Action ID (3-byte big-endian unsigned integer)
   * - Remaining bytes: Raw ABI encoding of action-specific parameters
   *
   * @param actionId - The CoreWriter action ID
   * @param encodedParams - ABI-encoded parameters for the action
   * @returns The complete encoded action data
   *
   * @refference: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore#corewriter-contract
   */
  private encodeCoreWriterAction(actionId: number, encodedParams: Hex): Hex {
    // Version byte (0x01)
    const version = '01'

    // Action ID as 3-byte big-endian
    const actionIdHex = actionId.toString(16).padStart(6, '0')

    // Combine: version + actionId + params (remove 0x prefix from params)
    return `0x${version}${actionIdHex}${encodedParams.slice(2)}` as Hex
  }

  /**
   * Encodes a token delegate action (stake or unstake).
   * Action ID: 3
   * Parameters: (address validator, uint64 wei, bool isUndelegate)
   *
   * @param params - Delegation parameters
   * @returns Encoded action data
   */
  private encodeTokenDelegateAction(params: { validator: Address; wei: bigint; isUndelegate: boolean }): Hex {
    const encodedParams = encodeAbiParameters(
      [
        { type: 'address', name: 'validator' },
        { type: 'uint64', name: 'wei' },
        { type: 'bool', name: 'isUndelegate' }
      ],
      [params.validator, params.wei, params.isUndelegate]
    )

    return this.encodeCoreWriterAction(CoreWriterActionId.TOKEN_DELEGATE, encodedParams)
  }

  /**
   * Encodes a staking deposit action (spot to staking).
   * Action ID: 4
   * Parameters: (uint64 wei)
   *
   * @param params - Deposit parameters
   * @returns Encoded action data
   */
  private encodeStakingDepositAction(params: { wei: bigint }): Hex {
    const encodedParams = encodeAbiParameters([{ type: 'uint64', name: 'wei' }], [params.wei])

    return this.encodeCoreWriterAction(CoreWriterActionId.STAKING_DEPOSIT, encodedParams)
  }

  /**
   * Encodes a staking withdraw action (staking to spot).
   * Action ID: 5
   * Parameters: (uint64 wei)
   *
   * @param params - Withdraw parameters
   * @returns Encoded action data
   */
  private encodeStakingWithdrawAction(params: { wei: bigint }): Hex {
    const encodedParams = encodeAbiParameters([{ type: 'uint64', name: 'wei' }], [params.wei])

    return this.encodeCoreWriterAction(CoreWriterActionId.STAKING_WITHDRAW, encodedParams)
  }

  // ============================================================================
  // Transaction Builder Methods
  // ============================================================================

  /**
   * Builds a transaction to transfer HYPE from HyperEVM to HyperCore spot account.
   *
   * This sends native HYPE to the hype system contract.
   * The funds will be credited to the sender's HyperCore spot account.
   *
   * @param params - Transaction parameters
   * @param params.amount - Amount to transfer in HYPE (e.g., "1.5")
   *
   * @returns Returns a promise that resolves to an EVM transaction object
   */
  async buildEvmToSpotTx(params: { amount: string }): Promise<{ tx: TransactionRequest }> {
    const wei = parseUnits(params.amount, 18) // HyperEVM uses 18 decimals

    return {
      tx: {
        to: this.hypeSystemAddress,
        value: wei,
        data: '0x' as Hex,
        gas: 50000n // Explicit gas limit for the receive() function and event emission
      }
    }
  }

  /**
   * Builds a transaction to move tokens from spot account to staking balance.
   *
   * Note: This transaction will be delayed by a few seconds on HyperCore to prevent MEV.
   *
   * @param params - Transaction parameters
   * @param params.amount - Amount to deposit in HYPE (e.g., "1.5")
   *
   * @returns Returns a promise that resolves to an EVM transaction object
   */
  async buildSpotToStakingTx(params: { amount: string }): Promise<{ tx: TransactionRequest }> {
    const wei = parseUnits(params.amount, DECIMALS)

    const actionData = this.encodeStakingDepositAction({ wei })

    const data = encodeFunctionData({
      abi: CORE_WRITER_ABI,
      functionName: 'sendRawAction',
      args: [actionData]
    })

    return {
      tx: {
        to: CORE_WRITER_ADDRESS,
        data,
        value: 0n
      }
    }
  }

  /**
   * Builds a transaction to withdraw tokens from staking balance to spot account.
   * Note: Withdrawals go through a 7-day unstaking queue on HyperCore.
   *
   * @param params - Transaction parameters
   * @param params.amount - Amount to withdraw in HYPE (e.g., "1.5")
   *
   * @returns Returns a promise that resolves to an EVM transaction object
   */
  async buildWithdrawFromStakingTx(params: { amount: string }): Promise<{ tx: TransactionRequest }> {
    const wei = parseUnits(params.amount, DECIMALS)

    const actionData = this.encodeStakingWithdrawAction({ wei })

    const data = encodeFunctionData({
      abi: CORE_WRITER_ABI,
      functionName: 'sendRawAction',
      args: [actionData]
    })

    return {
      tx: {
        to: CORE_WRITER_ADDRESS,
        data,
        value: 0n
      }
    }
  }

  /**
   * Builds a transaction to delegate tokens to a validator on HyperCore.
   * Note: Delegations have a 1-day lockup period per validator.
   *
   * @param params - Transaction parameters
   * @param params.validatorAddress - Validator address in 42-character hexadecimal format
   * @param params.amount - Amount to delegate in HYPE (e.g., "1.5")
   *
   * @returns Returns a promise that resolves to an EVM transaction object
   */
  async buildStakeTx(params: { validatorAddress: Address; amount: string }): Promise<{ tx: TransactionRequest }> {
    const wei = parseUnits(params.amount, DECIMALS)

    const actionData = this.encodeTokenDelegateAction({
      validator: params.validatorAddress,
      wei,
      isUndelegate: false
    })

    const data = encodeFunctionData({
      abi: CORE_WRITER_ABI,
      functionName: 'sendRawAction',
      args: [actionData]
    })

    return {
      tx: {
        to: CORE_WRITER_ADDRESS,
        data,
        value: 0n
      }
    }
  }

  /**
   * Builds a transaction to undelegate tokens from a validator on HyperCore.
   * Note: Undelegations have a 1-day lockup period.
   *
   * @param params - Transaction parameters
   * @param params.validatorAddress - Validator address in 42-character hexadecimal format
   * @param params.amount - Amount to undelegate in HYPE (e.g., "1.5")
   *
   * @returns Returns a promise that resolves to an EVM transaction object
   */
  async buildUnstakeTx(params: { validatorAddress: Address; amount: string }): Promise<{ tx: TransactionRequest }> {
    const wei = parseUnits(params.amount, DECIMALS)

    const actionData = this.encodeTokenDelegateAction({
      validator: params.validatorAddress,
      wei,
      isUndelegate: true
    })

    const data = encodeFunctionData({
      abi: CORE_WRITER_ABI,
      functionName: 'sendRawAction',
      args: [actionData]
    })

    return {
      tx: {
        to: CORE_WRITER_ADDRESS,
        data,
        value: 0n
      }
    }
  }

  // ============================================================================
  // Signing and Broadcasting
  // ============================================================================

  /**
   * Signs an EVM transaction using the provided signer.
   *
   * @param params - Signing parameters
   * @param params.signer - The signer instance
   * @param params.signerAddress - The address of the signer
   * @param params.tx - The unsigned EVM transaction
   *
   * @returns A promise that resolves to the signed transaction (RLP-encoded hex string)
   */
  async sign(params: { signer: Signer; signerAddress: string; tx: TransactionRequest }): Promise<{ signedTx: Hex }> {
    const { signer, signerAddress, tx } = params

    const client = createWalletClient({
      chain: this.chain,
      transport: http(),
      account: signerAddress as Address
    })

    const request = await client.prepareTransactionRequest({
      chain: undefined,
      account: signerAddress as Address,
      to: tx.to,
      value: tx.value,
      data: tx.data,
      gas: tx.gas, // Pass through explicit gas limit if provided
      // Pin tx type to avoid type conflict with serializeTransaction below
      type: 'eip1559'
    })

    const message = keccak256(serializeTransaction(request)).slice(2)
    const data = { tx }

    const { sig } = await signer.sign(signerAddress.toLowerCase(), { message, data }, {})

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
   * Broadcasts a signed EVM transaction to HyperEVM.
   *
   * @param params - Broadcasting parameters
   * @param params.signedTx - The signed transaction (RLP-encoded hex string)
   *
   * @returns A promise that resolves to the transaction hash
   */
  async broadcast(params: { signedTx: Hex }): Promise<{ txHash: `0x${string}` }> {
    const txHash = await this.publicClient.sendRawTransaction({
      serializedTransaction: params.signedTx
    })

    return { txHash }
  }

  // ============================================================================
  // Read Functions - L1Read Precompiles
  // ============================================================================

  /**
   * Queries the HYPE spot balance via the L1Read precompile (0x801).
   *
   * This function reads HyperCore state directly from HyperEVM using precompiles.
   * The data returned reflects HyperCore state at the time the EVM block is constructed.
   *
   * @param params - Query parameters
   * @param params.userAddress - User's address in EVM format (0x...)
   *
   * @returns A promise that resolves to the HYPE spot balance information
   */
  async getSpotBalance(params: { userAddress: Address }): Promise<EvmSpotBalance> {
    const { userAddress } = params

    const data = encodeAbiParameters(
      [
        { type: 'address', name: 'user' },
        { type: 'uint64', name: 'token' }
      ],
      [userAddress, HYPE_TOKEN_INDEX]
    )

    const result = await this.publicClient.call({
      to: SPOT_BALANCE_PRECOMPILE_ADDRESS,
      data
    })

    if (!result.data) {
      throw new Error('Precompile call returned no data')
    }

    const [total, hold, entryNtl] = decodeAbiParameters(
      [
        { type: 'uint64', name: 'total' },
        { type: 'uint64', name: 'hold' },
        { type: 'uint64', name: 'entryNtl' }
      ],
      result.data
    )

    return {
      total,
      hold,
      entryNtl
    }
  }

  /**
   * Queries the delegator summary via the L1Read precompile (0x805).
   *
   * This function reads HyperCore staking state directly from HyperEVM using precompiles.
   * The data returned reflects HyperCore state at the time the EVM block is constructed.
   *
   * Note: Precompile calls may not reflect state changes within the same transaction.
   * For example, if you delegate tokens and then immediately query in the same transaction,
   * the delegated amount may still show the old value.
   *
   * @param params - Query parameters
   * @param params.userAddress - User's address in EVM format (0x...)
   *
   * @returns A promise that resolves to the delegator summary information
   *
   * @example
   * ```typescript
   * const staker = new HyperliquidEvmStaker({ chain: 'Mainnet' })
   * await staker.init()
   *
   * const summary = await staker.getDelegatorSummary({
   *   userAddress: '0x1234...'
   * })
   *
   * console.log('Delegated:', summary.delegated) // "1000.00000000" HYPE
   * console.log('Undelegated:', summary.undelegated) // "50.00000000" HYPE
   * console.log('Pending withdrawals:', summary.nPendingWithdrawals) // "2"
   * ```
   */
  async getStakingSummary(params: { userAddress: Address }): Promise<EvmDelegatorSummary> {
    const { userAddress } = params

    // Encode the function call parameters: (address user)
    const data = encodeAbiParameters([{ type: 'address', name: 'user' }], [userAddress])

    // Call the precompile via staticcall
    const result = await this.publicClient.call({
      to: DELEGATOR_SUMMARY_PRECOMPILE_ADDRESS,
      data
    })

    if (!result.data) {
      throw new Error('Precompile call returned no data')
    }

    // Decode the return value: DelegatorSummary struct
    // (uint64 delegated, uint64 undelegated, uint64 totalPendingWithdrawal, uint64 nPendingWithdrawals)
    const [delegated, undelegated, totalPendingWithdrawal, nPendingWithdrawals] = decodeAbiParameters(
      [
        { type: 'uint64', name: 'delegated' },
        { type: 'uint64', name: 'undelegated' },
        { type: 'uint64', name: 'totalPendingWithdrawal' },
        { type: 'uint64', name: 'nPendingWithdrawals' }
      ],
      result.data
    )

    // Convert from uint64 wei to human-readable format
    // Note: nPendingWithdrawals is a count, not an amount, but we format it for consistency
    return {
      delegated,
      undelegated,
      totalPendingWithdrawal,
      nPendingWithdrawals
    }
  }

  /**
   * Verifies that a bridge transaction emitted the correct Received event.
   *
   * This method checks that:
   * 1. The transaction was sent to the HYPE system contract (0x2222...2222)
   * 2. A Received(address indexed user, uint256 amount) event was emitted
   *
   * If the event is missing, HyperCore will not credit the spot balance.
   *
   * @param params - Verification parameters
   * @param params.txHash - The transaction hash to verify
   *
   * @returns A promise that resolves to the decoded event data (user address and amount)
   *
   * @throws Error if the transaction was not sent to the system contract
   * @throws Error if no Received event was found in the transaction logs
   */
  async verifyBridgeEvent(params: { txHash: Hex }): Promise<{ user: Address; amount: bigint }> {
    const { txHash } = params

    const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash })

    if (receipt.to?.toLowerCase() !== HYPE_SYSTEM_CONTRACT_ADDRESS.toLowerCase()) {
      throw new Error(
        `Transaction 'to' address (${receipt.to}) does not match HYPE system contract (${HYPE_SYSTEM_CONTRACT_ADDRESS}). ` +
          `HyperCore will not credit the spot balance.`
      )
    }

    const decoded = parseEventLogs({
      abi: HYPE_SYSTEM_CONTRACT_ABI,
      logs: receipt.logs,
      eventName: 'Received'
    })

    if (decoded.length === 0) {
      throw new Error(
        `No Received(address indexed user, uint256 amount) event found in transaction logs. ` +
          `HyperCore will not credit the spot balance. The transaction may have failed or was sent incorrectly.`
      )
    }

    const { args } = decoded[0]!

    return {
      user: args.user as Address,
      amount: args.amount as bigint
    }
  }

  /**
   * Gets the native HyperEVM balance for an address.
   *
   * This is the HYPE balance used to pay for gas fees on HyperEVM.
   * This is separate from the HyperCore spot balance.
   *
   * @param params - Query parameters
   * @param params.userAddress - User's address in EVM format (0x...)
   *
   * @returns A promise that resolves to the balance in wei (18 decimals)
   */
  async getBalance(params: { userAddress: Address }): Promise<bigint> {
    return await this.publicClient.getBalance({
      address: params.userAddress
    })
  }
}
