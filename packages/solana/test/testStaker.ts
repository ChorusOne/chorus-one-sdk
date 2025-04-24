import { SolanaStaker, StakeAccount } from '@chorus-one/solana'
import { LocalSigner } from '@chorus-one/signer-local'
import { KeyType } from '@chorus-one/signer'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import * as bip39 from 'bip39'
import { derivePath, getPublicKey } from 'ed25519-hd-key'
import type { Logger } from '@chorus-one/utils'

/**
 * SolanaTestStaker is a utility class to simplify testing Solana staking operations.
 * It manages:
 * - Initialization from a consistent mnemonic
 * - Address derivation
 * - Account funding
 * - Staking operations
 */
export class SolanaTestStaker {
  private mnemonic: string
  public hdPath: string
  public ownerAddress: string
  public validatorAddress: string
  public staker: SolanaStaker
  public localSigner: LocalSigner
  public connection: Connection
  public logger: Logger

  /**
   * Creates a new instance of SolanaTestStaker
   * @param params Configuration parameters
   */
  constructor (params: { mnemonic: string; rpcUrl?: string; validatorAddress?: string; logger?: Logger }) {
    if (!params.mnemonic) {
      throw new Error('Mnemonic is required')
    }

    this.mnemonic = params.mnemonic
    this.hdPath = "m/44'/501'/0'/0'"
    this.validatorAddress = params.validatorAddress || '8pPNjm5F2xGUG8q7fFwNLcDmAnMDRamEotiDZbJ5seqo'
    this.logger = params.logger || {
      info: (...args: unknown[]) => console.log('[TEST]', ...args),
      error: (...args: unknown[]) => console.error('[TEST]', ...args)
    }

    const rpcUrl = params.rpcUrl || 'https://api.devnet.solana.com'
    this.connection = new Connection(rpcUrl)
    this.staker = new SolanaStaker({ rpcUrl })
  }

  /**
   * Initializes the staker, derives the owner address, and initializes the signer
   */
  async init (): Promise<void> {
    const seed = bip39.mnemonicToSeedSync(this.mnemonic)
    const { key } = derivePath(this.hdPath, Buffer.from(seed).toString('hex'))
    const publicKey = getPublicKey(key, false)
    this.ownerAddress = new PublicKey(publicKey).toString()
    this.logger.info(`Owner address: ${this.ownerAddress}`)

    await this.staker.init()

    this.localSigner = new LocalSigner({
      mnemonic: this.mnemonic,
      accounts: [{ hdPath: this.hdPath }],
      keyType: KeyType.ED25519,
      addressDerivationFn: SolanaStaker.getAddressDerivationFn(),
      logger: this.logger
    })
    await this.localSigner.init()
  }

  /**
   * Get the current balance of the owner account and log it
   * @param address The address to check the balance for
   * @returns The balance in SOL
   */
  async getBalance (address: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(address)
    this.logger.info(`Current balance: ${balance} SOL`)
    return balance / LAMPORTS_PER_SOL
  }

  /**
   * Request an airdrop of SOL if the balance is below the threshold
   * This operation is heavily rate-limited on the devnet, only the first request will be successful.
   * @param address The address to check the balance for
   * @param minBalance The minimum balance to maintain (default: 0.1 SOL)
   * @param amount The amount to request (default: 2 SOL)
   */
  async requestAirdropIfNeeded (address: PublicKey, minBalance: number = 0.1, amount: number = 2): Promise<void> {
    const balance = await this.getBalance(address)

    if (balance < minBalance) {
      this.logger.info(`Balance low, requesting airdrop for ${amount} SOL`)
      try {
        const signature = await this.connection.requestAirdrop(
          new PublicKey(this.ownerAddress),
          amount * LAMPORTS_PER_SOL
        )
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash()
        await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight })
        await this.getBalance(address)
      } catch (error) {
        this.logger.error('Error requesting airdrop:', error)
      }
    } else {
      this.logger.info('Account has sufficient balance, skipping airdrop')
    }
  }

  /**
   * Create and delegate a stake account
   * @param amount The amount to delegate
   * @returns The address of the created stake account
   */
  async createAndDelegateStake (amount: string): Promise<string> {
    const { tx, stakeAccountAddress } = await this.staker.buildStakeTx({
      ownerAddress: this.ownerAddress,
      validatorAddress: this.validatorAddress,
      amount
    })

    this.logger.info(`Created stake account: ${stakeAccountAddress}`)
    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx })
    this.logger.info(`Transaction hash: ${txHash}`)

    const { status } = await this.staker.getTxStatus({ txHash })
    this.logger.info(`Transaction status: ${status}`)

    return stakeAccountAddress
  }

  /**
   * Undelegate a stake account. The unstake operation will undelegate the whole amount of the stake account.
   * @param stakeAccountAddress The address of the stake account to undelegate
   * @returns The status of the transaction
   */
  async undelegateStake (stakeAccountAddress: string): Promise<string> {
    const { tx } = await this.staker.buildUnstakeTx({
      ownerAddress: this.ownerAddress,
      stakeAccountAddress
    })

    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx })
    this.logger.info(`Unstake transaction hash: ${txHash}`)

    const { status } = await this.staker.getTxStatus({ txHash })
    this.logger.info(`Unstake transaction status: ${status}`)
    return status
  }

  /**
   * Get all stake accounts for the owner
   * @param stakeAccount The address of the stake account to get (optional). If `null` is passed, all stake accounts will be returned.
   * @returns An object containing the stake accounts
   */
  async getStakeAccounts (stakeAccount: string | null): Promise<{
    accounts: StakeAccount[]
  }> {
    const allStakeAccounts = await this.staker.getStakeAccounts({
      ownerAddress: this.ownerAddress,
      withStates: true
    })
    if (!stakeAccount) {
      return allStakeAccounts
    }
    const stakeAccountInfo = allStakeAccounts.accounts.find((account) => account.address === stakeAccount)
    if (!stakeAccountInfo) {
      return {
        accounts: []
      }
    }
    return {
      accounts: [stakeAccountInfo]
    }
  }

  /**
   * Withdraw from a stake account
   * @param stakeAccountAddress The address of the stake account to withdraw from
   * @returns The status of the transaction
   */
  async withdrawStake (stakeAccountAddress: string): Promise<string> {
    const { tx } = await this.staker.buildWithdrawStakeTx({
      ownerAddress: this.ownerAddress,
      stakeAccountAddress
    })

    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx })
    this.logger.info(`Withdraw transaction hash: ${txHash}`)

    const { status } = await this.staker.getTxStatus({ txHash })
    this.logger.info(`Withdraw transaction status: ${status}`)
    return status
  }

  /**
   * Split a stake account into two accounts. The amount used as a parameter is the amount to be deposited in the new account.
   *
   * Like any new account, the new account will need to be funded with the rent-exempt amount (taken from the owner's account), so the final balance of the new account will be:
   *
   * `the amount passed as a parameter + the rent-exempt amount`.
   *
   * The remaining amount will stay in the original account.
   * @param stakeAccountAddress The address of the stake account to split
   * @param amount The amount to deposit in the new account
   * @returns The address of the new stake account and the status of the transaction
   */

  async splitStake (
    stakeAccountAddress: string,
    amount: string
  ): Promise<{ newStakeAccountAddress: string; status: string }> {
    const { tx, stakeAccountAddress: newStakeAccountAddress } = await this.staker.buildSplitStakeTx({
      ownerAddress: this.ownerAddress,
      stakeAccountAddress,
      amount
    })
    this.logger.info(`Created new stake account: ${newStakeAccountAddress}`)
    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })
    const { txHash } = await this.staker.broadcast({ signedTx })
    this.logger.info(`Split transaction hash: ${txHash}`)
    const { status } = await this.staker.getTxStatus({ txHash })
    this.logger.info(`Split transaction status: ${status}`)
    return { status, newStakeAccountAddress }
  }
}
