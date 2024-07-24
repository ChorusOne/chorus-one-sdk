import { Hex } from 'viem'
import { StakewiseConnector } from '../connector'
import { VaultABI } from '../contracts/vaultAbi'
import { UnstakeQueueItem } from '../types/unstakeQueue'

export const getUnstakeQueue = async (params: { connector: StakewiseConnector; userAccount: Hex; vault: Hex }) => {
  const { connector, vault, userAccount } = params
  const queueData = await connector.graphqlRequest({
    type: 'graph',
    op: 'exitQueue',
    query: `
            query exitQueue($receiver: Bytes, $vault: String!) {
              exitRequests(where: {
                receiver: $receiver,
                vault: $vault,
              }) {
                positionTicket
                totalShares
                timestamp
              }
            }
            `,
    variables: {
      vault: vault.toLowerCase(),
      receiver: userAccount
    }
  })

  if (!queueData.data.exitRequests) {
    throw new Error('Queue data is missing the exitRequests field')
  }

  return parseQueueData({
    exitRequests: queueData.data.exitRequests.map((r: any) => ({
      positionTicket: BigInt(r.positionTicket),
      totalShares: BigInt(r.totalShares),
      when: new Date(Number(r.timestamp) * 1000)
    })),
    connector,
    userAddress: userAccount,
    vaultAddress: vault
  })
}

const getIs24HoursPassed = async (when: Date, connector: StakewiseConnector) => {
  const lastBlock = await connector.eth.getBlock()

  const current = lastBlock ? lastBlock.timestamp : Number((new Date().getTime() / 1000).toFixed(0))

  const diff = Number(current) - Number(when.getTime() / 1000)

  return diff > 86_400 // 24 hours
}

type ParseQueueDataArgs = {
  connector: StakewiseConnector
  userAddress: Hex
  vaultAddress: Hex
  exitRequests: Array<{
    positionTicket: bigint
    totalShares: bigint
    when: Date
  }>
}

const parseQueueData = async ({ connector, userAddress, vaultAddress, exitRequests }: ParseQueueDataArgs) => {
  const unstakeQueue = await Promise.all(
    exitRequests.map(async (exitRequest): Promise<UnstakeQueueItem> => {
      const { positionTicket, when, totalShares } = exitRequest

      // We must fetch the exit queue index for every position.
      // Based on the response we can determine if we can claim exited assets.
      const baseExitQueueIndex = await connector.eth.readContract({
        abi: VaultABI,
        address: vaultAddress,
        functionName: 'getExitQueueIndex',
        args: [positionTicket]
      })

      const exitQueueIndex = baseExitQueueIndex > -1n ? baseExitQueueIndex : undefined

      // 24 hours must have elapsed since the position was created
      const is24HoursPassed = await getIs24HoursPassed(when, connector)

      // If the index is -1 then we cannot claim anything. Otherwise, the value is >= 0.
      const isValid = exitQueueIndex !== undefined

      const isWithdrawable = isValid && is24HoursPassed

      const totalAssets = await connector.eth.readContract({
        abi: VaultABI,
        address: vaultAddress,
        functionName: 'convertToAssets',
        args: [totalShares]
      })

      if (!isWithdrawable || exitQueueIndex === undefined) {
        const nonWithdrawable: UnstakeQueueItem = {
          exitQueueIndex,
          positionTicket,
          when,
          isWithdrawable: false,
          totalShares,
          totalAssets,
          leftShares: totalShares,
          leftAssets: totalAssets,
          withdrawableShares: 0n,
          withdrawableAssets: 0n
        }
        return nonWithdrawable
      }

      const [leftShares, withdrawableShares, withdrawableAssets] = await connector.eth.readContract({
        abi: VaultABI,
        address: vaultAddress,
        functionName: 'calculateExitedAssets',
        args: [userAddress, positionTicket, BigInt(Number(when) / 1000), exitQueueIndex] as const
      })

      const leftAssets = await connector.eth.readContract({
        abi: VaultABI,
        address: vaultAddress,
        functionName: 'convertToAssets',
        args: [leftShares]
      })

      const fullPosition: UnstakeQueueItem = {
        positionTicket,
        when,
        totalShares,
        isWithdrawable: true,
        exitQueueIndex,
        totalAssets,
        leftShares,
        leftAssets,
        withdrawableShares,
        withdrawableAssets
      }
      return fullPosition
    })
  )

  return unstakeQueue.sort((a, b) => Number(b.when) - Number(a.when))
}
