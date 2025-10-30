import { LocalSigner } from '@chorus-one/signer-local'
import { KeyType } from '@chorus-one/signer'
import * as bip39 from 'bip39'
import { HDKey } from '@scure/bip32'
import { EvmDelegatorSummary, EvmSpotBalance, HyperliquidChain } from '../../src/types'
import { HyperliquidEvmStaker } from '../../src/evmStaker'

export class TestHyperliquidEvmStaker {
  private mnemonic: string
  public hdPath: string
  public ownerAddress: `0x${string}`
  public validatorAddress: `0x${string}`
  public evmStaker: HyperliquidEvmStaker
  public localSigner: LocalSigner

  constructor(params: { mnemonic: string; chain: HyperliquidChain; validatorAddress: `0x${string}` }) {
    if (!params.mnemonic) {
      throw new Error('Mnemonic is required')
    }

    this.mnemonic = params.mnemonic
    this.hdPath = "m/44'/60'/0'/0/0"
    this.validatorAddress = params.validatorAddress

    this.evmStaker = new HyperliquidEvmStaker({ chain: params.chain })
  }

  async init(): Promise<void> {
    const seed = bip39.mnemonicToSeedSync(this.mnemonic)
    const hdKey = HDKey.fromMasterSeed(seed)
    const derived = hdKey.derive(this.hdPath)
    const publicKey = derived.publicKey

    if (!publicKey) {
      throw new Error('Failed to derive public key')
    }

    const addressDerivationFn = HyperliquidEvmStaker.getAddressDerivationFn()
    const addresses = await addressDerivationFn(publicKey)

    this.ownerAddress = addresses[0] as `0x${string}`

    this.localSigner = new LocalSigner({
      mnemonic: this.mnemonic,
      accounts: [{ hdPath: this.hdPath }],
      keyType: KeyType.SECP256K1,
      addressDerivationFn
    })
    await this.localSigner.init()

    // Initialize the EVM staker to set up the public client
    await this.evmStaker.init()
  }

  async moveFromEvmToSpot(amount: string): Promise<`0x${string}`> {
    const { tx } = await this.evmStaker.buildEvmToSpotTx({ amount })
    const { signedTx } = await this.evmStaker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.evmStaker.broadcast({ signedTx })

    return txHash
  }

  async verifyBridgeEvent(txHash: `0x${string}`): Promise<{ user: `0x${string}`; amount: bigint }> {
    return await this.evmStaker.verifyBridgeEvent({ txHash })
  }

  async moveFromSpotToStaking(amount: string): Promise<string> {
    const { tx } = await this.evmStaker.buildSpotToStakingTx({ amount })
    const { signedTx } = await this.evmStaker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.evmStaker.broadcast({ signedTx })

    return txHash
  }

  async withdrawFromStakingToSpot(amount: string): Promise<string> {
    const { tx } = await this.evmStaker.buildWithdrawFromStakingTx({
      amount
    })
    const { signedTx } = await this.evmStaker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.evmStaker.broadcast({ signedTx })

    return txHash
  }

  async stake(amount: string): Promise<string> {
    const { tx } = await this.evmStaker.buildStakeTx({
      validatorAddress: this.validatorAddress,
      amount
    })

    const { signedTx } = await this.evmStaker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.evmStaker.broadcast({ signedTx })

    return txHash
  }

  async unstake(amount: string): Promise<string> {
    const { tx } = await this.evmStaker.buildUnstakeTx({
      validatorAddress: this.validatorAddress,
      amount
    })

    const { signedTx } = await this.evmStaker.sign({
      signer: this.localSigner,
      signerAddress: this.ownerAddress,
      tx
    })

    const { txHash } = await this.evmStaker.broadcast({ signedTx })

    return txHash
  }

  async spotBalances(userAddress: `0x${string}`): Promise<EvmSpotBalance> {
    const balances = await this.evmStaker.getSpotBalance({ userAddress })
    return balances
  }
  async stakingInfo(userAddress: `0x${string}`): Promise<EvmDelegatorSummary> {
    const info = await this.evmStaker.getStakingSummary({ userAddress })
    return info
  }

  async getNativeEvmBalance(userAddress: `0x${string}`): Promise<bigint> {
    const balance = await this.evmStaker.getBalance({ userAddress })
    return balance
  }
}
