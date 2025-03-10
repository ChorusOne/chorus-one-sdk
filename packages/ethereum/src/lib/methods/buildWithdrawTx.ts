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

  if (positionTickets && positionTickets.length === 1) {
    const item = queueItems.find((item) => item.positionTicket.toString() === positionTickets[0])

    if (!item || !item.isWithdrawable || item.exitQueueIndex === undefined) {
      throw new Error(`Position #${positionTickets[0]} is not withdrawable`)
    }

    const tx = encodeFunctionData({
      abi: VaultABI,
      functionName: 'claimExitedAssets',
      args: [item.positionTicket, BigInt(item.timestamp / 1000), item.exitQueueIndex]
    })

    return {
      to: vault,
      data: tx
    }
  }

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

  if (!multicallArgs.length) {
    throw new Error('No withdrawable positions found')
  }

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
