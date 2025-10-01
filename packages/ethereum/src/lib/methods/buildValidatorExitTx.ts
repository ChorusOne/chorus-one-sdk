import { Hex, PublicClient } from 'viem'
import { Transaction } from '../types/transaction'
import { getWithdrawalQueue } from '../utils/getWithdrawalFee'
import { NetworkConfig } from '../utils/getNetworkConfig'

// https://eips.ethereum.org/EIPS/eip-7002#add-withdrawal-request
export async function buildValidatorExitTx (request: {
  ethPublicClient: PublicClient
  config: NetworkConfig
  validatorPubkey: string
}): Promise<Transaction> {
  const { ethPublicClient, config, validatorPubkey } = request

  const queue = await getWithdrawalQueue(ethPublicClient, config)

  const pubkey = validatorPubkey.startsWith('0x') ? validatorPubkey.slice(2) : validatorPubkey

  // Validate pubkey length (should be 48 bytes = 96 hex characters)
  if (pubkey.length !== 96) {
    throw new Error(`Invalid validator pubkey length: expected 96 characters, got ${pubkey.length}`)
  }

  // Amount is 0 for full exit
  const amount = 0n
  const amountHex = amount.toString(16).padStart(16, '0')
  // Calldata has to be 56 bytes:
  // - 48 bytes for pubkey
  // - 8 bytes for amount (uint64)
  const calldata: Hex = `0x${pubkey}${amountHex}`

  return {
    to: config.withdrawalContractAddress,
    data: calldata,
    value: queue.fee
  }
}
