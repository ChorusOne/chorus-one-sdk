import { Hex, encodeFunctionData } from 'viem'
import { VaultABI } from '../contracts/vaultAbi'
import { StakewiseConnector } from '../connector'
import { Transaction } from '../types/transaction'
import { getUnstakeQueue } from './getUnstakeQueue'

export async function buildWithdrawTx (request: {
  connector: StakewiseConnector
  userAccount: Hex
  vault: Hex
  positionTickets?: string[]
}): Promise<Transaction> {
  const { userAccount, connector, vault, positionTickets } = request
  const queueItems = await getUnstakeQueue({
    connector,
    userAccount,
    vault
  })

  const multicallArgs = queueItems
    .filter((item) => {
      if (!positionTickets) return item.isWithdrawable

      return positionTickets.includes(item.positionTicket.toString())
    })
    .map((item) => {
      const timestamp = item.timestamp / 1000
      if (item.exitQueueIndex === undefined) {
        throw new Error('Exit queue index is missing')
      }
      if (!item.isWithdrawable) {
        throw new Error(`Position #${item.positionTicket} is not withdrawable`)
      }

      return encodeFunctionData({
        abi: VaultABI,
        functionName: 'claimExitedAssets',
        args: [item.positionTicket, BigInt(timestamp), item.exitQueueIndex]
      })
    })

  const tx = encodeFunctionData({
    abi: VaultABI,
    functionName: 'multicall',
    args: [multicallArgs]
  })

  return {
    to: vault,
    data: tx
  }
}
