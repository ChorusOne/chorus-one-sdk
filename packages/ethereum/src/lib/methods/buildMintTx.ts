import { Hex, encodeFunctionData } from 'viem'
import { StakewiseConnector } from '../connector'
import { Transaction } from '../types/transaction'
import { VaultABI } from '../contracts/vaultAbi'
import { getDefaultTrackingAddress } from '../utils/getDefaultTrackingAddress'

export const buildMintTx = async (request: {
  connector: StakewiseConnector
  userAccount: Hex
  vault: Hex
  amount: bigint
  referrer?: Hex
}): Promise<Transaction> => {
  const DEFAULT_SDK_TRACKING_ADDRESS = getDefaultTrackingAddress()
  const { userAccount, amount, vault, referrer = DEFAULT_SDK_TRACKING_ADDRESS } = request

  const tx: Hex = encodeFunctionData({
    abi: VaultABI,
    functionName: 'mintOsToken',
    args: [userAccount, amount, referrer]
  })

  return {
    to: vault,
    data: tx
  }
}
