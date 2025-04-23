import {
  Connection,
  Commitment,
  Lockup,
  PublicKey,
  Keypair,
  StakeProgram,
  Authorized,
  ParsedAccountData,
  GetVersionedTransactionConfig,
  VersionedTransaction,
  TransactionMessage
} from '@solana/web3.js'
import { getDenomMultiplier, macroToDenomAmount, denomToMacroAmount } from './tx'
import type { Signer } from '@chorus-one/signer'
import { SolanaSigningData, SolanaTxStatus, SolanaNetworkConfig, SolanaTransaction, StakeAccount } from './types'

/**
 * This class provides the functionality to stake, unstake, and withdraw for Solana blockchains.
 *
 * It also provides the ability to retrieve staking information and rewards for an account.
 */
export class SolanaStaker {
  private readonly networkConfig: SolanaNetworkConfig
  private commitment: Commitment
  private connection?: Connection

  /**
   * This **static** method is used to derive an address from a public key.
   *
   * It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.
   *
   * @returns Returns an array containing the derived address.
   */
  static getAddressDerivationFn =
    () =>
    async (publicKey: Uint8Array, _derivationPath: string): Promise<Array<string>> => {
      const pk = new PublicKey(publicKey)
      return [pk.toBase58()]
    }

  /**
   * Creates a SolanaStaker instance.
   *
   * @param params - Initialization configuration
   * @param params.rpcUrl - The URL of the SOLANA network RPC endpoint
   * @param params.commitment - (Optional) The level of commitment desired when querying the blockchain. Default is 'confirmed'.
   *
   * @returns  An instance of SolanaStaker.
   */
  constructor (params: { rpcUrl: string; commitment?: Commitment }) {
    const { ...networkConfig } = params

    this.networkConfig = networkConfig
    this.commitment = networkConfig.commitment || 'confirmed'
  }

  /**
   * Initializes the SolanaStaker instance and connects to the blockchain.
   *
   * @returns A promise which resolves once the SolanaStaker instance has been initialized.
   */
  async init (): Promise<void> {
    this.connection = new Connection(this.networkConfig.rpcUrl, this.commitment)
  }

  /**
   * Builds a new stake account transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.ownerAddress - The stake account owner's address
   * @param params.amount - The amount to stake, specified in `SOL`
   *
   * @returns Returns a promise that resolves to new stake account transaction.
   */
  async buildCreateStakeAccountTx (params: {
    ownerAddress: string
    amount: string
  }): Promise<{ tx: SolanaTransaction; stakeAccountAddress: string }> {
    const connection = this.getConnection()
    const { ownerAddress, amount } = params

    const amountInLamports = macroToDenomAmount(amount, getDenomMultiplier())
    const mininmumStakeAmount = await connection.getMinimumBalanceForRentExemption(StakeProgram.space)

    if (amountInLamports < mininmumStakeAmount) {
      throw new Error(`Amount must be greater than ${mininmumStakeAmount / Number(getDenomMultiplier())}`)
    }

    // stake account owner
    const ownerPublicKey = new PublicKey(ownerAddress)

    // randomly generated stake account
    const stakeAccount = Keypair.generate()

    const tx = StakeProgram.createAccount({
      fromPubkey: ownerPublicKey,
      stakePubkey: stakeAccount.publicKey,
      authorized: new Authorized(ownerPublicKey, ownerPublicKey),
      lamports: amountInLamports,
      lockup: new Lockup(0, 0, ownerPublicKey)
    })

    return {
      tx: { tx, additionalKeys: [stakeAccount] },
      stakeAccountAddress: stakeAccount.publicKey.toBase58()
    }
  }

  /**
   * Builds a staking transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.ownerAddress - The stake account owner's address
   * @param params.validatorAddress - The validatiors vote account address to delegate the stake to
   * @param params.stakeAccountAddress - The stake account address to delegate from. If not provided, a new stake account will be created.
   * @param params.amount - The amount to stake, specified in `SOL`. If `stakeAccountAddress` is not provided, this parameter is required.
   *
   * @returns Returns a promise that resolves to a SOLANA staking transaction.
   */
  async buildStakeTx (params: {
    ownerAddress: string
    validatorAddress: string
    stakeAccountAddress?: string
    amount?: string
  }): Promise<{ tx: SolanaTransaction; stakeAccountAddress: string }> {
    const { ownerAddress, stakeAccountAddress, validatorAddress, amount } = params

    let stakeAccountAddr: string | undefined
    let createAccountTx: SolanaTransaction | undefined

    if (stakeAccountAddress === undefined) {
      if (amount === undefined) {
        throw new Error('with stakeAccountAddress not being present, amount must be defined')
      }

      const createStakeAccountTx = await this.buildCreateStakeAccountTx({
        ownerAddress,
        amount: amount
      })

      stakeAccountAddr = createStakeAccountTx.stakeAccountAddress
      createAccountTx = createStakeAccountTx.tx
    } else {
      // ensure the stake account exists
      const data = await this.getStakeAccounts({ ownerAddress })
      if (!data.accounts.some((account) => account.address === stakeAccountAddress)) {
        throw new Error(`Stake account ${stakeAccountAddress} not found for owner ${ownerAddress}`)
      }

      stakeAccountAddr = stakeAccountAddress
    }

    const delegateTx = StakeProgram.delegate({
      stakePubkey: new PublicKey(stakeAccountAddr),
      authorizedPubkey: new PublicKey(ownerAddress),
      votePubkey: new PublicKey(validatorAddress)
    })

    const delegateSolanaTx = {
      tx: delegateTx,
      additionalKeys: []
    }

    // combine createStakeAccountTx with delegateStakeTx transactions
    const finalTx =
      createAccountTx !== undefined ? combineTransactions(createAccountTx, delegateSolanaTx) : delegateSolanaTx

    return { tx: finalTx, stakeAccountAddress: stakeAccountAddr }
  }

  /**
   * Builds an unstaking transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.ownerAddress - The stake account owner's address
   * @param params.stakeAccountAddress - The stake account address to deactivate
   *
   * @returns Returns a promise that resolves to a SOLANA unstaking transaction.
   */
  async buildUnstakeTx (params: {
    ownerAddress: string
    stakeAccountAddress: string
  }): Promise<{ tx: SolanaTransaction }> {
    const { ownerAddress, stakeAccountAddress } = params
    const stakePubkey = new PublicKey(stakeAccountAddress)
    const stakeState = await this.getStakeAccounts({ ownerAddress, withStates: true })

    const foundStakeAccount = stakeState.accounts.find((account) => account.address === stakeAccountAddress)
    if (foundStakeAccount === undefined) {
      throw new Error(`stake account ${stakeAccountAddress} not found for owner ${ownerAddress}`)
    }

    if (foundStakeAccount.state !== 'delegated') {
      throw new Error(
        `stake account ${stakeAccountAddress} is not delegated, current status: ${foundStakeAccount.state}`
      )
    }

    const deactivateTx = StakeProgram.deactivate({
      stakePubkey,
      authorizedPubkey: new PublicKey(ownerAddress)
    })

    return { tx: { tx: deactivateTx } }
  }

  /**
   * Builds a withdraw stake transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.ownerAddress - The stake account owner's address
   * @param params.stakeAccountAddress - The stake account address to withdraw funds from
   * @param params.amount - The amount to withdraw, specified in `SOL`. If not provided, the entire stake amount will be withdrawn.
   *
   * @returns Returns a promise that resolves to a SOLANA withdraw stake transaction.
   */
  async buildWithdrawStakeTx (params: {
    ownerAddress: string
    stakeAccountAddress: string
    amount?: string
  }): Promise<{ tx: SolanaTransaction }> {
    const connection = this.getConnection()
    const { ownerAddress, stakeAccountAddress, amount } = params

    const stakeBalance =
      amount === undefined || amount == '0'
        ? await connection.getBalance(new PublicKey(stakeAccountAddress))
        : macroToDenomAmount(amount, getDenomMultiplier())

    const withdrawTx = StakeProgram.withdraw({
      stakePubkey: new PublicKey(stakeAccountAddress),
      authorizedPubkey: new PublicKey(ownerAddress),
      toPubkey: new PublicKey(ownerAddress),
      lamports: stakeBalance
    })

    return { tx: { tx: withdrawTx } }
  }

  /**
   * Builds a merge stake transaction.
   *
   * Please note there are conditions for merging stake accounts:
   * https://docs.solana.com/staking/stake-accounts#merging-stake-accounts
   *
   * @param params - Parameters for building the transaction
   * @param params.ownerAddress - The stake account owner's address
   * @param params.sourceAddress - The stake account address to merge funds from
   * @param params.destinationAddress - The stake account address to merge funds to
   *
   * @returns Returns a promise that resolves to a SOLANA merge stake transaction.
   */
  async buildMergeStakesTx (params: {
    ownerAddress: string
    sourceAddress: string
    destinationAddress: string
  }): Promise<{ tx: SolanaTransaction }> {
    const { ownerAddress, sourceAddress, destinationAddress } = params

    const mergeTx = StakeProgram.merge({
      sourceStakePubKey: new PublicKey(sourceAddress),
      stakePubkey: new PublicKey(destinationAddress),
      authorizedPubkey: new PublicKey(ownerAddress)
    })

    return { tx: { tx: mergeTx } }
  }

  /**
   * Builds a split stake transaction.
   *
   * @param params - Parameters for building the transaction
   * @param params.ownerAddress - The stake account owner's address
   * @param params.stakeAccountAddress - The stake account address to split funds from
   * @param params.amount - The amount to transfer from stakeAccountAddress to new staking account, specified in `SOL`
   *
   * @returns Returns a promise that resolves to a SOLANA split stake transaction.
   */
  async buildSplitStakeTx (params: {
    ownerAddress: string
    stakeAccountAddress: string
    amount: string
  }): Promise<{ tx: SolanaTransaction; stakeAccountAddress: string }> {
    const connection = this.getConnection()
    const { ownerAddress, stakeAccountAddress, amount } = params

    const amountInLamports = macroToDenomAmount(amount, getDenomMultiplier())
    const mininmumStakeAmount = await connection.getMinimumBalanceForRentExemption(StakeProgram.space)

    const newStakeAccount = Keypair.generate()

    const splitTx = StakeProgram.split(
      {
        stakePubkey: new PublicKey(stakeAccountAddress),
        authorizedPubkey: new PublicKey(ownerAddress),
        splitStakePubkey: newStakeAccount.publicKey,
        lamports: amountInLamports
      },
      mininmumStakeAmount
    )

    return {
      tx: { tx: splitTx, additionalKeys: [newStakeAccount] },
      stakeAccountAddress: newStakeAccount.publicKey.toBase58()
    }
  }

  /**
   * Retrieves the staking information for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.ownerAddress - The stake account owner's address
   * @param params.validatorAddress - (Optional) The validator address to gather staking information from
   * @param params.state - (Optional) The stake account state to filter by (default: 'delegated')
   *
   * @returns Returns a promise that resolves to the staking information for the specified delegator.
   */
  async getStake (params: {
    ownerAddress: string
    validatorAddress?: string
    state?: 'delegated' | 'undelegated' | 'deactivating' | 'all'
  }): Promise<{ balance: string }> {
    const { ownerAddress, validatorAddress, state } = params

    const stakeAccountState = state || 'delegated'
    const stakeAccounts = await this.getStakeAccounts({
      ownerAddress,
      validatorAddress,
      withStates: true,
      withMacroDenom: true
    })

    const total = stakeAccounts.accounts
      .filter((account) => {
        if (stakeAccountState === 'all') {
          return true
        }
        return account.state === stakeAccountState
      })
      .map((account) => account.amount)
      .reduce((acc, cur) => acc + cur, 0)

    return { balance: total.toString() }
  }

  /**
   * Signs a transaction using the provided signer.
   *
   * @param params - Parameters for the signing process
   * @param params.signer - A signer instance.
   * @param params.signerAddress - The address of the signer
   * @param params.tx - The transaction to sign
   *
   * @returns A promise that resolves to an object containing the signed transaction.
   */
  async sign (params: {
    signer: Signer
    signerAddress: string
    tx: SolanaTransaction
  }): Promise<{ signedTx: VersionedTransaction }> {
    const connection = this.getConnection()
    const { signer, signerAddress, tx } = params
    const { blockhash } = await connection.getLatestBlockhash()
    const versionedTransaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: new PublicKey(signerAddress),
        recentBlockhash: blockhash,
        instructions: tx.tx.instructions
      }).compileToV0Message()
    )

    const serializedMessage = versionedTransaction.message.serialize()
    let message: string = ''
    if (Buffer.isBuffer(serializedMessage)) {
      message = serializedMessage.toString('hex')
    } else {
      message = Buffer.from(serializedMessage).toString('hex')
    }

    const keys = tx.additionalKeys || []
    if (keys.length > 0) {
      versionedTransaction.sign(keys)
    }
    const signingData: SolanaSigningData = { tx }

    const { sig, pk } = await signer.sign(signerAddress, { message, data: signingData }, { note: '' })
    const signatureBytes = Uint8Array.from(Buffer.from(sig.fullSig, 'hex'))
    versionedTransaction.addSignature(new PublicKey(pk), signatureBytes)

    return { signedTx: versionedTransaction }
  }

  /**
   * Broadcasts a signed transaction to the network.
   *
   * @param params - Parameters for the broadcast process
   * @param params.signedTx - The signed transaction to broadcast
   *
   * @returns A promise that resolves to the final execution outcome of the broadcast transaction.
   *
   */
  async broadcast (params: { signedTx: VersionedTransaction }): Promise<{
    txHash: string
    slot: number
    error: any
  }> {
    const connection = this.getConnection()
    const { signedTx } = params

    if (signedTx.signatures.length == 0) {
      throw new Error('the provided transaction is not signed')
    }

    const signature = await connection.sendRawTransaction(signedTx.serialize())
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(this.commitment)
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight
      },
      this.commitment
    )

    return {
      txHash: signature,
      slot: confirmation.context.slot,
      error: confirmation.value.err
    }
  }

  /**
   * Retrieves the status of a transaction using the transaction hash.
   *
   * @param params - Parameters for the transaction status request
   * @param params.txHash - The transaction hash to query
   *
   * @returns A promise that resolves to an object containing the transaction status.
   */
  async getTxStatus (params: { txHash: string }): Promise<SolanaTxStatus> {
    const connection = this.getConnection()
    const { txHash } = params

    const txConfig: GetVersionedTransactionConfig = {
      commitment: this.commitment == 'confirmed' ? 'confirmed' : 'finalized',
      maxSupportedTransactionVersion: 0
    }
    const tx = await connection.getTransaction(txHash, txConfig)

    if (tx === null) {
      return { status: 'unknown', receipt: null }
    }

    if (tx.meta === null || tx.meta === undefined) {
      return { status: 'unknown', receipt: tx }
    }

    if (tx.meta?.err !== null) {
      return { status: 'failure', receipt: tx }
    }

    return { status: 'success', receipt: tx }
  }

  /**
   * Retrieves the stake accounts associated with an owner address.
   *
   * @param params - Parameters for the broadcast process
   * @param params.ownerAddress - The stake account owner's address
   * @param params.validatorAddress - (Optional) The validator address to filter the stake accounts by
   * @param params.withStates - (Optional) If true, the state of the stake account will be included in the response
   * @param params.withMacroDenom - (Optional) If true, the stake account balance will be returned in `SOL` denomination
   *
   * @returns A promise that resolves to stake account list.
   */
  async getStakeAccounts (params: {
    ownerAddress: string
    validatorAddress?: string
    withStates?: boolean
    withMacroDenom?: boolean
  }): Promise<{ accounts: StakeAccount[] }> {
    const connection = this.getConnection()
    const { ownerAddress, validatorAddress, withStates, withMacroDenom } = params

    const filters = [
      {
        memcmp: {
          offset: 44,
          bytes: ownerAddress
        }
      }
    ]

    if (validatorAddress !== undefined) {
      filters.push({
        memcmp: {
          offset: 124,
          bytes: validatorAddress
        }
      })
    }

    const currentStakeAccounts = await connection.getParsedProgramAccounts(StakeProgram.programId, {
      commitment: this.commitment,
      filters
    })
    const currentEpoch = (await connection.getEpochInfo()).epoch

    const accounts = currentStakeAccounts.map((account) => {
      let state: 'delegated' | 'undelegated' | 'deactivating' = 'undelegated'
      let stakedTo: string | undefined = validatorAddress

      if (withStates) {
        if (Buffer.isBuffer(account.account.data)) {
          throw new Error('account data is not parsed')
        }

        // reference:
        // https://github.com/solana-labs/solana/blob/27eff8408b7223bb3c4ab70523f8a8dca3ca6645/account-decoder/src/parse_stake.rs#L33
        const parsed: ParsedAccountData = account.account.data.parsed
        if (parsed['type'] === 'delegated') {
          const delegation = parsed['info']['stake']['delegation']
          state = 'delegated'

          if (
            // 2^64 - 1 = 18446744073709551615 (max value for uint64)
            BigInt(delegation['deactivationEpoch']) < BigInt('18446744073709551615')
          ) {
            state = 'deactivating'

            // solana doesn't cleanup the delegation info even though the stake is deactivated
            if (BigInt(delegation['deactivationEpoch']) < BigInt(currentEpoch)) {
              state = 'undelegated'
            } else {
              if (BigInt(delegation['deactivationEpoch']) == BigInt(delegation['activationEpoch'])) {
                state = 'deactivating'
              }
            }
          }
        }

        if (validatorAddress === undefined && ['delegated', 'deactivating'].includes(state)) {
          stakedTo = parsed['info']['stake']['delegation']['voter']
        }
      }

      return {
        address: account.pubkey.toBase58(),
        amount: withMacroDenom
          ? denomToMacroAmount(account.account.lamports.toString(), getDenomMultiplier())
          : account.account.lamports,
        state,
        validatorAddress: stakedTo
      }
    })

    return { accounts }
  }

  private getConnection (): Connection {
    if (this.connection === undefined) {
      throw new Error('SolanaStaker not initialized. Did you forget to call init()?')
    }
    return this.connection
  }
}

function combineTransactions (tx1: SolanaTransaction, tx2: SolanaTransaction): SolanaTransaction {
  tx1.tx.instructions.push(...tx2.tx.instructions)
  tx1.tx.signatures.push(...tx2.tx.signatures)
  if (tx2.additionalKeys !== undefined) {
    if (tx1.additionalKeys === undefined) {
      tx1.additionalKeys = []
    }
    tx1.additionalKeys.push(...tx2.additionalKeys)
  }

  return tx1
}
