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
     * The Max vault address.
     * This vault leverages Chorus One’s proprietary strategies to maximize staking rewards through innovative and evolving approaches. Historically, it has benefited from early adoption of Restaking and Looped Staking in collaboration with Stakewise. Chorus One continues to leverage in-house research to capture reward-enhancing opportunities as they arise, delivering maximum rewards to delegators.
     */
    maxVault: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08'
  },
  /**
   * Hoodi testnet validator addresses.
   */
  hoodi: {
    /**
     * Testnet vault
     */
    maxVault: '0x2148ffbc0a2d83f5e3605041f5b85d54305f803c',
    /**
     * Testnet vault
     */
    obolDvVault: '0x2148ffbc0a2d83f5e3605041f5b85d54305f803c'
  }
} as const
