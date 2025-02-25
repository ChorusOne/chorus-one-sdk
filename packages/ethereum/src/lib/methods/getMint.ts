import { Hex } from 'viem'
import { MintTokenControllerAbi } from '../contracts/mintCotrollerAbi'
import { VaultABI } from '../contracts/vaultAbi'
import { StakewiseConnector } from '../connector'

export const getMint = async (params: { connector: StakewiseConnector; userAccount: Hex; vaultAddress: Hex }) => {
  const { connector, vaultAddress, userAccount } = params

  const mintedShares = await connector.eth.readContract({
    abi: VaultABI,
    functionName: 'osTokenPositions',
    address: vaultAddress,
    args: [userAccount]
  })

  const [mintedAssets, feePercent] = await Promise.all([
    connector.eth.readContract({
      abi: MintTokenControllerAbi,
      address: connector.mintTokenController,
      functionName: 'convertToAssets',
      args: [mintedShares]
    }) as Promise<bigint>,
    connector.eth.readContract({
      abi: MintTokenControllerAbi,
      functionName: 'feePercent',
      address: connector.mintTokenController
    }) as Promise<bigint>
  ])
  const protocolFeePercent = feePercent / 100n

  return {
    minted: {
      assets: mintedAssets,
      shares: mintedShares
    },
    protocolFeePercent
  }
}
