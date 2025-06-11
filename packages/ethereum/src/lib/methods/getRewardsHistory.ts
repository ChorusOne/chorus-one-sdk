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

  const MAX_DAYS = 1000 // 1000 days is the maximum limit for the query
  const daysDiff = Math.floor((to - from) / (1000 * 60 * 60 * 24))
  if (daysDiff > MAX_DAYS) {
    throw new Error(`Time range cannot exceed ${MAX_DAYS} days`)
  }

  const rewardsData = await connector.graphqlRequest({
    type: 'graph',
    op: 'UserRewards',
    query:
      'query UserRewards( $where: AllocatorStats_filter $limit: Int) { allocator: allocatorStats_collection( interval: day first: $limit where: $where orderBy: timestamp orderDirection: asc ) { apy timestamp earnedAssets totalAssets }}',
    variables: {
      limit: MAX_DAYS,
      where: {
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
  let totalRewards = BigInt(0)
  return data
    .reduce(
      (acc, reward) => {
        const timestamp = Math.floor(parseInt(reward.timestamp) / 1000)
        totalRewards += BigInt(reward.earnedAssets)
        if (timestamp >= to) return acc
        if (timestamp < from) return acc
        return [
          ...acc,
          {
            timestamp,
            totalRewards,
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
