import { Hex } from 'viem'
import { MintTokenControllerAbi } from '../contracts/mintCotrollerAbi'
import { getBaseData } from '../utils/getBaseData'
import { StakewiseConnector } from '../connector'
import { getStake } from './getStake'
import { getMint } from './getMint'

export const getMaxMint = async (params: {
  connector: StakewiseConnector
  vault: Hex
  userAccount: Hex
}): Promise<bigint> => {
  const { connector, vault, userAccount } = params
  const { ltvPercent } = await getBaseData(connector, vault)
  const { assets } = await getStake({
    connector,
    userAccount,
    vaultAddress: vault
  })
  const mint = await getMint({
    connector,
    userAccount,
    vaultAddress: vault
  })

  if (ltvPercent <= 0n || assets <= 0n) {
    return 0n
  }

  const avgRewardPerSecond = (await connector.eth.readContract({
    abi: MintTokenControllerAbi,
    functionName: 'avgRewardPerSecond',
    address: connector.mintTokenController
  })) as bigint

  const maxMintedAssets: bigint = (assets * ltvPercent) / 1_000_000_000_000_000_000n

  const maxMintedAssetsHourReward: bigint = (maxMintedAssets * avgRewardPerSecond * 3600n) / 1_000_000_000_000_000_000n
  const canMintAssets = maxMintedAssets - maxMintedAssetsHourReward - mint.minted.assets

  if (canMintAssets > 0) {
    const maxMintShares = (await connector.eth.readContract({
      abi: MintTokenControllerAbi,
      functionName: 'convertToShares',
      address: connector.mintTokenController,
      args: [canMintAssets]
    })) as bigint

    return maxMintShares
  }

  return 0n
}
