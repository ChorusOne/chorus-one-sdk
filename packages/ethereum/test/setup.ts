import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'

let initialSnapshotId: string | null = null
let currentSnapshotId: string | null = null

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(hardhat.rpcUrls.default.http[0])
})

before(async function () {
  this.timeout(10000) // Increase timeout for setup
  initialSnapshotId = (await publicClient.request({
    method: 'evm_snapshot',
    params: []
  } as any)) as string

  currentSnapshotId = initialSnapshotId
})

export const getInitialSnapshotId = () => initialSnapshotId
export const getCurrentSnapshotId = () => currentSnapshotId

export const restoreToInitialState = async () => {
  if (!currentSnapshotId) {
    throw new Error('No snapshot available to restore to')
  }

  const success = await publicClient.request({
    method: 'evm_revert',
    params: [currentSnapshotId]
  } as any)

  if (!success) {
    throw new Error('Failed to restore snapshot')
  }

  const newSnapshotId = (await publicClient.request({
    method: 'evm_snapshot',
    params: []
  } as any)) as string

  if (!newSnapshotId) {
    throw new Error('Failed to take new snapshot after restore')
  }
  currentSnapshotId = newSnapshotId
  return success
}
