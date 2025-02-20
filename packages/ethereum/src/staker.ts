import type { Signer } from '@chorus-one/signer'
import { publicKeyConvert } from 'secp256k1'
import { Chain, createWalletClient, formatEther, Hex, http, keccak256, parseEther, serializeTransaction } from 'viem'
import { StakewiseConnector } from './lib/connector'

import {
  buildStakeTx,
  buildUnstakeTx,
  buildWithdrawTx,
  buildMintTx,
  buildBurnTx,
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

/**
 * This class provides the functionality to stake, unstake, and withdraw for Ethereum network.
 *
 * It also provides the ability to retrieve staking information and rewards for an account.
 */
export class EthereumStaker {
  private connector: StakewiseConnector

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
      const pkUncompressed = publicKeyConvert(publicKey, false)
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
   *
   * @returns  An instance of EthereumStaker.
   */
  constructor (params: { network: Networks; rpcUrl?: string }) {
    const network = params.network

    this.connector = new StakewiseConnector(network, params.rpcUrl)
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

    return queue.map((item) => ({
      positionTicket: item.positionTicket.toString(),
      timestamp: item.when.getTime(),
      isWithdrawable: item.isWithdrawable,
      totalAmount: formatEther(item.totalAssets),
      withdrawableAmount: formatEther(item.withdrawableAssets)
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
      balance: formatEther(mint.minted.mintedWithoutFee),
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
   *
   * @returns Returns a promise that resolves to the mint health status('healthy' | 'moderate' | 'risky' | 'unhealthy')
   */
  async getMintHealth (params: { stakeAmount: string; mintAmount: string }) {
    const health = await getMintHealth({
      connector: this.connector,
      mintedShares: this.parseEther(params.mintAmount),
      stakedAssets: this.parseEther(params.stakeAmount)
    })

    return { health }
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
        defaultPriorityFee === undefined ? baseFees.defaultPriorityFee : this.parseEther(defaultPriorityFee)
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
      data: tx.data
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
