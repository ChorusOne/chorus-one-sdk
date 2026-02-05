import { PolygonStaker, CHORUS_ONE_POLYGON_VALIDATORS } from '@chorus-one/polygon'
import { LocalSigner } from '@chorus-one/signer-local'
import { KeyType } from '@chorus-one/signer'
import * as bip39 from 'bip39'
import { HDKey } from '@scure/bip32'
import type { Address, PublicClient } from 'viem'
import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'

export class PolygonTestStaker {
  private mnemonic: string
  public hdPath: string
  public delegatorAddress: Address
  public validatorShareAddress: Address
  public staker: PolygonStaker
  public localSigner: LocalSigner
  public publicClient: PublicClient

  constructor (params: { mnemonic: string; rpcUrl: string }) {
    if (!params.mnemonic) {
      throw new Error('Mnemonic is required')
    }

    this.mnemonic = params.mnemonic
    this.hdPath = "m/44'/60'/0'/0/0"
    this.validatorShareAddress = CHORUS_ONE_POLYGON_VALIDATORS.mainnet

    this.staker = new PolygonStaker({
      network: 'mainnet',
      rpcUrl: params.rpcUrl
    })

    this.publicClient = createPublicClient({
      chain: hardhat,
      transport: http(params.rpcUrl)
    })
  }

  async init (): Promise<void> {
    const seed = bip39.mnemonicToSeedSync(this.mnemonic)
    const hdKey = HDKey.fromMasterSeed(seed)
    const derived = hdKey.derive(this.hdPath)
    const publicKey = derived.publicKey

    if (!publicKey) {
      throw new Error('Failed to derive public key')
    }

    const addressDerivationFn = PolygonStaker.getAddressDerivationFn()
    const addresses = await addressDerivationFn(publicKey)
    this.delegatorAddress = `0x${addresses[0]}` as Address

    this.localSigner = new LocalSigner({
      mnemonic: this.mnemonic,
      accounts: [{ hdPath: this.hdPath }],
      keyType: KeyType.SECP256K1,
      addressDerivationFn
    })
    await this.localSigner.init()
  }

  private async waitForTx (txHash: `0x${string}`): Promise<void> {
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash })
    if (receipt.status !== 'success') {
      throw new Error(`Transaction failed: ${txHash}`)
    }
  }

  async approve (amount: string): Promise<string> {
    const { tx } = await this.staker.buildApproveTx({ amount })
    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.delegatorAddress,
      tx
    })
    const { txHash } = await this.staker.broadcast({ signedTx })
    await this.waitForTx(txHash)
    return txHash
  }

  async stake (amount: string, minSharesToMint: bigint): Promise<string> {
    const { tx } = await this.staker.buildStakeTx({
      delegatorAddress: this.delegatorAddress,
      validatorShareAddress: this.validatorShareAddress,
      amount,
      minSharesToMint
    })
    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.delegatorAddress,
      tx
    })
    const { txHash } = await this.staker.broadcast({ signedTx })
    await this.waitForTx(txHash)
    return txHash
  }

  async unstake (amount: string, maximumSharesToBurn: bigint): Promise<string> {
    const { tx } = await this.staker.buildUnstakeTx({
      delegatorAddress: this.delegatorAddress,
      validatorShareAddress: this.validatorShareAddress,
      amount,
      maximumSharesToBurn
    })
    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.delegatorAddress,
      tx
    })
    const { txHash } = await this.staker.broadcast({ signedTx })
    await this.waitForTx(txHash)
    return txHash
  }

  async withdraw (unbondNonce: bigint): Promise<string> {
    const { tx } = await this.staker.buildWithdrawTx({
      delegatorAddress: this.delegatorAddress,
      validatorShareAddress: this.validatorShareAddress,
      unbondNonce
    })
    const { signedTx } = await this.staker.sign({
      signer: this.localSigner,
      signerAddress: this.delegatorAddress,
      tx
    })
    const { txHash } = await this.staker.broadcast({ signedTx })
    await this.waitForTx(txHash)
    return txHash
  }
}
