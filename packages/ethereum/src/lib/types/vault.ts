import { Hex } from 'viem'

/**
 * Provides details about a specific vault in the system.
 */
export interface Vault {
  /**
   * The address of the vault.
   */
  address: Hex
  /**
   * A human-readable string identifier for the vault.
   */
  name: string
  /**
   * A description of the vault.
   */
  description: string
  /**
   * The URL of the vault's logo, which can be displayed in the UI.
   */
  logoUrl: string
  /**
   * The total value of assets locked in the vault, denominated in wei.
   */
  tvl: string
  /**
   * The average annual yield percentage for the vault, based on historical data.
   */
  apy: number
}
