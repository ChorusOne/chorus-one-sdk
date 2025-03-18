import Decimal from 'decimal.js'
import { MintTokenConfigAbi } from '../contracts/mintTokenConfigAbi'
import { PriceOracleAbi } from '../contracts/priceOracleAbi'
import { StakewiseConnector } from '../connector'
import { Hex } from 'viem'

export const getBaseData = async (
  connector: StakewiseConnector,
  vaultAddress: Hex
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

  const osTokenConfigPromise = connector.graphqlRequest({
    type: 'graph',
    op: 'Vault',
    query: `
    query Vault($address: ID!) {
      vault(id: $address) {
        osTokenConfig {
          ltvPercent
          liqThresholdPercent
        }
      }
    }
  `,
    variables: {
      address: vaultAddress
    }
  }) as Promise<{ data: { vault: { osTokenConfig: { ltvPercent: bigint; liqThresholdPercent: bigint } } } }>

  const [mintTokenRate, osTokenConfig] = await Promise.all([mintTokenRatePromise, osTokenConfigPromise])

  // ETH per osETH exchange rate
  const rate = new Decimal(mintTokenRate.toString()).div(1_000_000_000_000_000_000).toString()
  return {
    rate,
    ltvPercent: BigInt(osTokenConfig.data.vault.osTokenConfig.ltvPercent),
    thresholdPercent: BigInt(osTokenConfig.data.vault.osTokenConfig.liqThresholdPercent) // minting threshold, max 90%
  }
}
