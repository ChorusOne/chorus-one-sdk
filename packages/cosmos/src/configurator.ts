import { Chain } from './registry/chain'
import { AssetList, Asset } from './registry/assetlist'
import { CosmosNetworkConfig } from './types'

/**
 * This class provides the functionality to auto configure the Cosmos network
 * based on the chain registry: https://github.com/cosmos/chain-registry
 *
 * The CosmosStaker requires a user to provide information about gas, fees and denom. This data varies per network and changes over time.
 * With this class that configuration is done automatically, based on the external community-based chain registry.
 */
export class CosmosConfigurator {
  /**
   * This **static** method is used to generate the network configuration for the Cosmos network.
   *
   * @param network - Network name (e.g. celestia)
   * @param gas - (Optional) Gas limit for the transaction
   * @param gasPrice - (Optional) Gas price per unit of gas
   *
   * @returns Returns an CosmosNetworkConfig object
   */
  static async genNetworkConfig (network: string, gas?: number, gasPrice?: string): Promise<CosmosNetworkConfig> {
    const chainResponse = await fetch(
      `https://raw.githubusercontent.com/cosmos/chain-registry/master/${network}/chain.json`
    )
    if (!chainResponse.ok) {
      throw new Error(`Failed to fetch chain.json: ${chainResponse.statusText}`)
    }

    const chain: Chain = (await chainResponse.json()) as Chain
    if (!chain.apis?.rpc || !chain.apis.rpc.length) {
      throw new Error(`No RPC endpoints found for ${network}`)
    }

    if (!chain.apis?.rest || !chain.apis.rest.length) {
      throw new Error(`No REST endpoints found for ${network}`)
    }

    if (!chain.staking?.staking_tokens || chain.staking.staking_tokens.length !== 1) {
      throw new Error(`Expected exactly one staking token for ${network}`)
    }

    const stakingDenom = chain.staking.staking_tokens[0].denom
    if (!chain.fees) {
      throw new Error(`No fees found for ${network}`)
    }

    const feeTokens = chain.fees.fee_tokens.filter((feeToken) => feeToken.denom === stakingDenom)
    if (feeTokens.length !== 1) {
      throw new Error(`Expected exactly one fee token for ${network}`)
    }
    const feeToken = feeTokens[0]

    const assetList = await this.getAssetList(network)
    const activeAssets: Asset[] = assetList.assets.filter((asset) => !asset.deprecated && asset.base === stakingDenom)
    if (activeAssets.length !== 1) {
      throw new Error(`Expected exactly one active staking asset for ${network}`)
    }

    const macroDenoms = activeAssets[0].denom_units.filter((denomUnit) => denomUnit.denom !== stakingDenom)
    if (macroDenoms.length !== 1) {
      throw new Error(`Expected exactly one macro denom for ${network}`)
    }

    if (chain.fees.fee_tokens[0].denom !== stakingDenom) {
      throw new Error(`Fee token ${chain.fees.fee_tokens[0].denom} is different from staking token ${stakingDenom}`)
    }

    const newGasPrice = gasPrice
      ? parseInt(gasPrice)
      : feeToken.average_gas_price ?? feeToken.low_gas_price ?? feeToken.fixed_min_gas_price ?? 0
    if (!newGasPrice) {
      throw new Error(`No gas price found for ${network}`)
    }

    const newGas = gas ?? 200000 // cosmos sdk default
    const fee = newGas * newGasPrice

    return {
      rpcUrl: chain.apis.rpc[0].address,
      lcdUrl: chain.apis.rest[0].address,
      bechPrefix: chain.bech32_prefix,
      denom: stakingDenom,
      denomMultiplier: BigInt(10 ** macroDenoms[0].exponent).toString(10),
      gas: newGas,
      gasPrice: newGasPrice.toString(),
      fee: fee.toString(),
      isEVM: chain.key_algos?.includes('ethsecp256k1')
    }
  }

  private static async getAssetList (network: string): Promise<AssetList> {
    const assetResponse = await fetch(
      `https://raw.githubusercontent.com/cosmos/chain-registry/master/${network}/assetlist.json`
    )
    if (!assetResponse.ok) {
      throw new Error(`Failed to fetch assetlist.json: ${assetResponse.statusText}`)
    }

    return (await assetResponse.json()) as AssetList
  }
}
