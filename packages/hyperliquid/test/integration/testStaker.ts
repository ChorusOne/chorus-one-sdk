import { LocalSigner } from '@chorus-one/signer-local'
import { KeyType } from '@chorus-one/signer'
import * as bip39 from 'bip39'
import { HDKey } from '@scure/bip32'
import type { Address } from 'viem'
import { HyperliquidStaker } from '../../src/staker'
import { DelegatorSummary, HyperliquidChain, SpotBalance } from '../../src/types'

export class HyperliquidTestStaker {
  private mnemonic: string
  public hdPath: string
  public ownerAddress: Address
  public validatorAddress: `0x${number}`
  public staker: HyperliquidStaker
  public localSigner: LocalSigner

  constructor (params: { mnemonic: string; chain: HyperliquidChain; validatorAddress: `0x${number}` }) {
    if (!params.mnemonic) {
      throw new Error('Mnemonic is required')
    }

    this.mnemonic = params.mnemonic
    this.hdPath = "m/44'/60'/0'/0/0"
    this.validatorAddress = params.validatorAddress

    this.staker = new HyperliquidStaker({ chain: params.chain })
  }

  async init (): Promise<void> {
    const seed = bip39.mnemonicToSeedSync(this.mnemonic)
    const hdKey = HDKey.fromMasterSeed(seed)
    const derived = hdKey.derive(this.hdPath)
    const publicKey = derived.publicKey

    if (!publicKey) {
      throw new Error('Failed to derive public key')
    }

    const addressDerivationFn = HyperliquidStaker.getAddressDerivationFn()
    const addresses = await addressDerivationFn(publicKey)

    this.ownerAddress = addresses[0] as Address

    this.localSigner = new LocalSigner({
      mnemonic: this.mnemonic,
      accounts: [{ hdPath: this.hdPath }],
      keyType: KeyType.SECP256K1,
      addressDerivationFn
    })
    await this.localSigner.init()
  }

  async moveFromSpotToStaking (amount: string): Promise<string> {
    const { tx } = await this.staker.buildSpotToStakingTx({ amount })
    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx, delegatorAddress: this.ownerAddress })

    return txHash
  }

  async withdrawFromStakingToSpot (amount: string): Promise<string> {
    const { tx } = await this.staker.buildWithdrawFromStakingTx({
      amount
    })
    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx, delegatorAddress: this.ownerAddress })

    return txHash
  }

  async stake (amount: string): Promise<string> {
    const { tx } = await this.staker.buildStakeTx({
      validatorAddress: this.validatorAddress,
      amount
    })

    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx, delegatorAddress: this.ownerAddress })

    return txHash
  }

  async unstake (amount: string): Promise<string> {
    const { tx } = await this.staker.buildUnstakeTx({
      validatorAddress: this.validatorAddress,
      amount
    })

    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.staker.broadcast({ signedTx, delegatorAddress: this.ownerAddress })

    return txHash
  }

  async spotBalances (delegatorAddress: Address): Promise<SpotBalance[]> {
    const { balances } = await this.staker.getSpotBalances({ delegatorAddress })
    return balances
  }
  async stakingInfo (delegatorAddress: Address): Promise<DelegatorSummary> {
    const info = await this.staker.getStakingSummary({ delegatorAddress })
    return info
  }
}
