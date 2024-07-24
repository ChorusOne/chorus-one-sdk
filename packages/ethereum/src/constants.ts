/**
 * Contains the Ethereum validator addresses for Chorus One's vaults.
 */
export const CHORUS_ONE_ETHEREUM_VALIDATORS = {
  /**
   * Ethereum mainnet validator addresses.
   */
  ethereum: {
    /**
     * The Obol Distributed Validator Technology (DVT) vault address.
     * This vault leverages Obol's DVT to provide enhanced resilience and decentralization for Ethereum staking.
     */
    obolDvVault: '0xdbdee04c72a02a740b9f26ada9203582c8a99daf',

    /**
     * The MEV Max vault address.
     * This vault utilizes Chorus One’s proprietary [MEV Research](https://chorus.one/categories/mev) to enhance staking returns.
     */
    mevMaxVault: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08'
  },
  /**
   * Holesky testnet validator addresses.
   */
  holesky: {
    /**
     * Testnet vault address
     */
    mevMaxVault: '0x95d0db03d59658e1af0d977ecfe142f178930ac5',
    /**
     * Testnet vault address
     */
    obolDvVault: '0x95d0db03d59658e1af0d977ecfe142f178930ac5'
  }
} as const
