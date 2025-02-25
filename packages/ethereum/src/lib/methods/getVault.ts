import { Hex } from 'viem'
import { StakewiseConnector } from '../connector'
import { Vault } from '../types/vault'
interface VaultProperties {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vaultData: any
}

// Extracts vault properties from Stakewise API
async function extractVaultProperties (connector: StakewiseConnector, vault: Hex): Promise<VaultProperties> {
  const vars_getVault = {
    address: vault.toLowerCase()
  }

  const today = new Date()
  const dateBeforeYesterday = new Date()
  dateBeforeYesterday.setDate(dateBeforeYesterday.getDate() - 8)
  today.setDate(today.getDate())

  const vaultData = await connector.graphqlRequest({
    type: 'graph',
    op: 'Vault',
    query: `
            query Vault($address: ID!) {
            vault(id: $address) {
                address: id
                performance: score
                apy
                admin
                isErc20
                imageUrl
                capacity
                mevEscrow
                isPrivate
                createdAt
                mevEscrow
                tokenName
                feePercent
                totalAssets
                isBlocklist
                displayName
                description
                whitelister
                tokenSymbol
                feeRecipient
                blocklistCount
                whitelistCount
                blocklistManager
            }
            }
        `,
    variables: vars_getVault
  })

  if (!vaultData.data.vault) {
    throw new Error(`Vault data is missing the vault field`)
  }
  return { vaultData: vaultData.data }
}

// Get latest balance and cached properties
async function extractVaultDetails (connector: StakewiseConnector, vault: Hex): Promise<Vault> {
  const vaultProperties: VaultProperties = await extractVaultProperties(connector, vault)

  const vaultData = vaultProperties.vaultData

  return {
    address: vault,
    name: vaultData.vault.displayName,
    description: vaultData.vault.description,
    logoUrl: vaultData.vault.imageUrl,
    tvl: BigInt(vaultData.vault.totalAssets).toString(),
    apy: vaultData.vault.apy > 0 ? vaultData.vault.apy : '0'
  }
}

export async function getVault (params: { connector: StakewiseConnector; vault: Hex }): Promise<Vault> {
  const { connector, vault } = params
  return extractVaultDetails(connector, vault)
}
