import { Hex } from 'viem'
import { StakewiseConnector } from '../connector'

export const getUnstakeQueue = async (params: { connector: StakewiseConnector; userAccount: Hex; vault: Hex }) => {
  const { connector, vault, userAccount } = params
  const queueData = await connector.graphqlRequest({
    type: 'graph',
    op: 'exitQueue',
    query: `
            query exitQueue($where: ExitRequest_filter) {
              exitRequests(where: $where) {
                receiver
                isClaimed
                timestamp
                totalAssets
                isClaimed
                isClaimable
                exitedAssets
                isV2Position
                positionTicket
                exitQueueIndex
                withdrawalTimestamp
              }
            }
            `,
    variables: {
      where: {
        vault: vault.toLowerCase(),
        receiver: userAccount.toLowerCase()
      }
    }
  })

  if (!queueData.data.exitRequests) {
    throw new Error('Queue data is missing the exitRequests field')
  }

  const data = queueData.data.exitRequests as {
    timestamp: string
    isClaimable: boolean
    isClaimed: boolean
    totalAssets: string
    exitedAssets: string
    positionTicket: string
    exitQueueIndex: string | null
  }[]

  return data.map((queueItem) => ({
    positionTicket: BigInt(queueItem.positionTicket),
    exitQueueIndex: queueItem.exitQueueIndex ? BigInt(queueItem.exitQueueIndex) : undefined,
    isWithdrawable: queueItem.isClaimable,
    wasWithdrawn: queueItem.isClaimed,
    timestamp: Number(queueItem.timestamp) * 1000,
    totalAssets: BigInt(queueItem.totalAssets),
    exitedAssets: BigInt(queueItem.exitedAssets || 0)
  }))
}
