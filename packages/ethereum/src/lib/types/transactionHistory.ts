import { Hex } from 'viem'

export enum VaultActionType {
  /** Vault creation. */
  VaultCreated = 'VaultCreated',
  /** Deposit into the vault. */
  Deposited = 'Deposited',
  /** Redemption of assets from the vault. */
  Redeemed = 'Redeemed',
  /** Claiming exited assets. */
  ExitedAssetsClaimed = 'ExitedAssetsClaimed',
  /** Minting osToken. */
  OsTokenMinted = 'OsTokenMinted',
  /** Burning osToken. */
  OsTokenBurned = 'OsTokenBurned',
  /** Redemption of osToken. */
  OsTokenRedeemed = 'OsTokenRedeemed',
  /** Liquidation of osToken. */
  OsTokenLiquidated = 'OsTokenLiquidated',
  /** Migration from StakeWise v2. */
  Migrated = 'Migrated'
}

/**
 * Represents a transaction history data point for a vault.
 */
export interface VaultTransaction {
  /**
   * The address of the vault that was interacted with.
   */
  vault: Hex
  /**
   * The date and time when the vault transaction occurred.
   */
  when: Date
  /**
   * The type of vault transaction.
   */
  type: VaultActionType
  /**
   * The amount of ETH transacted, denominated in wei.
   */
  amount: bigint
  /**
   * The hash of the transaction.
   */
  hash: string
}
