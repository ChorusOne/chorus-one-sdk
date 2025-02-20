import { Hex } from 'viem'
import { StakewiseConnector } from '../connector'

export async function getRewardsHistory (params: {
  connector: StakewiseConnector
  from: number
  to: number
  vault: Hex
  userAccount: Hex
}) {
  const { connector, from, to, vault, userAccount } = params
  const rewardsData = await connector.graphqlRequest({
    type: 'graph',
    op: 'UserRewards',
    query:
      'query UserRewards( $where: AllocatorStats_filter $limit: Int) { allocator: allocatorStats_collection( interval: day first: $limit where: $where ) { apy timestamp earnedAssets totalAssets }}',
    // variables: vars_getRewards
    variables: {
      limit: 365,
      where: {
        timestamp_gte: (from * 1000).toString(),
        allocator_: {
          address: userAccount.toLowerCase(),
          vault: vault.toLowerCase()
        }
      }
    }
  })

  if (!rewardsData.data.allocator) {
    throw new Error(`Rewards data is missing the allocator field`)
  }

  const data = rewardsData.data.allocator as {
    timestamp: string
    earnedAssets: string
    totalAssets: string
  }[]

  return data
    .reduce(
      (acc, reward) => {
        const timestamp = Math.floor(parseInt(reward.timestamp) / 1000)
        if (timestamp > to) return acc
        return [
          ...acc,
          {
            timestamp,
            totalRewards: BigInt(reward.totalAssets),
            dailyRewards: BigInt(reward.earnedAssets)
          }
        ]
      },
      [] as {
        timestamp: number
        totalRewards: bigint
        dailyRewards: bigint
      }[]
    )
    .sort((a, b) => a.timestamp - b.timestamp)
}
