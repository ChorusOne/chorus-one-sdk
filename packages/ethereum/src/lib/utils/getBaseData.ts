import Decimal from 'decimal.js'
import { MintTokenConfigAbi } from '../contracts/mintTokenConfigAbi'
import { PriceOracleAbi } from '../contracts/priceOracleAbi'
import { StakewiseConnector } from '../connector'

export const getBaseData = async (
  connector: StakewiseConnector
): Promise<{
  rate: string
  ltvPercent: bigint
  thresholdPercent: bigint
}> => {
  const publicClient = connector.eth
  const mintTokenRatePromise = publicClient.readContract({
    abi: PriceOracleAbi,
    functionName: 'latestAnswer',
    address: connector.priceOracle
  }) as Promise<bigint>
  const ltvPercentPromise = publicClient.readContract({
    abi: MintTokenConfigAbi,
    functionName: 'ltvPercent',
    address: connector.mintTokenConfig
  }) as Promise<bigint>
  const thresholdPercentPromise = publicClient.readContract({
    abi: MintTokenConfigAbi,
    functionName: 'liqThresholdPercent',
    address: connector.mintTokenConfig
  }) as Promise<bigint>
  const [mintTokenRate, ltvPercent, thresholdPercent] = await Promise.all([
    mintTokenRatePromise,
    ltvPercentPromise,
    thresholdPercentPromise
  ])
  // ETH per osETH exchange rate
  const rate = new Decimal(mintTokenRate.toString()).div(1_000_000_000_000_000_000).toString()
  return {
    rate,
    ltvPercent,
    thresholdPercent // minting threshold, max 90%
  }
}
