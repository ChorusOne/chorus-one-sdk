import { Hex } from 'viem'
import { MintTokenControllerAbi } from '../contracts/mintCotrollerAbi'
import { VaultABI } from '../contracts/vaultAbi'
import { StakewiseConnector } from '../connector'

export const getMint = async (params: { connector: StakewiseConnector; userAccount: Hex; vaultAddress: Hex }) => {
  const { connector, vaultAddress, userAccount } = params

  const gqlMintedSharesJson = await connector.graphqlRequest({
    op: 'OsTokenPositions',
    type: 'graph',
    query: `
          query OsTokenPositions($address: Bytes, $vaultAddress: String) { osTokenPositions(where: { address: $address, vault: $vaultAddress }) { shares }}
          `,
    variables: {
      vaultAddress,
      address: userAccount
    }
  })

  if (!gqlMintedSharesJson.data.osTokenPositions) {
    throw new Error(`Minted shares data is missing the osTokenPositions field`)
  }
  const gqlMintedShares = BigInt(gqlMintedSharesJson.data.osTokenPositions[0]?.shares || 0)

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
      shares: mintedShares,
      fee: mintedShares - gqlMintedShares,
      mintedWithoutFee: gqlMintedShares
    },
    protocolFeePercent
  }
}
