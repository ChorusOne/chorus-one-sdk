import { Hex } from 'viem'
import { StakewiseConnector } from '../connector'
import { RewardsDataPoint } from '../types/rewards'

async function extractVaultUserRewards (
  connector: StakewiseConnector,
  vault: Hex,
  allocatorAddress: string,
  dateFrom: Date,
  dateTo: Date
): Promise<RewardsDataPoint[]> {
  const vars_getRewards = {
    vaultAddress: vault,
    user: allocatorAddress.toLowerCase(),
    dateFrom: Math.floor(dateFrom.getTime() / 1000).toString()
  }

  const rewardsData = await connector.graphqlRequest({
    type: 'api',
    op: 'UserRewards',
    query: `query UserRewards($user: String!, $vaultAddress: String!, $dateFrom: DateAsTimestamp!) { userRewards(user: $user, vaultAddress: $vaultAddress, dateFrom: $dateFrom) { date, sumRewards, }}`,
    variables: vars_getRewards
  })

  if (!rewardsData.data.userRewards) {
    throw new Error(`Rewards data is missing the userRewards field`)
  }
  const dataPoints: RewardsDataPoint[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rewardsData.data.userRewards.forEach((reward: any) => {
    const when: Date = new Date(parseInt(reward.date) * 1000)
    if (when <= dateTo) {
      const sumRewards: string = reward.sumRewards
      dataPoints.push({
        when: when,
        amount: BigInt(sumRewards),
        vault: vault
      })
    }
  })

  return dataPoints
}

export async function getRewardsHistory (params: {
  connector: StakewiseConnector
  from: Date
  to: Date
  vault: Hex
  userAccount: Hex
}): Promise<Array<RewardsDataPoint>> {
  const { connector, from, to, vault, userAccount } = params
  let vaultRewards: RewardsDataPoint[] = []

  vaultRewards = await extractVaultUserRewards(connector, vault, userAccount, from, to)

  return vaultRewards
}
