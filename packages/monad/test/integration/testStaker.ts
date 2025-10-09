import { MonadStaker } from '@chorus-one/monad'
import { LocalSigner } from '@chorus-one/signer-local'
import { KeyType } from '@chorus-one/signer'
import * as bip39 from 'bip39'
import { HDKey } from '@scure/bip32'
import type { Address } from 'viem'

export class MonadTestStaker {
  private mnemonic: string
  public hdPath: string
  public ownerAddress: Address
  public validatorId: number
  public staker: MonadStaker
  public localSigner: LocalSigner

  constructor(params: { mnemonic: string; rpcUrl: string; validatorId?: number }) {
    if (!params.mnemonic) {
      throw new Error('Mnemonic is required')
    }
    if (!params.rpcUrl) {
      throw new Error('RPC URL is required')
    }

    this.mnemonic = params.mnemonic
    this.hdPath = "m/44'/60'/0'/0/0"
    this.validatorId = params.validatorId || 73

    this.staker = new MonadStaker({ rpcUrl: params.rpcUrl })
  }

  /**
   * Waits for transaction confirmation with retry logic
   * Retries up to 5 times with 5-second intervals
   */
  private async waitForTxConfirmation(txHash: string): Promise<void> {
    const maxRetries = 5
    const retryDelay = 5000 // 5 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { status } = await this.staker.getTxStatus({ txHash: txHash as `0x${string}` })

      if (status === 'success') {
        return
      }

      if (status === 'failure') {
        throw new Error(`Transaction failed: ${txHash}`)
      }

      // status is 'unknown' - wait and retry
      if (attempt < maxRetries) {
        console.log(`Transaction status unknown, retrying (${attempt}/${maxRetries})...`)
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }

    throw new Error(`Transaction confirmation timeout after ${maxRetries} attempts: ${txHash}`)
  }

  async init(): Promise<void> {
    const seed = bip39.mnemonicToSeedSync(this.mnemonic)
    const hdKey = HDKey.fromMasterSeed(seed)
    const derived = hdKey.derive(this.hdPath)
    const publicKey = derived.publicKey

    if (!publicKey) {
      throw new Error('Failed to derive public key')
    }

    const addressDerivationFn = MonadStaker.getAddressDerivationFn()
    const addresses = await addressDerivationFn(publicKey)
    this.ownerAddress = `0x${addresses[0]}` as Address

    await this.staker.init()

    this.localSigner = new LocalSigner({
      mnemonic: this.mnemonic,
      accounts: [{ hdPath: this.hdPath }],
      keyType: KeyType.SECP256K1,
      addressDerivationFn: MonadStaker.getAddressDerivationFn()
    })
    await this.localSigner.init()
  }

  async createAndDelegateStake(amount: string): Promise<string> {
    const { tx } = await this.staker.buildStakeTx({
      validatorId: this.validatorId,
      amount
    })

    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx })

    await this.waitForTxConfirmation(txHash)

    return txHash
  }

  async unstake(amount: string, withdrawalId: number): Promise<string> {
    const { tx } = await this.staker.buildUnstakeTx({
      delegatorAddress: this.ownerAddress,
      validatorId: this.validatorId,
      amount,
      withdrawalId
    })

    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx })

    await this.waitForTxConfirmation(txHash)

    return txHash
  }

  async withdraw(withdrawalId: number): Promise<string> {
    const { tx } = await this.staker.buildWithdrawTx({
      delegatorAddress: this.ownerAddress,
      validatorId: this.validatorId,
      withdrawalId
    })

    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx })

    await this.waitForTxConfirmation(txHash)

    return txHash
  }

  async compound(): Promise<string> {
    const { tx } = await this.staker.buildCompoundTx({
      delegatorAddress: this.ownerAddress,
      validatorId: this.validatorId
    })

    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx })

    await this.waitForTxConfirmation(txHash)

    return txHash
  }

  async claimRewards(): Promise<string> {
    const { tx } = await this.staker.buildClaimRewardsTx({
      delegatorAddress: this.ownerAddress,
      validatorId: this.validatorId
    })

    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx })

    await this.waitForTxConfirmation(txHash)

    return txHash
  }
}
