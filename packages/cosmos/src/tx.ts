import {
  coin,
  AminoTypes,
  createStakingAminoConverters,
  createAuthzAminoConverters,
  createBankAminoConverters,
  createDistributionAminoConverters,
  createGovAminoConverters,
  createIbcAminoConverters,
  createVestingAminoConverters,
  defaultRegistryTypes
} from '@cosmjs/stargate'
import type {
  Coin,
  MsgDelegateEncodeObject,
  MsgUndelegateEncodeObject,
  MsgBeginRedelegateEncodeObject,
  MsgWithdrawDelegatorRewardEncodeObject,
  AminoConverters,
  StargateClient,
  Account
} from '@cosmjs/stargate'
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { toBech32, fromBase64 } from '@cosmjs/encoding'
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing'
import { MsgBeginRedelegate, MsgDelegate } from 'cosmjs-types/cosmos/staking/v1beta1/tx'
import { MsgWithdrawDelegatorReward } from 'cosmjs-types/cosmos/distribution/v1beta1/tx'
import { Int53 } from '@cosmjs/math'
import type { Signature, Signer } from '@chorus-one/signer'
import type { CosmosNetworkConfig, CosmosSigningData } from './types'
import { Sha256, keccak256, Secp256k1 } from '@cosmjs/crypto'

import { publicKeyConvert } from 'secp256k1'
import { SafeJSONStringify, checkMaxDecimalPlaces } from '@chorus-one/utils'
import { CosmosClient } from './client'
import BigNumber from 'bignumber.js'

import { Registry, encodePubkey, makeAuthInfoBytes } from '@cosmjs/proto-signing'
import type { TxBodyEncodeObject, EncodeObject } from '@cosmjs/proto-signing'

import {
  makeSignDoc as makeSignDocAmino,
  serializeSignDoc,
  encodeSecp256k1Pubkey,
  encodeSecp256k1Signature
} from '@cosmjs/amino'
import type { StdFee, StdSignDoc } from '@cosmjs/amino'
import { rawSecp256k1PubkeyToRawAddress } from '@cosmjs/amino'

function createDefaultTypes (): AminoConverters {
  return {
    ...createAuthzAminoConverters(),
    ...createBankAminoConverters(),
    ...createDistributionAminoConverters(),
    ...createGovAminoConverters(),
    ...createStakingAminoConverters(),
    ...createIbcAminoConverters(),
    ...createVestingAminoConverters()
  }
}

function toCoin (
  amount: string, // in lowest denom (e.g. uatom)
  expectedDenom: string // e.g. uatom
): Coin {
  const total: string | undefined = amount.match(/\d+/)?.at(0)
  const denom: string | undefined = amount.match(/[^\d.-]+/)?.at(0)

  if (total === undefined) {
    throw Error('failed to extract total amount of tokens from: ' + amount)
  }

  if (denom !== undefined && denom !== expectedDenom) {
    throw new Error('denom mismatch, expected: ' + expectedDenom + ' got: ' + denom)
  }

  return coin(total, expectedDenom)
}

export function macroToDenomAmount (
  amount: string, // in macro denom (e.g. ATOM)
  denomMultiplier: string
): string {
  checkMaxDecimalPlaces(denomMultiplier)

  if (BigInt(denomMultiplier) === BigInt(0)) {
    throw new Error('denomMultiplier cannot be 0')
  }

  if (BigNumber(amount).isNaN()) {
    throw new Error('invalid amount: ' + amount + ' failed to parse to number')
  }

  const macroAmount = BigNumber(denomMultiplier).multipliedBy(amount)
  if (macroAmount.isNegative()) {
    throw new Error('amount cannot be negative')
  }

  const decimalPlaces = macroAmount.decimalPlaces()
  if (decimalPlaces !== null && decimalPlaces > 0) {
    throw new Error(
      `exceeded maximum denominator precision, amount: ${macroAmount.toString()}, precision: .${macroAmount.precision()}`
    )
  }

  return macroAmount.toString(10)
}

export function denomToMacroAmount (
  amount: string, // in denom (e.g. uatom, adydx)
  denomMultiplier: string
): string {
  checkMaxDecimalPlaces(denomMultiplier)

  if (BigInt(denomMultiplier) === BigInt(0)) {
    throw new Error('denomMultiplier cannot be 0')
  }

  if (BigNumber(amount).isNaN()) {
    throw new Error('invalid amount: ' + amount + ' failed to parse to number')
  }

  return BigNumber(amount).dividedBy(denomMultiplier).toString(10)
}

export function genWithdrawRewardsMsg (
  delegatorAddress: string,
  validatorAddress: string
): MsgWithdrawDelegatorRewardEncodeObject {
  const withdrawRewardsMsg: MsgWithdrawDelegatorRewardEncodeObject = {
    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
    value: MsgWithdrawDelegatorReward.fromPartial({
      delegatorAddress: delegatorAddress,
      validatorAddress: validatorAddress
    })
  }

  return withdrawRewardsMsg
}

export function genDelegateOrUndelegateMsg (
  networkConfig: CosmosNetworkConfig,
  msgType: string,
  delegatorAddress: string,
  validatorAddress: string,
  amount: string // in lowest denom (e.g. uatom)
): MsgDelegateEncodeObject | MsgUndelegateEncodeObject {
  const coins = toCoin(amount, networkConfig.denom)

  if (!['delegate', 'undelegate'].some((x) => x === msgType)) {
    throw new Error('invalid type: ' + msgType)
  }

  const delegateMsg: MsgDelegateEncodeObject | MsgUndelegateEncodeObject = {
    typeUrl: msgType === 'delegate' ? '/cosmos.staking.v1beta1.MsgDelegate' : '/cosmos.staking.v1beta1.MsgUndelegate',
    value: MsgDelegate.fromPartial({
      delegatorAddress: delegatorAddress,
      validatorAddress: validatorAddress,
      amount: coins
    })
  }

  return delegateMsg
}

export function genBeginRedelegateMsg (
  networkConfig: CosmosNetworkConfig,
  delegatorAddress: string,
  validatorSrcAddress: string,
  validatorDstAddress: string,
  amount: string // in lowest denom (e.g. uatom)
): MsgBeginRedelegateEncodeObject {
  const coins = toCoin(amount, networkConfig.denom)

  const beginRedelegateMsg: MsgBeginRedelegateEncodeObject = {
    typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
    value: MsgBeginRedelegate.fromPartial({
      delegatorAddress: delegatorAddress,
      validatorSrcAddress: validatorSrcAddress,
      validatorDstAddress,
      amount: coins
    })
  }

  return beginRedelegateMsg
}

export async function getGas (
  client: CosmosClient,
  networkConfig: CosmosNetworkConfig,
  signerAddress: string,
  signer: Signer,
  msg: EncodeObject,
  memo?: string
): Promise<number> {
  const extraGas = networkConfig.extraGas ? Number(networkConfig.extraGas) : 0

  if (typeof networkConfig.gas === 'number' && networkConfig.gas > 0) {
    return Number(networkConfig.gas) + extraGas
  }

  if (networkConfig.gas !== 'auto') {
    throw new Error('gas must be either a number or "auto"')
  }

  const registry = new Registry(defaultRegistryTypes)
  const anyMsgs = [registry.encodeAsAny(msg)]

  const signerPubkey = await signer.getPublicKey(signerAddress)
  const pk = Secp256k1.compressPubkey(signerPubkey)
  const pubkey = encodeSecp256k1Pubkey(pk)

  const { sequence } = await client.getSequence(signerAddress)
  const { gasInfo } = await client.getCosmosQueryClient().tx.simulate(anyMsgs, memo ?? '', pubkey, sequence)

  if (gasInfo?.gasUsed === undefined) {
    throw new Error('failed to get gas estimate')
  }

  // it's highly unlikely gas will reach the boundry of Number.MAX_SAFE_INTEGER
  return BigNumber(gasInfo.gasUsed.toString(10), 10).toNumber() + extraGas
}

export async function genSignableTx (
  networkConfig: CosmosNetworkConfig,
  chainID: string,
  msg: EncodeObject,
  accountNumber: number,
  accountSequence: number,
  gas: number,
  memo?: string
): Promise<StdSignDoc> {
  const aminoTypes = new AminoTypes(createDefaultTypes())

  const feeAmt: BigNumber = networkConfig.fee
    ? BigNumber(networkConfig.fee)
    : BigNumber(gas).multipliedBy(networkConfig.gasPrice)
  const fee: StdFee = {
    amount: [coin(feeAmt.toFixed(0, BigNumber.ROUND_CEIL).toString(), networkConfig.denom)],
    gas: gas.toString(10)
  }

  const signDoc = makeSignDocAmino(
    [msg].map((msg) => aminoTypes.toAmino(msg)),
    fee,
    chainID,
    memo,
    accountNumber,
    accountSequence
  )

  return signDoc
}

export async function genSignDocSignature (
  signer: Signer,
  signerAccount: Account,
  signDoc: StdSignDoc,
  isEVM: boolean
): Promise<{ sig: Signature; pk: Uint8Array }> {
  // The LCD doesn't have to return a public key for an acocunt, therefore
  // we do a best effort check to assert the pubkey type is ethsecp256k1
  if (isEVM && signerAccount.pubkey !== undefined) {
    if (!signerAccount.pubkey?.type.toLowerCase().includes('ethsecp256k1')) {
      throw new Error('signer account pubkey type is not ethsecp256k1')
    }
  }

  const msg = isEVM ? keccak256(serializeSignDoc(signDoc)) : new Sha256(serializeSignDoc(signDoc)).digest()
  const message = Buffer.from(msg).toString('hex')
  const note = SafeJSONStringify(signDoc, 2)

  const data: CosmosSigningData = { signDoc }
  const signerAddress = signerAccount.address

  return await signer.sign(signerAddress, { message, data }, { note })
}

export function genSignedTx (signDoc: StdSignDoc, signature: Signature, pk: Uint8Array, pkType?: string): TxRaw {
  const signMode = SignMode.SIGN_MODE_LEGACY_AMINO_JSON

  // cosmos signature doesn't use `v` field, only .r and .s
  const signatureBytes = new Uint8Array([
    ...Buffer.from(signature.r ?? '', 'hex'),
    ...Buffer.from(signature.s ?? '', 'hex')
  ])

  const secppk = encodeSecp256k1Pubkey(pk)
  const pubkey = encodePubkey(secppk)

  if (pkType !== undefined) {
    pubkey.typeUrl = pkType
  }

  // https://github.com/cosmos/cosmjs/blob/main/packages/stargate/src/signingstargateclient.ts#L331
  const aminoTypes = new AminoTypes(createDefaultTypes())
  const signedTxBody = {
    messages: signDoc.msgs.map((msg) => aminoTypes.fromAmino(msg)),
    memo: signDoc.memo
  }

  const signedTxBodyEncodeObject: TxBodyEncodeObject = {
    typeUrl: '/cosmos.tx.v1beta1.TxBody',
    value: signedTxBody
  }

  const registry = new Registry(defaultRegistryTypes)
  const signedTxBodyBytes = registry.encode(signedTxBodyEncodeObject)

  const signedGasLimit = Int53.fromString(signDoc.fee.gas).toNumber()
  const signedSequence = Int53.fromString(signDoc.sequence).toNumber()

  const signedAuthInfoBytes = makeAuthInfoBytes(
    [{ pubkey, sequence: signedSequence }],
    signDoc.fee.amount,
    signedGasLimit,
    signDoc.fee.granter,
    signDoc.fee.payer,
    signMode
  )

  const cosmosSignature = encodeSecp256k1Signature(pk, signatureBytes)

  const txRaw = TxRaw.fromPartial({
    bodyBytes: signedTxBodyBytes,
    authInfoBytes: signedAuthInfoBytes,
    signatures: [fromBase64(cosmosSignature.signature)]
  })

  return txRaw
}

/** @ignore */
export async function getAccount (client: StargateClient, lcdUrl: string, address: string): Promise<Account> {
  // try to get account from the RPC endpoint
  const cosmosAccount = await client.getAccount(address)
  if (cosmosAccount == null) {
    throw new Error('failed to query account: ' + address + ' are you sure the account exists?')
  }

  // if this is an ethermint / evm account, we need to fetch
  // account information from the LCD endpoint (due to lack of codec)
  if (cosmosAccount.address != 'ethermint_account') {
    return cosmosAccount
  }

  return await getEthermintAccount(lcdUrl, address)
}

/** @ignore */
export async function getEthermintAccount (lcdUrl: string, address: string): Promise<Account> {
  const r = await fetch(lcdUrl + '/cosmos/auth/v1beta1/accounts/' + address)
  if (r.status !== 200) {
    throw new Error(
      'failed to query account with LCD endpoint, address: ' + address + ' are you sure the account exists?'
    )
  }

  const data: any = await r.json()
  const base = data['account']['base_account']

  const pubkey =
    base['pub_key'] === null
      ? {
          type: guessPubkeyType(data['account']['@type']),
          value: null
        }
      : {
          type: base['pub_key']['@type'],
          value: base['pub_key']['key']
        }

  return {
    address: base['address'],
    pubkey,
    accountNumber: parseInt(base['account_number']),
    sequence: parseInt(base['sequence'])
  }
}

/** @ignore */
export function publicKeyToAddress (pk: Uint8Array, bechPrefix: string): string {
  const pkCompressed = Buffer.from(publicKeyConvert(pk, true))

  return toBech32(bechPrefix, rawSecp256k1PubkeyToRawAddress(pkCompressed))
}

/** @ignore */
export function publicKeyToEthBasedAddress (pk: Uint8Array, bechPrefix: string): string {
  const pkUncompressed = Buffer.from(publicKeyConvert(pk, false))

  const hash = keccak256(pkUncompressed.subarray(1))
  const ethAddress = hash.slice(-20)

  return toBech32(bechPrefix, ethAddress)
}

/** @ignore */
function guessPubkeyType (accountType: string): string {
  if (accountType.startsWith('/ethermint')) {
    return '/ethermint.crypto.v1.ethsecp256k1.PubKey'
  }

  if (accountType.startsWith('/injective')) {
    return '/injective.crypto.v1beta1.ethsecp256k1.PubKey'
  }

  throw new Error('unknown account type: ' + accountType)
}
