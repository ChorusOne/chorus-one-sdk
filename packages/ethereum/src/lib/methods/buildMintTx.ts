import { Hex, encodeFunctionData, zeroAddress } from 'viem'
import { StakewiseConnector } from '../connector'
import { Transaction } from '../types/transaction'
import { VaultABI } from '../contracts/vaultAbi'

export const buildMintTx = async (request: {
  connector: StakewiseConnector
  userAccount: Hex
  vault: Hex
  amount: bigint
  referrer?: Hex
}): Promise<Transaction> => {
  const { userAccount, amount, vault, referrer = zeroAddress } = request

  const tx: Hex = encodeFunctionData({
    abi: VaultABI,
    functionName: 'mintOsToken',
    args: [userAccount, amount, referrer]
  })

  return {
    account: userAccount,
    to: vault,
    data: tx
  }
}
