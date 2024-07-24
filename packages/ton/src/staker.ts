import type { Signer } from '@chorus-one/signer'
import type {
  TonNetworkConfig,
  TonSigningData,
  NominatorInfo,
  PoolData,
  AddressDerivationConfig,
  UnsignedTx,
  SignedTx,
  TonTxStatus
} from './types'
import {
  toNano,
  fromNano,
  TonClient,
  WalletContractV4,
  internal,
  MessageRelaxed,
  TupleReader,
  TupleItem,
  SendMode,
  Address,
  TransactionDescriptionGeneric,
  beginCell,
  Cell
} from '@ton/ton'
import { createWalletTransferV4, externalMessage, sign } from './tx'
import * as tonMnemonic from 'tonweb-mnemonic'
import { ed25519 } from '@noble/curves/ed25519'

/**
 * This class provides the functionality to stake assets on the Ton network.
 *
 * It also provides the ability to retrieve staking information and rewards for a delegator.
 */
export class TonStaker {
  private readonly networkConfig: Required<TonNetworkConfig>
  private readonly addressDerivationConfig: AddressDerivationConfig
  private client?: TonClient

  /**
   * This **static** method is used to derive an address from a public key.
   *
   * It can be used for signer initialization, e.g. `FireblocksSigner` or `LocalSigner`.
   *
   * @param params - Parameters for the address derivation
   * @param params.addressDerivationConfig - TON address derivation configuration
   *
   * @returns Returns a single address derived from the public key
   */
  static getAddressDerivationFn =
    (params?: { addressDerivationConfig: AddressDerivationConfig | undefined }) =>
    async (publicKey: Uint8Array, _derivationPath: string): Promise<Array<string>> => {
      const { walletContractVersion, workchain, bounceable, testOnly, urlSafe } =
        params?.addressDerivationConfig ?? defaultAddressDerivationConfig()

      // NOTE: different wallet versions may result in different addresses
      const wallet = getWalletContract(walletContractVersion, workchain, Buffer.from(publicKey))

      return [wallet.address.toString({ bounceable, urlSafe, testOnly })]
    }

  /**
   * This **static** method is used to convert BIP39 mnemonic to seed. In TON
   * network the seed is used as a private key.
   *
   * @returns Returns a seed derived from the mnemonic
   */
  static getMnemonicToSeedFn =
    () =>
    async (mnemonic: string, password?: string): Promise<Uint8Array> => {
      return await tonMnemonic.mnemonicToSeed(mnemonic.split(' '), password)
    }

  /**
   * This **static** method is used to convert a seed to a keypair. Note that
   * TON network doesn't use BIP44 HD Path for address derivation.
   *
   * @returns Returns a public and private keypair derived from the seed
   */
  static getSeedToKeypairFn =
    () =>
    async (seed: Uint8Array, hdPath?: string): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> => {
      if (hdPath !== undefined && hdPath !== '') {
        throw new Error('hdPath is not supported for TON')
      }

      return {
        publicKey: ed25519.getPublicKey(Buffer.from(seed)),
        privateKey: seed
      }
    }

  /**
   * This creates a new TonStaker instance.
   *
   * @param params - Initialization parameters
   * @param params.rpcUrl - RPC URL (e.g. https://toncenter.com/api/v2/jsonRPC)
   * @param params.allowSeamlessWalletDeployment - (Optional) If enabled, the wallet contract is deployed automatically when needed
   * @param params.allowTransferToInactiveAccount - (Optional) Allow token transfers to inactive accounts
   * @param params.minimumExistentialBalance - (Optional) The amount of TON to keep in the wallet
   * @param params.addressDerivationConfig - (Optional) TON address derivation configuration
   *
   * @returns An instance of TonStaker.
   */
  constructor (params: {
    rpcUrl: string
    allowSeamlessWalletDeployment?: boolean
    allowTransferToInactiveAccount?: boolean
    minimumExistentialBalance?: string
    addressDerivationConfig?: AddressDerivationConfig
  }) {
    const networkConfig = {
      ...params,
      allowSeamlessWalletDeployment: params.allowSeamlessWalletDeployment ?? false,
      allowTransferToInactiveAccount: params.allowTransferToInactiveAccount ?? false,
      minimumExistentialBalance: params.minimumExistentialBalance ?? '5',
      addressDerivationConfig: params.addressDerivationConfig ?? defaultAddressDerivationConfig()
    }

    this.networkConfig = networkConfig

    const cfg = networkConfig.addressDerivationConfig
    this.networkConfig.addressDerivationConfig = cfg
    this.addressDerivationConfig = cfg
  }

  /**
   * Initializes the TonStaker instance and connects to the blockchain.
   *
   * @returns A promise which resolves once the TonStaker instance has been initialized.
   */
  async init (): Promise<void> {
    this.client = new TonClient({
      endpoint: this.networkConfig.rpcUrl
    })
  }

  /**
   * Builds a staking (delegation) transaction for Nominator Pool contract.
   * For more information see: https://github.com/ton-blockchain/nominator-pool
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator address to stake from
   * @param params.validatorAddress - The validator address to stake to
   * @param params.amount - The amount to stake, specified in `TON`
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON nominator pool staking transaction.
   */
  async buildStakeNominatorPoolTx (params: {
    delegatorAddress: string
    validatorAddress: string
    amount: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { delegatorAddress, validatorAddress, amount, validUntil } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(validatorAddress)

    // ensure the validator address is bounceable.
    // NOTE: TEP-002 specifies that the address bounceable flag should match both the internal message and the address.
    // This has no effect as we force the bounce flag anyway. However it is a good practice to be consistent
    if (!Address.parseFriendly(validatorAddress).isBounceable) {
      throw new Error(
        'validator address is not bounceable! It is required for nominator pool contract operations to use bounceable addresses'
      )
    }

    // this is also a somewhat okay way to check the contract is indeed a staking pool contract
    const data = await this.getContractPoolData(validatorAddress)
    if (data.nominators_count >= data.max_nominators_count) {
      throw new Error('validator has reached the maximum number of nominators')
    }

    // ensure we stake at least the minimum required amount
    const nominators = (await this.getPoolContractNominators({ validatorAddress })).nominators
    const ourNominator = nominators.find((n) => Address.parseRaw(n.address).equals(Address.parse(delegatorAddress)))
    const amountStaked = ourNominator ? toNano(ourNominator.amount) : BigInt(0)
    const amountToStake = toNano(amount)

    if (amountToStake + amountStaked < data.min_nominator_stake) {
      throw new Error(
        `amount to stake (${fromNano(amountToStake)}) is less than the minimum stake required (${fromNano(data.min_nominator_stake)})`
      )
    }

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      message: {
        address: validatorAddress,
        // to stake tokens we need to send a large amount of tokens
        // it is critical that the transaction is bounceable
        // otherwise in the case of contract failure we may loose tokens!
        bounceable: true,
        amount: toNano(amount),
        payload: 'd' // 'd' for deposit / delegation
      }
    }

    return { tx }
  }

  /**
   * Builds an unstaking (withdraw nominator) transaction for Nominator Pool contract.
   * For more information see: https://github.com/ton-blockchain/nominator-pool
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator address
   * @param params.validatorAddress - The validator address to unstake from
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON nominator pool unstaking transaction.
   */
  async buildUnstakeNominatorPoolTx (params: {
    delegatorAddress: string
    validatorAddress: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { delegatorAddress, validatorAddress, validUntil } = params

    // "In order for the nominator to make a withdrawal, he needs to send message to nominator-pool smart contract with text comment "w"
    // and some Toncoins for network fee (1 TON is enough). Unspent TONs attached to message will be returned except in very rare cases."
    //
    // source: https://github.com/ton-blockchain/nominator-pool?tab=readme-ov-file#nominators-withdrawal
    const amount = '1' // 1 TON

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(validatorAddress)

    // ensure the validator address is bounceable.
    // NOTE: TEP-002 specifies that the address bounceable flag should match both the internal message and the address.
    // This has no effect as we force the bounce flag anyway. However it is a good practice to be consistent
    if (!Address.parseFriendly(validatorAddress).isBounceable) {
      throw new Error(
        'validator address is not bounceable! It is required for nominator pool contract operations to use bounceable addresses'
      )
    }

    // this is also a somewhat okay way to check the contract is indeed a staking pool contract
    const data = await this.getContractPoolData(validatorAddress)
    if (data.nominators_count === 0) {
      throw new Error('there is no nominators currently staking to the nominator pool contract')
    }

    // ensure that the delegator has staked to the validator
    const nominators = (await this.getPoolContractNominators({ validatorAddress })).nominators
    const ourNominator = nominators.find((n) => Address.parseRaw(n.address).equals(Address.parse(delegatorAddress)))
    if (!ourNominator) {
      throw new Error('delegator is not staking to the nominator pool contract')
    }

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      message: {
        address: validatorAddress,
        // to unstake tokens we need to send a some tokens that should
        // be returned to us in case of error
        bounceable: true,
        amount: toNano(amount),
        payload: 'w' // 'w' for withdraw
      }
    }

    return { tx }
  }

  /**
   * Builds a staking (delegation) transaction for Single Nominator Pool contract.
   * For more information see: https://github.com/orbs-network/single-nominator/tree/main
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator address to stake from
   * @param params.validatorAddress - The validator address to stake to
   * @param params.amount - The amount to stake, specified in `TON`
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON nominator pool staking transaction.
   */
  async buildStakeSingleNominatorPoolTx (params: {
    delegatorAddress: string
    validatorAddress: string
    amount: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { delegatorAddress, validatorAddress, amount, validUntil } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(validatorAddress)

    // ensure the validator address is bounceable.
    // NOTE: TEP-002 specifies that the address bounceable flag should match both the internal message and the address.
    // This has no effect as we force the bounce flag anyway. However it is a good practice to be consistent
    if (!Address.parseFriendly(validatorAddress).isBounceable) {
      throw new Error(
        'validator address is not bounceable! It is required for nominator pool contract operations to use bounceable addresses'
      )
    }

    // be sure the delegator is the owner of the contract otherwise we can't withdraw the funds back
    const roles = await this.getContractRoles(validatorAddress)
    if (!roles.ownerAddress.equals(Address.parse(delegatorAddress))) {
      throw new Error('delegator is not the owner of the single nominator pool contract')
    }

    // this serves purely as a sanity check
    const data = await this.getContractPoolData(validatorAddress)
    if (data.nominators_count !== 1) {
      throw new Error('the single nominator pool contract is expected to have exactly one nominator')
    }

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      message: {
        address: validatorAddress,
        // to stake tokens we need to send a large amount of tokens
        // it is critical that the transaction is bounceable
        // otherwise in the case of contract failure we may loose tokens!
        bounceable: true,
        amount: toNano(amount),
        payload: Cell.EMPTY
      }
    }

    return { tx }
  }

  /**
   * Builds a unstaking (withdraw nominator) transaction for Single Nominator Pool contract.
   * For more information see: https://github.com/orbs-network/single-nominator/tree/main
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator address
   * @param params.validatorAddress - The validator address to unstake from
   * @param params.amount - The amount to unstake, specified in `TON`
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON nominator pool unstaking transaction.
   */
  async buildUnstakeSingleNominatorPoolTx (params: {
    delegatorAddress: string
    validatorAddress: string
    amount: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { delegatorAddress, validatorAddress, amount, validUntil } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(validatorAddress)

    // ensure the validator address is bounceable.
    // NOTE: TEP-002 specifies that the address bounceable flag should match both the internal message and the address.
    // This has no effect as we force the bounce flag anyway. However it is a good practice to be consistent
    if (!Address.parseFriendly(validatorAddress).isBounceable) {
      throw new Error(
        'validator address is not bounceable! It is required for nominator pool contract operations to use bounceable addresses'
      )
    }

    // only onwer can withdraw the funds
    const roles = await this.getContractRoles(validatorAddress)
    if (!roles.ownerAddress.equals(Address.parse(delegatorAddress))) {
      throw new Error('delegator is not the owner of the single nominator pool contract')
    }

    // this serves purely as a sanity check
    const data = await this.getContractPoolData(validatorAddress)
    if (data.nominators_count !== 1) {
      throw new Error('the single nominator pool contract is expected to have exactly one nominator')
    }

    // source: https://github.com/orbs-network/single-nominator/tree/main?tab=readme-ov-file#1-withdraw
    //         https://github.com/orbs-network/single-nominator/blob/main/scripts/ts/withdraw-deeplink.ts#L7C5-L7C137
    const payload = beginCell().storeUint(0x1000, 32).storeUint(1, 64).storeCoins(toNano(amount)).endCell()

    // 1 TON should be enough to cover the transaction fees (similar to nominator pool contract)
    const amountToCoverTxFees = '1'

    // ensure we don't drain the validator wallet by accident
    this.checkMinimumExistentialBalance(validatorAddress, amount)

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      message: {
        address: validatorAddress,
        // to unstake tokens we need to send a some tokens that should
        // be returned to us in case of error
        bounceable: true,
        amount: toNano(amountToCoverTxFees),
        payload
      }
    }

    return { tx }
  }

  /**
   * Builds a token transfer transaction
   *
   * @param params - Parameters for building the transaction
   * @param params.destinationAddress - Where to send the tokens
   * @param params.amount - The amount to stake, specified in `TON`
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   * @param params.memo - (Optional) A short note to include with the transaction
   *
   * @returns Returns a promise that resolves to a TON token transfer transaction.
   */
  async buildTransferTx (params: {
    destinationAddress: string
    amount: string
    validUntil?: number
    memo?: string
  }): Promise<{ tx: UnsignedTx }> {
    const client = this.getClient()
    const { destinationAddress, amount, validUntil, memo } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(destinationAddress)

    // To transfer tokens to inactive account (without wallet contract deployed)
    // one should send transaction with non-bounce mode. Source:
    //   https://docs.ton.org/develop/dapps/asset-processing/#wallet-deployment
    //
    // To minimize the risk of losing tokens, we should check if the destination
    // address has an active wallet contract deployed. If the amount of tokens
    // is small then we allow the unbouncable mode transfer. Otherwise the code
    // bails out.
    //
    // This is based on the recommendation from the TON SDK:
    //   https://docs.ton.org/develop/smart-contracts/guidelines/non-bouncable-messages
    let bounceable = true
    const parsedAddress = Address.parse(destinationAddress)
    const state = await client.getContractState(parsedAddress)
    if (state.state !== 'active') {
      if (toNano(amount) > toNano('5') && !this.networkConfig.allowTransferToInactiveAccount) {
        throw new Error(
          `contract at ${destinationAddress} is not active: ${state.state} and the amount is too large (>5) to send in non-bounceable mode`
        )
      }

      bounceable = false
    }

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      message: {
        address: destinationAddress,
        bounceable: bounceable,
        amount: toNano(amount),
        payload: memo ?? ''
      }
    }

    return { tx }
  }

  /**
   * Builds a wallet deployment transaction
   *
   * @param params - Parameters for building the transaction
   * @param params.address - The address to deploy the wallet contract to
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON wallet deployment transaction.
   */
  async buildDeployWalletTx (params: { address: string; validUntil?: number }): Promise<{ tx: UnsignedTx }> {
    const client = this.getClient()
    const { address, validUntil } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(address)

    const isDeployed = await client.isContractDeployed(Address.parse(address))
    if (isDeployed) {
      throw new Error('wallet contract is already deployed')
    }

    // To deploy a wallet contract we need to setup a non-bounceable message
    // with empty payload and non-empty stateInit
    // * bounceable - is set to false at the external message stage
    // * stateInit - is set at the `sign` method
    //
    // reference: https://docs.ton.org/develop/smart-contracts/guidelines/non-bouncable-messages
    const tx = {
      validUntil: defaultValidUntil(validUntil)
    }

    return { tx }
  }

  /**
   * Retrieves the active nominators for a Nominator Pool contract.
   * For more information see: https://github.com/ton-blockchain/nominator-pool
   *
   * @param params - Parameters for the request
   * @param params.validatorAddress - The validator address to gather rewards data from
   *
   * @returns Returns a promise that resolves to the nominator data for the validator address.
   */
  async getPoolContractNominators (params: { validatorAddress: string }): Promise<{ nominators: NominatorInfo[] }> {
    const client = this.getClient()
    const { validatorAddress } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(validatorAddress)

    const response = await client.runMethod(Address.parse(validatorAddress), 'list_nominators', [])

    // @ts-expect-error the library does not handle 'list' type well. This is a workaround to get the data out of the 'list' type
    const reader = new TupleReader(response.stack.pop().items as TupleItem[])

    // extract nominators from contract response
    const nominators: NominatorInfo[] = []

    if (reader.remaining > 0) {
      do {
        const x = reader.readTuple()
        nominators.push({
          // The nominator pool contract allows only the basechain addresses (`0:`)
          // https://github.com/ton-blockchain/nominator-pool/blob/main/func/pool.fc#L618
          address: `0:${BigInt(x.readBigNumber()).toString(16)}`,
          amount: fromNano(x.readBigNumber()),
          pending_deposit_amount: fromNano(x.readBigNumber()),
          withdraw_requested: fromNano(x.readBigNumber())
        })
      } while (reader.remaining)
    }

    return { nominators }
  }

  /**
   * Retrieves the account balance
   *
   * @param params - Parameters for the request
   * @param params.address - The account address to gather balance data from
   *
   * @returns Returns a promise that resolves to the account balance
   */
  async getBalance (params: { address: string }): Promise<{ amount: string }> {
    const client = this.getClient()
    const { address } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(address)

    const amount = await client.getBalance(Address.parse(address))
    return { amount: fromNano(amount) }
  }

  /**
   * Retrieves the staking information for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator address to gather rewards data from
   * @param params.contractType - The validator contract type (single-nominator-pool or nominator-pool)
   *
   * @returns Returns a promise that resolves to the staking information for the specified delegator.
   */
  async getStake (params: {
    delegatorAddress: string
    validatorAddress: string
    contractType: 'single-nominator-pool' | 'nominator-pool'
  }): Promise<{ balance: string }> {
    const { delegatorAddress, validatorAddress, contractType } = params

    if (contractType === 'nominator-pool') {
      const { nominators } = await this.getPoolContractNominators({ validatorAddress })
      if (nominators.length === 0) {
        return { balance: '0' }
      }

      const nominator = nominators.find((n) => Address.parse(n.address).equals(Address.parse(delegatorAddress)))
      if (nominator === undefined) {
        return { balance: '0' }
      }

      return { balance: nominator.amount }
    }

    // otherise it is a single nominator pool contract
    const roles = await this.getContractRoles(validatorAddress)
    if (!roles.ownerAddress.equals(Address.parse(delegatorAddress))) {
      throw new Error('delegator is not the owner of the single nominator pool contract')
    }

    const balance = await this.getBalance({ address: validatorAddress })

    return { balance: balance.amount }
  }

  /**
   * Signs a transaction using the provided signer.
   *
   * @param params - Parameters for the signing process
   * @param params.signer - Signer instance
   * @param params.signerAddress - The address of the signer
   * @param params.tx - The transaction to sign
   *
   * @returns A promise that resolves to an object containing the signed transaction.
   */
  async sign (params: { signer: Signer; signerAddress: string; tx: UnsignedTx }): Promise<SignedTx> {
    const client = this.getClient()
    const { signer, signerAddress, tx } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(signerAddress)

    const pk = await signer.getPublicKey(signerAddress)
    const wallet = getWalletContract(
      this.addressDerivationConfig.walletContractVersion,
      this.addressDerivationConfig.workchain,
      Buffer.from(pk)
    )

    let internalMsgs: MessageRelaxed[] = []
    const msg = tx.message

    if (msg !== undefined) {
      if (msg.payload === undefined) {
        throw new Error('missing payload')
      }

      // ensure the address is for the right network
      this.checkIfAddressTestnetFlagMatches(msg.address)

      // ensure the balance is above the minimum existential balance
      this.checkMinimumExistentialBalance(signerAddress, fromNano(msg.amount))

      // TON TEP-0002 defines how the flags within the address should be handled
      // reference: https://github.com/ton-blockchain/TEPs/blob/master/text/0002-address.md#wallets-applications
      //
      // The Chorus TON SDK is not strictly a wallet application, so we follow most (but not all) of the rules.
      // Specifically, we force the bounce flag wherever possible (for safety), but don't enforce user to specify
      // the bounceable source address. This is because a user may use fireblocks signer where the address is in non-bounceable format.
      internalMsgs = [
        internal({
          value: msg.amount,
          bounce: msg.bounceable,
          to: msg.address,
          body: msg.payload,
          init: msg.stateInit
        })
      ]
    } else {
      internalMsgs = []
    }

    const contract = client.open(wallet)
    const seqno: number = await contract.getSeqno()

    // safety check for createWalletTransferV4
    if (this.addressDerivationConfig.walletContractVersion !== 4) {
      throw new Error('unsupported wallet contract version')
    }
    const preparedTx = createWalletTransferV4({
      seqno,
      // As explained here: https://docs.ton.org/develop/smart-contracts/messages#message-modes
      // IGNORE_ERRORS ignores only selected errors, such as insufficient funds etc
      //
      // The lack of that flag in case of insufficient funds would result in the internal mesasge being executed
      // "in a loop" until the transaction expires, effectively draining the account (by incurring fees).
      //
      // To confirm this is a 'recommended practice' here are a few references from other wallets:
      // * tonweb - https://github.com/toncenter/tonweb/blob/76dfd0701714c0a316aee503c2962840acaf74ef/src/contract/wallet/WalletContract.js#L184
      // * tonkeeper - https://github.com/tonkeeper/wallet/blob/7452e11f8c6313f5a1f60bbc93e1b6a5e858470e/packages/mobile/src/blockchain/wallet.ts#L401
      //
      // The unfortunate consequence of the transaction error being ignored, the TX status is a success. This can be misleading to end user.
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      walletId: wallet.walletId,
      messages: internalMsgs,
      timeout: tx.validUntil
    })

    const signingData: TonSigningData = {
      tx,
      txCell: preparedTx
    }
    const signedTx = await sign(signerAddress, signer, signingData)

    // decide whether to deploy wallet contract along with the transaction
    const isContractDeployed = await client.isContractDeployed(Address.parse(signerAddress))
    let shouldDeployWallet = false
    if (!isContractDeployed) {
      // if contract is missing and there is no messages, it must be the init transaction
      if (internalMsgs.length === 0) {
        shouldDeployWallet = true
      } else if (this.networkConfig.allowSeamlessWalletDeployment) {
        shouldDeployWallet = true
      } else {
        throw new Error('wallet contract is not deployed and seamless wallet deployment is disabled')
      }
    }

    return {
      tx: signedTx,
      address: signerAddress,
      txHash: signedTx.hash().toString('hex'),
      stateInit: shouldDeployWallet ? wallet.init : undefined
    }
  }

  /**
   * This method is used to broadcast a signed transaction to the TON network.
   *
   * @param params - Parameters for the broadcast
   * @param params.signedTx - The signed transaction to be broadcasted
   *
   * @returns Returns a promise that resolves to the response of the transaction that was broadcast to the network.
   */
  async broadcast (params: { signedTx: SignedTx }): Promise<string> {
    const client = this.getClient()
    const { signedTx } = params

    const external = await externalMessage(client, Address.parse(signedTx.address), signedTx.tx, signedTx.stateInit)

    await client.sendFile(external.toBoc())

    return external.hash().toString('hex')
  }

  /**
   * Retrieves the status of a transaction using the transaction hash.
   *
   * This method is intended to check for transactions made recently (within limit) and not for historical transactions.
   *
   * @param params - Parameters for the transaction status request
   * @param params.address - The account address to query
   * @param params.txHash - The transaction hash to query
   * @param params.limit - (Optional) The maximum number of transactions to fetch
   *
   * @returns A promise that resolves to an object containing the transaction status.
   */
  async getTxStatus (params: { address: string; txHash: string; limit?: number }): Promise<TonTxStatus> {
    const client = this.getClient()
    const { address, txHash, limit } = params

    const transactions = await client.getTransactions(Address.parse(address), { limit: limit ?? 10 })
    const transaction = transactions.find((tx) => tx.hash().toString('hex') === txHash)

    if (transaction === undefined) {
      return { status: 'unknown', receipt: null }
    }

    if (transaction.description.type === 'generic') {
      const description = transaction.description as TransactionDescriptionGeneric

      if (description.aborted) {
        return { status: 'failure', receipt: transaction }
      }

      if (description.computePhase.type === 'vm') {
        const compute = description.computePhase
        if (compute.exitCode !== 0 || compute.success === false) {
          return { status: 'failure', receipt: transaction }
        }
      }

      if (description.actionPhase) {
        const action = description.actionPhase

        if (action.success === false || action.valid === false) {
          return { status: 'failure', receipt: transaction }
        }
      }

      // the transaction bounced if this is present (so likely it bounced due to error in the contract)
      if (description.bouncePhase) {
        return { status: 'failure', receipt: transaction }
      }
    }

    // at this point we can assume the transaction was successful
    return { status: 'success', receipt: transaction }
  }

  private getClient (): TonClient {
    if (!this.client) {
      throw new Error('TonStaker not initialized. Did you forget to call init()?')
    }

    return this.client
  }

  private async getContractRoles (
    contractAddress: string
  ): Promise<{ ownerAddress: Address; validatorAddress: Address }> {
    const client = this.getClient()
    const response = await client.runMethod(Address.parse(contractAddress), 'get_roles', [])

    // reference: https://github.com/orbs-network/single-nominator/blob/main/contracts/single-nominator.fc#L186
    if (response.stack.remaining !== 2) {
      throw new Error('invalid get_pool_data response, expected 17 fields got ' + response.stack.remaining)
    }

    const ownerAddress = response.stack.readAddress()
    const validatorAddress = response.stack.readAddress()

    return {
      ownerAddress,
      validatorAddress
    }
  }

  private async getContractPoolData (contractAddress: string): Promise<PoolData> {
    const client = this.getClient()
    const response = await client.runMethod(Address.parse(contractAddress), 'get_pool_data', [])

    // reference: https://github.com/ton-blockchain/nominator-pool/blob/main/func/pool.fc#L198
    if (response.stack.remaining !== 17) {
      throw new Error('invalid get_pool_data response, expected 17 fields got ' + response.stack.remaining)
    }

    const skipN = (n: number) => {
      for (let i = 0; i < n; i++) {
        response.stack.skip()
      }
    }

    skipN(1)
    const nominators_count = response.stack.readNumber() // index: 1
    skipN(4)
    const max_nominators_count = response.stack.readNumber() // index: 6
    skipN(1)
    const min_nominator_stake = response.stack.readBigNumber() // index: 8

    return {
      nominators_count,
      max_nominators_count,
      min_nominator_stake
    }
  }

  private async getSinglePoolContractRoles (
    contractAddress: string
  ): Promise<{ ownerAddress: Address; validatorAddress: Address }> {
    const client = this.getClient()
    const response = await client.runMethod(Address.parse(contractAddress), 'get_roles', [])

    if (response.stack.remaining !== 2) {
      throw new Error('invalid get_roles response, expected 2 fields got ' + response.stack.remaining)
    }

    return {
      ownerAddress: response.stack.readAddress(),
      validatorAddress: response.stack.readAddress()
    }
  }

  private checkIfAddressTestnetFlagMatches (address: string): void {
    const addr = Address.parseFriendly(address)

    if (addr.isTestOnly !== this.addressDerivationConfig.testOnly) {
      if (addr.isTestOnly) {
        throw new Error(`address ${address} is a testnet address but the configuration is for mainnet`)
      } else {
        throw new Error(`address ${address} is a mainnet address but the configuration is for testnet`)
      }
    }
  }

  private async checkMinimumExistentialBalance (address: string, amount: string): Promise<void> {
    const balance = await this.getBalance({ address })
    const minBalance = this.networkConfig.minimumExistentialBalance

    if (toNano(balance.amount) - toNano(amount) < toNano(minBalance)) {
      throw new Error(
        `sending ${amount} would result in balance below the minimum existential balance of ${minBalance} for address ${address}`
      )
    }
  }
}

function defaultAddressDerivationConfig (): AddressDerivationConfig {
  return {
    walletContractVersion: 4,
    workchain: 0,
    bounceable: false,
    testOnly: false,
    urlSafe: true
  }
}

// scaffold for future wallet releases
function getWalletContract (version: number, workchain: number, publicKey: Buffer, walletId?: number): WalletContractV4 {
  switch (version) {
    case 4:
      return WalletContractV4.create({ workchain, publicKey, walletId })
    default:
      throw new Error('unsupported wallet contract version')
  }
}

function defaultValidUntil (validUntil?: number): number {
  return validUntil ?? Math.floor(Date.now() / 1000) + 180 // 3 minutes
}
