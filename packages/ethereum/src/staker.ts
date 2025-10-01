import type { Signer } from '@chorus-one/signer'
import secp256k1 from 'secp256k1'
import {
  Chain,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  Hex,
  http,
  keccak256,
  parseEther,
  serializeTransaction
} from 'viem'
import { StakewiseConnector } from './lib/connector'
import { NativeStakingConnector } from './lib/nativeStakingConnector'

import {
  buildStakeTx,
  buildUnstakeTx,
  buildWithdrawTx,
  buildMintTx,
  buildBurnTx,
  buildValidatorExitTx,
  getVault,
  getStake,
  getMaxUnstake,
  getRewardsHistory,
  getTxHistory,
  getUnstakeQueue,
  getMint,
  getMaxMint,
  getMintHealth
} from './lib/methods'

import { Networks } from './lib/types/networks'
import { Transaction } from './lib/types/transaction'
import { EthereumTxStatus } from './lib/types/txStatus'
import {
  BatchDetailsDepositData,
  BatchDetailsResponse,
  CreateBatchRequest,
  CreateBatchResponse,
  ListBatchesResponse
} from './lib/types/nativeStaking'
import { depositAbi } from './lib/contracts/depositContractAbi'
import { toHexString } from './lib/utils/toHexString'
import { getNetworkConfig } from './lib/utils/getNetworkConfig'

/**
 * This class provides the functionality to stake, unstake, and withdraw for Ethereum network.
 *
 * It also provides the ability to retrieve staking information and rewards for an account.
 */
export class EthereumStaker {
  private connector: StakewiseConnector
  private nativeStakingConnector?: NativeStakingConnector
  private network: Networks
  private rpcUrl?: string

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
      const pkUncompressed = secp256k1.publicKeyConvert(publicKey, false)
      const hash = keccak256(pkUncompressed.subarray(1))
      const ethAddress = hash.slice(-40)
      return [ethAddress]
    }

  /**
   * Creates a EthereumStaker instance.
   *
   * @param params - Initialization configuration
   * @param params.network - The network to connect to
   * @param params.rpcUrl - (Optional) The URL of the RPC endpoint. If not provided, the public RPC URL for the network will be used.
   * @param params.nativeStakingApiToken - (Optional) API token for native staking operations. Required for native staking methods.
   *
   * @returns  An instance of EthereumStaker.
   */
  constructor (params: { network: Networks; rpcUrl?: string; nativeStakingApiToken?: string }) {
    this.network = params.network
    this.rpcUrl = params.rpcUrl

    this.connector = new StakewiseConnector(this.network, this.rpcUrl)

    if (params.nativeStakingApiToken) {
      this.nativeStakingConnector = new NativeStakingConnector(this.network, params.nativeStakingApiToken, this.rpcUrl)
    }
  }

  /**
   * Initializes the EthereumStaker instance and connects to the Ethereum network.
   *
   * @returns A promise which resolves once the EthereumStaker instance has been initialized.
   */
  async init (): Promise<void> {}

  /**
   * Builds a staking transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address to stake from
   * @param params.validatorAddress - The validator (vault) address to stake with
   * @param params.amount - The amount to stake, specified in `ETH`. E.g. "1" - 1 ETH
   * @param params.referrer - (Optional) The address of the referrer. This is used to track the origin of transactions,
   * providing insights into which sources or campaigns are driving activity. This can be useful for analytics and
   * optimizing user acquisition strategies
   *
   * @returns Returns a promise that resolves to an Ethereum staking transaction.
   */
  async buildStakeTx (params: {
    delegatorAddress: Hex
    validatorAddress: Hex
    amount: string // ETH assets
    referrer?: Hex
  }): Promise<{ tx: Transaction }> {
    const tx = await buildStakeTx({
      connector: this.connector,
      userAccount: params.delegatorAddress,
      vault: params.validatorAddress,
      amount: this.parseEther(params.amount),
      referrer: params.referrer
    })

    return { tx }
  }

  /**
   * Builds an unstaking transaction.
   *
   * The unstake transaction effectively moves the user's assets into an unstake queue where they remain until they
   * become eligible for withdrawal. This queue is a safeguard mechanism that ensures the liquidity and stability of
   * the vault by managing the flow of assets. To check the status of these assets, use the `getUnstakeQueue`
   * method.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address that is unstaking
   * @param params.validatorAddress - The validator (vault) address to unstake from
   * @param params.amount - The amount to unstake, specified in `ETH`. E.g. "1" - 1 ETH
   *
   * @returns Returns a promise that resolves to an Ethereum unstaking transaction.
   */
  async buildUnstakeTx (params: {
    delegatorAddress: Hex
    validatorAddress: Hex
    amount: string // ETH assets
  }): Promise<{ tx: Transaction }> {
    const tx = await buildUnstakeTx({
      connector: this.connector,
      userAccount: params.delegatorAddress,
      vault: params.validatorAddress,
      amount: this.parseEther(params.amount)
    })

    return { tx }
  }

  /**
   * Builds a withdrawal transaction.
   *
   * This method is the final step in the unstaking process. Once assets in the unstake queue have reached a
   * withdrawable state (as determined by the `getUnstakeQueue` method), the `buildWithdrawTx` method prepares the
   * transaction data necessary for transferring these assets back into the user's wallet.
   *
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator (vault) address to withdraw from
   * @param params.positionTickets - (Optional) An array of position tickets to withdraw. If not provided, all withdrawable
   * assets will be withdrawn. (see `getUnstakeQueue`)
   *
   * @returns Returns a promise that resolves to an Ethereum withdrawal transaction.
   */
  async buildWithdrawTx (params: {
    delegatorAddress: Hex
    validatorAddress: Hex
    positionTickets?: string[]
  }): Promise<{ tx: Transaction }> {
    const tx = await buildWithdrawTx({
      connector: this.connector,
      userAccount: params.delegatorAddress,
      vault: params.validatorAddress,
      positionTickets: params.positionTickets
    })

    return { tx }
  }

  /**
   * Builds a mint transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator (vault) address to mint shares for
   * @param params.amount - The amount to mint, specified in `osETH`. E.g. "1" - 1 osETH
   * @param params.referrer - (Optional) The address of the referrer. This is used to track the origin of transactions,
   * providing insights into which sources or campaigns are driving activity. This can be useful for analytics and
   * optimizing user acquisition strategies
   *
   * @returns Returns a promise that resolves to an Ethereum mint transaction.
   */
  async buildMintTx (params: {
    delegatorAddress: Hex
    validatorAddress: Hex
    amount: string // osETH shares
    referrer?: Hex
  }): Promise<{ tx: Transaction }> {
    const tx = await buildMintTx({
      connector: this.connector,
      userAccount: params.delegatorAddress,
      vault: params.validatorAddress,
      amount: this.parseEther(params.amount),
      referrer: params.referrer
    })

    return { tx }
  }

  /**
   * Builds a burn transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator (vault) address to burn shares from
   * @param params.amount - The amount to burn, specified in `osETH`. E.g. "1" - 1 osETH
   *
   * @returns Returns a promise that resolves to an Ethereum burn transaction.
   */
  async buildBurnTx (params: {
    delegatorAddress: Hex
    validatorAddress: Hex
    amount: string // osETH shares
  }): Promise<{ tx: Transaction }> {
    const tx = await buildBurnTx({
      connector: this.connector,
      userAccount: params.delegatorAddress,
      vault: params.validatorAddress,
      amount: this.parseEther(params.amount)
    })

    return { tx }
  }

  /**
   * Retrieves the staking information for a specified vault, including TVL, APY, description, logo.
   *
   * @param params - Parameters for the request
   * @param params.validatorAddress - The validator (vault) address
   *
   * @returns Returns a promise that resolves to the staking information for the specified vault.
   */
  async getVault ({ validatorAddress }: { validatorAddress: Hex }) {
    const vault = await getVault({
      connector: this.connector,
      vault: validatorAddress
    })

    return { vault }
  }

  /**
   * Retrieves the staking information for a specified delegator.
   *
   * The staking information includes the current balance and the maximum amount that can be unstaked.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator (vault) address to gather staking information from
   *
   * @returns Returns a promise that resolves to the staking information for the delegator.
   */
  async getStake (params: { delegatorAddress: Hex; validatorAddress: Hex }) {
    const stake = await getStake({
      connector: this.connector,
      userAccount: params.delegatorAddress,
      vaultAddress: params.validatorAddress
    })

    const maxUnstake = await getMaxUnstake({
      connector: this.connector,
      userAccount: params.delegatorAddress,
      vault: params.validatorAddress
    })

    return { balance: formatEther(stake.assets), maxUnstake: formatEther(maxUnstake) }
  }

  /**
   * Retrieves the rewards history for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator (vault) address to gather rewards data from
   * @param params.startTime - The start time of the rewards data to retrieve, specified in milliseconds
   * @param params.endTime - The end time of the rewards data to retrieve, specified in milliseconds
   *
   * @returns Returns a promise that resolves to the rewards data for the specified delegator.
   */
  async getRewardsHistory (params: {
    startTime: number
    endTime: number
    delegatorAddress: Hex
    validatorAddress: Hex
  }) {
    const rewards = await getRewardsHistory({
      connector: this.connector,
      from: params.startTime,
      to: params.endTime,
      vault: params.validatorAddress,
      userAccount: params.delegatorAddress
    })

    return rewards.map((item) => ({
      timestamp: item.timestamp,
      /**
       * @deprecated Use `totalRewards` instead.
       */
      amount: formatEther(item.totalRewards),
      totalRewards: formatEther(item.totalRewards),
      dailyRewards: formatEther(item.dailyRewards)
    }))
  }

  /**
   * Retrieves the transaction history for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator (vault) address to gather transaction data from
   *
   * @returns Returns a promise that resolves to the transaction history for the specified delegator.
   */
  async getTxHistory (params: { delegatorAddress: Hex; validatorAddress: Hex }) {
    const txHistory = await getTxHistory({
      connector: this.connector,
      userAccount: params.delegatorAddress,
      vault: params.validatorAddress
    })

    return txHistory.map((item) => ({
      timestamp: item.when.getTime(),
      type: item.type,
      amount: formatEther(item.amount),
      txHash: item.hash.split('-')[0]
    }))
  }

  /**
   * Retrieves the unstake queue for a specified delegator.
   *
   * After initiating an unstake request using the `buildUnstakeTx` method, assets are placed into an unstake
   * queue.
   *
   * The `getUnstakeQueue` method allows users to query the queue to check the current state of their unstake requests,
   * including their positionTicket, the amount of assets that are withdrawable, and the total amount.
   *
   * To prepare the transaction for withdrawing these assets, use the `buildWithdrawTx` method.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator (vault) address to gather the unstake queue from
   *
   * @returns Returns a promise that resolves to the unstake queue for the specified delegator.
   */
  async getUnstakeQueue (params: { delegatorAddress: Hex; validatorAddress: Hex }) {
    const queue = await getUnstakeQueue({
      connector: this.connector,
      userAccount: params.delegatorAddress,
      vault: params.validatorAddress
    })

    return queue
      .filter((item) => !item.wasWithdrawn)
      .map((item) => ({
        positionTicket: item.positionTicket.toString(),
        exitQueueIndex: item.exitQueueIndex?.toString(),
        timestamp: item.timestamp,
        isWithdrawable: item.isWithdrawable,
        totalAmount: formatEther(item.totalAssets),
        withdrawableAmount: formatEther(item.exitedAssets),
        withdrawalTimestamp: item.withdrawalTimestamp
      }))
  }

  /**
   * Retrieves the mint information for a specified delegator.
   *
   * The mint information includes the current balance of minted `osETH` and the maximum amount of that can be minted.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator (vault) address to gather mint data from
   *
   * @returns Returns a promise that resolves to the mint information
   */
  async getMint (params: { delegatorAddress: Hex; validatorAddress: Hex }) {
    const mint = await getMint({
      connector: this.connector,
      userAccount: params.delegatorAddress,
      vaultAddress: params.validatorAddress
    })

    const maxMint = await getMaxMint({
      connector: this.connector,
      userAccount: params.delegatorAddress,
      vault: params.validatorAddress
    })

    return {
      balance: formatEther(mint.minted.shares),
      maxMint: formatEther(maxMint)
    }
  }

  /**
   * Retrieves the mint health for a specified stake and mint amount.
   *
   * Position health tracks the value of osETH minted by stakers relative to the value of their ETH stake in the vault.
   * Healthy positions have minted osETH that is well-collateralized by staked ETH. As the proportion of minted osETH
   * increases relative to staked ETH, position health deteriorates.
   *
   * Factors affecting position health include yield discrepancies (APY) between the vault and osETH, which can result
   * from:
   * - Differences in fee structures.
   * - Variations in attestation performance.
   * - The ratio of unbounded ETH to the vault's total value locked (TVL).
   * - Delays in validator activation on the Beacon Chain.
   * - Losses due to maximal extractable value (MEV) strategies.
   *
   * Risky positions may enter redemption processes, while positions deemed unhealthy are subject to liquidation.
   *
   * @param params - Parameters for the request
   * @param params.stakeAmount - The amount of ETH staked
   * @param params.mintAmount - The amount of osETH minted
   * @param params.validatorAddress - The validator (vault) address
   *
   * @returns Returns a promise that resolves to the mint health status('healthy' | 'risky' )
   */
  async getMintHealth (params: { stakeAmount: string; mintAmount: string; validatorAddress: Hex }) {
    const health = await getMintHealth({
      connector: this.connector,
      mintedShares: this.parseEther(params.mintAmount),
      stakedAssets: this.parseEther(params.stakeAmount),
      vault: params.validatorAddress
    })

    return { health }
  }

  /**
   * Creates a batch of validators for native Ethereum staking.
   *
   * This method creates a new batch of validators using the Chorus One Native Staking API.
   * Each validator requires 32 ETH to be deposited. The batch will generate deposit data
   * that can be used to deposit validators on the Ethereum network.
   *
   * @param params - Parameters for creating the validator batch
   * @param params.batchId - Unique identifier for the batch
   * @param params.withdrawalAddress - The withdrawal address that will control the staked funds. It must be in 0x01 or 0x02 format.
   * @param params.feeRecipientAddress - The address that will receive MEV rewards
   * @param params.numberOfValidators - Number of validators to create (each requires 32 ETH)
   * @param params.isCompounding - (Optional) Whether to create compounding validators (0x02 withdrawal credentials). Default is false.
   * @param params.depositGweiPerValidator - (Optional) The deposit in gwei per validator. Default is 32000000000 gwei i.e. 32ETH.
   *
   * @returns Returns a promise that resolves to the batch creation response.
   */
  async createValidatorBatch (params: {
    batchId: string
    withdrawalAddress: `0x01${string}` | `0x02${string}`
    feeRecipientAddress: Hex
    numberOfValidators: number
    isCompounding?: boolean
    depositGweiPerValidator?: bigint
  }): Promise<CreateBatchResponse> {
    if (!this.nativeStakingConnector) {
      throw new Error('Native staking is not enabled. Please provide nativeStakingApiToken in constructor.')
    }

    const request: CreateBatchRequest = {
      batch_id: params.batchId,
      withdrawal_address: params.withdrawalAddress,
      fee_recipient: params.feeRecipientAddress,
      number_of_validators: params.numberOfValidators,
      network: this.nativeStakingConnector.network,
      is_compounding: params.isCompounding,
      deposit_gwei_per_validator: params.depositGweiPerValidator
    }

    return this.nativeStakingConnector.createBatch(request)
  }

  /**
   * Lists all validator batches for the authenticated tenant.
   *
   * This method retrieves all validator batches that have been created for the current tenant.
   *
   * @returns Returns a promise that resolves to an array of validator batches.
   */
  async listValidatorBatches (): Promise<ListBatchesResponse> {
    if (!this.nativeStakingConnector) {
      throw new Error('Native staking is not enabled. Please provide nativeStakingApiToken in constructor.')
    }

    return this.nativeStakingConnector.listBatches()
  }

  /**
   * Gets the status of a validator batch.
   *
   * This method retrieves the current status of a validator batch, including the deposit data
   * for each validator when ready.
   *
   * @param params - Parameters for getting batch status
   * @param params.batchId - The batch identifier
   *
   * @returns Returns a promise that resolves to the batch information.
   */
  async getValidatorBatchStatus (params: { batchId: string }): Promise<BatchDetailsResponse> {
    if (!this.nativeStakingConnector) {
      throw new Error('Native staking is not enabled. Please provide nativeStakingApiToken in constructor.')
    }
    return await this.nativeStakingConnector.getBatchDetails(params.batchId)
  }

  /**
   * Exports deposit data in the format required by the Ethereum Staking Launchpad.
   *
   * This method the deposit data for each validator in the batch, which can be used to deposit
   * validators with the oficial Ethereum Staking Launchpad or other depositing tools.
   *
   * @param params - Parameters for exporting deposit data
   * @param params.batchData -  Pre-fetched batch of validators
   *
   * @returns Returns a promise that resolves to an array of deposit data objects.
   */
  async exportDepositData ({
    batchData
  }: {
    batchData: BatchDetailsResponse
  }): Promise<{ depositData: BatchDetailsDepositData[] }> {
    if (batchData.status !== 'ready') {
      return { depositData: [] }
    }

    const depositData = batchData.validators
      .filter((validator) => validator.status === 'created')
      .map((validator) => validator.deposit_data)

    return { depositData }
  }

  /**
   * Builds deposit transactions for native Ethereum staking.
   *
   * This method creates transactions for depositing validators to the Ethereum deposit contract.
   * Each validator requires exactly 32 ETH to be deposited along with the deposit data.
   *
   * @param params - Parameters for building deposit transactions
   * @param params.batchData -  Pre-fetched batch of validators
   *
   * @returns Returns a promise that resolves to an array of deposit transactions.
   */
  async buildDepositTx ({ batchData }: { batchData: BatchDetailsResponse }): Promise<{ transactions: Transaction[] }> {
    if (batchData.status !== 'ready') {
      return { transactions: [] }
    }

    const validatorsToDeposit = batchData.validators.filter((validator) => validator.status === 'created')

    if (validatorsToDeposit.length === 0) {
      throw new Error('No validators found that need to be deposited. All validators may have already been deposited.')
    }

    const config = getNetworkConfig(this.network)

    const transactions: Transaction[] = []

    for (const validator of validatorsToDeposit) {
      const depositData = validator.deposit_data

      const depositFunctionData = this.encodeDepositFunction({
        pubkey: toHexString(depositData.pubkey),
        withdrawalCredentials: toHexString(depositData.withdrawal_credentials),
        signature: toHexString(depositData.signature),
        depositDataRoot: toHexString(depositData.deposit_data_root)
      })

      const transaction: Transaction = {
        to: config.depositContractAddress,
        value: parseEther('32'), // Each validator requires exactly 32 ETH
        data: depositFunctionData
      }

      transactions.push(transaction)
    }

    return { transactions }
  }

  /**
   * Encodes the deposit function call for the Ethereum deposit contract.
   */
  private encodeDepositFunction (params: {
    pubkey: Hex
    withdrawalCredentials: Hex
    signature: Hex
    depositDataRoot: Hex
  }): Hex {
    return encodeFunctionData({
      abi: depositAbi,
      functionName: 'deposit',
      args: [params.pubkey, params.withdrawalCredentials, params.signature, params.depositDataRoot]
    })
  }

  /**
   * Builds a withdrawal request transaction for a validator based on EIP-7002.
   *
   * This method creates a transaction that triggers a full validator exit through
   * the execution layer withdrawal credentials (0x01) as specified in EIP-7002.
   *
   * @param params - Parameters for building the withdrawal transaction
   * @param params.validatorPubkey - The validator public key (48 bytes)
   *
   * @returns Returns a promise that resolves to a withdrawal transaction.
   */
  async buildValidatorExitTx (params: { validatorPubkey: string }): Promise<{ tx: Transaction }> {
    const config = getNetworkConfig(this.network)

    const tx = await buildValidatorExitTx({
      ethPublicClient: this.connector.eth,
      config,
      validatorPubkey: params.validatorPubkey
    })

    return { tx }
  }

  /**
   * Signs a transaction using the provided signer.
   *
   * @param params - Parameters for the signing process
   * @param params.signer - A signer instance.
   * @param params.signerAddress - The address of the signer
   * @param params.tx - The transaction to sign
   * @param params.baseFeeMultiplier - (Optional) The multiplier for fees, which is used to manage fee fluctuations, is applied to the base fee per gas from the latest block to determine the final `maxFeePerGas`. The default value is 1.2.
   * @param params.defaultPriorityFee - (Optional) This overrides the the `maxPriorityFeePerGas` estimated by the RPC.
   *
   * @returns A promise that resolves to an object containing the signed transaction.
   */
  async sign (params: {
    signer: Signer
    signerAddress: Hex
    tx: Transaction
    baseFeeMultiplier?: number
    defaultPriorityFee?: string
  }): Promise<{ signedTx: Hex }> {
    const { signer, signerAddress, tx: tx, baseFeeMultiplier, defaultPriorityFee } = params

    const baseChain = this.connector.chain

    const baseFees = baseChain.fees ?? {}
    const fees = {
      ...baseFees,
      baseFeeMultiplier: baseFeeMultiplier ?? baseFees.baseFeeMultiplier,
      defaultPriorityFee:
        defaultPriorityFee === undefined ? baseFees.maxPriorityFeePerGas : this.parseEther(defaultPriorityFee)
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
      // Pin tx type to avoid type conflict with serializeTransaction bellow
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
   * @returns A promise that resolves to the final execution outcome of the broadcast transaction.
   */
  async broadcast (params: { signedTx: Hex }): Promise<{ txHash: Hex }> {
    const { signedTx } = params
    const hash = await this.connector.eth.sendRawTransaction({ serializedTransaction: signedTx })
    return { txHash: hash }
  }

  /**
   * Retrieves the status of a transaction using the transaction hash.
   *
   * @param params - Parameters for the transaction status request
   * @param params.txHash - The transaction hash to query
   *
   * @returns A promise that resolves to an object containing the transaction status.
   */
  async getTxStatus (params: { txHash: Hex }): Promise<EthereumTxStatus> {
    const { txHash } = params

    try {
      const tx = await this.connector.eth.getTransactionReceipt({
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

  private parseEther (amount: string): bigint {
    if (typeof amount === 'bigint')
      throw new Error(
        'Amount must be a string, denominated in ETH. e.g. "1.5" - 1.5 ETH. You can use `formatEther` to convert a `bigint` to a string'
      )
    if (typeof amount !== 'string')
      throw new Error('Amount must be a string, denominated in ETH. e.g. "1.5" - 1.5 ETH.')
    if (amount === '') throw new Error('Amount cannot be empty')
    let result: bigint
    try {
      result = parseEther(amount)
    } catch (e) {
      throw new Error('Amount must be a valid number denominated in ETH. e.g. "1.5" - 1.5 ETH')
    }
    if (result <= 0n) throw new Error('Amount must be greater than 0')
    return result
  }
}
