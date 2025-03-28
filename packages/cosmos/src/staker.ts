import type { DeliverTxResponse } from '@cosmjs/stargate'
import {
  genSignedTx,
  genSignDocSignature,
  genSignableTx,
  genDelegateOrUndelegateMsg,
  genBeginRedelegateMsg,
  genWithdrawRewardsMsg,
  publicKeyToAddress,
  publicKeyToEthBasedAddress,
  macroToDenomAmount,
  denomToMacroAmount,
  getAccount
} from './tx'
import type { Signer } from '@chorus-one/signer'
import { CosmosNetworkConfig, CosmosTxStatus } from './types'
import type { EncodeObject } from '@cosmjs/proto-signing'
import { Decimal } from '@cosmjs/math'
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin'
import { newCosmosClient, CosmosClient } from './client'
import BigNumber from 'bignumber.js'

/**
 * This class provides the functionality to stake, unstake, redelegate, and withdraw rewards for Cosmos-based blockchains.
 *
 * It also provides the ability to retrieve staking information and rewards for a delegator.
 *
 */
export class CosmosStaker {
  private readonly networkConfig: CosmosNetworkConfig

  private chainID?: string
  private cosmosClient?: CosmosClient

  /**
   * This **static** method is used to derive an address from a public key.
   *
   * It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.
   *
   * @param params - Parameters for the address derivation
   * @param params.bechPrefix - Address prefix (e.g. celestia)
   * @param params.isEVM - (Optional) Use different address derivation logic for EVM compatible chains (e.g. evmos, zetachain)
   *
   * @returns Returns an array containing the derived address.
   */
  static getAddressDerivationFn =
    (params: { bechPrefix: string; isEVM?: boolean }) =>
    async (publicKey: Uint8Array, _derivationPath: string): Promise<Array<string>> => {
      const { bechPrefix, isEVM } = params

      if (isEVM) {
        return [publicKeyToEthBasedAddress(publicKey, bechPrefix)]
      }
      return [publicKeyToAddress(publicKey, bechPrefix)]
    }

  /**
   * This creates a new CosmosStaker instance.
   *
   * @param params - Initialization parameters
   * @param params.rpcUrl - RPC URL (e.g. https://celestia.chorus.one:443) Please note that `:port` is required
   * @param params.lcdUrl - LCD URL (e.g. https://celestia-lcd.chorus.one:443) Please note that `:port` is required
   * @param params.bechPrefix - Address prefix (e.g. celestia)
   * @param params.denom - Coin denom (e.g `utia`)
   * @param params.denomMultiplier - Multiplier to convert the base coin unit to its smallest subunit (e.g., `1000000` for 1 TIA = 1000000 utia)
   * @param params.gas - Default TX gas (e.g 200000)
   * @param params.gasPrice - Gas price (e.g "0.4") See: [Chain registry - Celestia](https://github.com/cosmos/chain-registry/blob/master/celestia/chain.json)
   * @param params.fee - (Optional) Override with a fixed fee (e.g "5000" for "5000 uatom" or "0.005 ATOM")
   * @param params.isEVM - (Optional) Use different address derivation logic for EVM compatible chains (e.g. evmos, zetachain)
   *
   * @returns  An instance of CosmosStaker.
   */
  constructor (params: {
    rpcUrl: string
    lcdUrl: string
    bechPrefix: string
    denom: string
    denomMultiplier: string
    gas: number
    gasPrice: string
    fee?: string
    isEVM?: boolean
  }) {
    const { ...networkConfig } = params
    this.networkConfig = networkConfig
  }

  /**
   * Initializes the CosmosStaker instance and connects to the blockchain.
   *
   * @returns A promise which resolves once the CosmosStaker instance has been initialized.
   */
  async init (): Promise<void> {
    const cosmosClient = await newCosmosClient(this.networkConfig.rpcUrl)

    this.chainID = await cosmosClient.getChainId()
    this.cosmosClient = cosmosClient
  }

  /**
   * Builds a staking (delegation) transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address to stake from
   * @param params.validatorAddress - The validator address to stake to
   * @param params.amount - The amount to stake, specified in base units of the native token (e.g. `ATOM` for Cosmos or `TIA` for Celestia)
   *
   * @returns Returns a promise that resolves to a Cosmos staking transaction.
   */
  async buildStakeTx (params: {
    delegatorAddress: string
    validatorAddress: string
    amount: string
  }): Promise<{ tx: EncodeObject }> {
    const { delegatorAddress, validatorAddress, amount } = params
    const amountInDenom = macroToDenomAmount(amount, this.networkConfig.denomMultiplier)
    return {
      tx: genDelegateOrUndelegateMsg(this.networkConfig, 'delegate', delegatorAddress, validatorAddress, amountInDenom)
    }
  }

  /**
   * Builds an unstaking (undelegate) transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address that is unstaking
   * @param params.validatorAddress - The validator address to unstake from
   * @param params.amount - The amount to unstake, specified in base units of the native token (e.g. `ATOM` for Cosmos or `TIA` for Celestia)
   *
   * @returns Returns a promise that resolves to a Cosmos unstaking transaction.
   */
  async buildUnstakeTx (params: {
    delegatorAddress: string
    validatorAddress: string
    amount: string
  }): Promise<{ tx: EncodeObject }> {
    const { delegatorAddress, validatorAddress, amount } = params
    const amountInDenom = macroToDenomAmount(amount, this.networkConfig.denomMultiplier)
    return {
      tx: genDelegateOrUndelegateMsg(
        this.networkConfig,
        'undelegate',
        delegatorAddress,
        validatorAddress,
        amountInDenom
      )
    }
  }
  /**
   * Builds a redelegation transaction.
   * - This allows a wallet to redelegate staked assets to a different validator without unstaking.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorSrcAddress - The source validator address to redelegate from
   * @param params.validatorDstAddress - The destination validator address to redelgate to
   * @param params.amount - The amount to redelegate, specified in base units of the native token (e.g. `ATOM` for Cosmos or `TIA` for Celestia)
   *
   * @returns Returns a promise that resolves to a Cosmos redelegation transaction.
   */
  async buildRedelegateTx (params: {
    delegatorAddress: string
    validatorSrcAddress: string
    validatorDstAddress: string
    amount: string
  }): Promise<{ tx: EncodeObject }> {
    const { delegatorAddress, validatorSrcAddress, validatorDstAddress, amount } = params
    const amountInDenom = macroToDenomAmount(amount, this.networkConfig.denomMultiplier)
    return {
      tx: genBeginRedelegateMsg(
        this.networkConfig,
        delegatorAddress,
        validatorSrcAddress,
        validatorDstAddress,
        amountInDenom
      )
    }
  }

  /**
   * Builds a withdraw (claim) rewards transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator address to withdraw (claim) rewards from
   *
   * @returns Returns a promise that resolves to a Cosmos withdraw (claim) rewards transaction.
   */
  async buildWithdrawRewardsTx (params: {
    delegatorAddress: string
    validatorAddress: string
  }): Promise<{ tx: EncodeObject }> {
    const { delegatorAddress, validatorAddress } = params
    return {
      tx: genWithdrawRewardsMsg(delegatorAddress, validatorAddress)
    }
  }

  /**
   * Retrieves the staked balance for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - (Optional) The validator address to gather staking information from
   *
   * @returns Returns a promise that resolves to the staking information for the specified delegator.
   */
  async getStake (params: { delegatorAddress: string; validatorAddress?: string }): Promise<{ balance: string }> {
    const { delegatorAddress, validatorAddress } = params

    const cosmosClient = this.getClient()

    let staked: Coin | null = null
    if (validatorAddress) {
      staked = await cosmosClient.getDelegation(delegatorAddress, validatorAddress)
    } else {
      staked = await cosmosClient.getBalanceStaked(delegatorAddress)
    }

    if (staked === null) {
      return { balance: '0' }
    }

    if (staked.denom !== this.networkConfig.denom) {
      throw new Error('unexpected denom: ' + staked.denom)
    }

    return { balance: denomToMacroAmount(staked.amount, this.networkConfig.denomMultiplier) }
  }

  /**
   * Retrieves the unbonding balance for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - (Optional) The validator address to gather staking information from
   *
   * @returns Returns a promise that resolves to the unbonding information for the specified delegator.
   */
  async getUnbondingStake (params: {
    delegatorAddress: string
    validatorAddress?: string
  }): Promise<{ balance: string }> {
    const { delegatorAddress, validatorAddress } = params

    const queryClient = this.getClient().getCosmosQueryClient().staking
    const response = await queryClient.delegatorUnbondingDelegations(delegatorAddress)

    let totalUnbonding = 0n
    response.unbondingResponses.forEach((unbondingDelegation) => {
      if (validatorAddress !== undefined && validatorAddress !== unbondingDelegation.validatorAddress) {
        return
      }

      // NOTE: the unbonding entries have no denom, but we can assume that they are all related
      // to the configured staking token
      const totalPerValidator = unbondingDelegation.entries
        .map((entry) => {
          return BigInt(entry.balance)
        })
        .reduce((a: bigint, b: bigint) => a + b, BigInt(0))

      totalUnbonding += totalPerValidator
    })

    return { balance: denomToMacroAmount(totalUnbonding.toString(10), this.networkConfig.denomMultiplier) }
  }

  /**
   * Retrieves the delegator's available balance.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   *
   * @returns Returns a promise that resolves to the available balance for the specified delegator.
   */
  async getBalance (params: { delegatorAddress: string }): Promise<{ balance: string }> {
    const { delegatorAddress } = params

    const cosmosClient = this.getClient()
    const denom = this.networkConfig.denom

    const balance = await cosmosClient.getBalance(delegatorAddress, denom)

    return { balance: denomToMacroAmount(balance.amount, this.networkConfig.denomMultiplier) }
  }

  /**
   * Retrieves the rewards data for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator address to gather rewards data from
   * @param params.denom - (Optional) The rewards coin denominator (default is the network denom)
   * @param params.denomMultiplier - (Optional) The rewards coin denom multiplier (default is the network denom multiplier)
   *
   * @returns Returns a promise that resolves to the rewards data for the specified delegator.
   */
  async getRewards (params: {
    delegatorAddress: string
    validatorAddress?: string
    denom?: string
    denomMultiplier?: string
  }): Promise<{ rewards: string }> {
    const cosmosClient = this.getClient()
    const { delegatorAddress, validatorAddress, denom, denomMultiplier } = params

    const expectedDenom = denom ?? this.networkConfig.denom
    const multiplier = denomMultiplier ?? this.networkConfig.denomMultiplier
    const validators: string[] = []

    if (validatorAddress === undefined) {
      const validatorsResponse = await cosmosClient
        .getCosmosQueryClient()
        .distribution.delegatorValidators(delegatorAddress)
      validatorsResponse.validators.forEach((v: string) => validators.push(v))
    } else {
      validators.push(validatorAddress)
    }

    if (validators.length === 0) {
      throw new Error('no validators found')
    }

    const queryClient = cosmosClient.getCosmosQueryClient()

    const rewardsPromises = validators.map(async (validatorAddress) => {
      const r = await queryClient.distribution.delegationRewards(delegatorAddress, validatorAddress)
      const sum: BigNumber = r.rewards
        .filter((r) => r.denom === expectedDenom)
        .map((r) => BigNumber(Decimal.fromAtomics(r.amount, 18).toString()))
        .reduce((a: BigNumber, b: BigNumber) => a.plus(b), BigNumber(0))

      return sum
    })

    const rewards = await Promise.all(rewardsPromises)
    const sum = rewards.reduce((a: BigNumber, b: BigNumber) => a.plus(b), BigNumber(0))

    return { rewards: denomToMacroAmount(sum.toString(10), multiplier) }
  }

  /**
   * Signs a transaction using the provided signer.
   *
   * @param params - Parameters for the signing process
   * @param params.signer - Signer instance
   * @param params.signerAddress - The address of the signer
   * @param params.tx - The transaction to sign
   * @param params.memo - An optional memo to include with the transaction
   *
   * @returns A promise that resolves to an object containing the signed transaction.
   */
  async sign (params: {
    signer: Signer
    signerAddress: string
    tx: EncodeObject
    memo?: string
  }): Promise<{ signedTx: Uint8Array }> {
    const cosmosClient = this.getClient()
    const chainID = this.getChainID()

    const { signer, signerAddress, tx, memo } = params

    const acc = await getAccount(cosmosClient, this.networkConfig.lcdUrl, signerAddress)
    const signDoc = await genSignableTx(this.networkConfig, chainID, tx, acc.accountNumber, acc.sequence, memo ?? '')

    const isEVM = this.networkConfig.isEVM ?? false
    const { sig, pk } = await genSignDocSignature(signer, acc, signDoc, isEVM)

    const pkType = isEVM ? acc.pubkey?.type ?? undefined : undefined
    const signedTx = genSignedTx(signDoc, sig, pk, pkType)

    // IMPORTANT: verify that signer address matches derived address from signature
    const addressFromPK = (await CosmosStaker.getAddressDerivationFn(this.networkConfig)(pk, ''))[0]

    if (addressFromPK !== signerAddress) {
      throw new Error(
        'address derived from signed message public key is different from the expected signer address: ' +
          addressFromPK +
          ' != ' +
          signerAddress
      )
    }

    const txBytes = TxRaw.encode(signedTx).finish()

    return { signedTx: txBytes }
  }

  /**
   * This method is used to broadcast a signed transaction to the Cosmos network.
   *
   * @param params - Parameters for the broadcast
   * @param params.signedTx - The signed transaction to be broadcasted
   *
   * @returns Returns a promise that resolves to the response of the transaction that was broadcast to the network.
   */
  async broadcast (params: { signedTx: Uint8Array }): Promise<DeliverTxResponse> {
    const cosmosClient = this.getClient()
    const { signedTx } = params
    return await cosmosClient.broadcastTx(signedTx)
  }

  /**
   * Retrieves the status of a transaction using the transaction hash.
   *
   * @param params - Parameters for the transaction status request
   * @param params.txHash - The transaction hash to query
   *
   * @returns A promise that resolves to an object containing the transaction status.
   */
  async getTxStatus (params: { txHash: string }): Promise<CosmosTxStatus> {
    const cosmosClient = this.getClient()
    const { txHash } = params
    const tx = await cosmosClient.getTx(txHash)

    if (tx === null) {
      return { status: 'unknown', receipt: null }
    }

    if (tx.code !== 0) {
      return { status: 'failure', receipt: tx }
    }

    return { status: 'success', receipt: tx }
  }

  private getClient (): CosmosClient {
    if (!this.cosmosClient) {
      throw new Error('CosmosStaker instance not initialized. Did you forget to call init()?')
    }
    return this.cosmosClient
  }

  private getChainID (): string {
    if (!this.chainID) {
      throw new Error('CosmosStaker instance not initialized. Did you forget to call init()?')
    }
    return this.chainID
  }
}
