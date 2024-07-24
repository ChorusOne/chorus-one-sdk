import Decimal from 'decimal.js'
import { getBaseData } from '../utils/getBaseData'
import { StakewiseConnector } from '../connector'
import { MintTokenControllerAbi } from '../contracts/mintCotrollerAbi'

export const getMintHealth = async (params: {
  connector: StakewiseConnector
  mintedShares: bigint
  stakedAssets: bigint
}): Promise<'healthy' | 'moderate' | 'risky' | 'unhealthy'> => {
  const { connector, mintedShares, stakedAssets } = params

  const mintedAssets = await (connector.eth.readContract({
    abi: MintTokenControllerAbi,
    address: connector.mintTokenController,
    functionName: 'convertToAssets',
    args: [mintedShares]
  }) as Promise<bigint>)

  if (mintedAssets === 0n || stakedAssets === 0n) {
    return 'healthy'
  }
  const { thresholdPercent } = await getBaseData(connector)

  const healthFactor = new Decimal(stakedAssets.toString())
    .mul(thresholdPercent.toString())
    .div(mintedAssets.toString())
    .div(10_000)
    .toDecimalPlaces(4)
    .toNumber()

  // If healthFactor = 1, then position is Healthy, but we need to add
  // a small gap to notify the user in advance of problems with the position
  if (healthFactor >= 1.02) {
    return 'healthy'
  } else if (healthFactor >= 1.01) {
    return 'moderate'
  } else if (healthFactor >= 1.0) {
    return 'risky'
  }
  return 'unhealthy'
}
