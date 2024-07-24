import { Hex } from 'viem'
import { VaultABI } from '../contracts/vaultAbi'
import { StakewiseConnector } from '../connector'

export const getStake = async (params: { connector: StakewiseConnector; userAccount: Hex; vaultAddress: Hex }) => {
  const { connector, userAccount, vaultAddress } = params
  const publicClient = connector.eth
  const shares = (await publicClient.readContract({
    abi: VaultABI,
    address: vaultAddress,
    functionName: 'getShares',
    args: [userAccount]
  })) as bigint

  const assets = (await publicClient.readContract({
    abi: VaultABI,
    address: vaultAddress,
    functionName: 'convertToAssets',
    args: [shares]
  })) as bigint

  return {
    shares: shares || 0n,
    assets: assets || 0n
  }
}
