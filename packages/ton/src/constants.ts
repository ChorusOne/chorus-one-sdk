type ChorusOneTonValidator = Record<'mainnet' | 'testnet', { tonPoolPair: [string, string] }>

/**
 * Contains the TON validator addresses for Chorus One's validators.
 */
export const CHORUS_ONE_TON_VALIDATORS: ChorusOneTonValidator = {
  /**
   * TON mainnet validator addresses.
   */
  mainnet: {
    /**
     * Chorus One's TON Pool Pair for the mainnet
     */
    tonPoolPair: [
      'EQBFbbSCrAnX2XWOjSq2qnAx_GRdx2wZIFqrlk9D0-1mxHDN',
      'EQBNL2W5KZuw3Y3FbrLdDfIdXdrYXQFfcGfDO3kig0EK8zxz'
    ]
  },
  /**
   * TON testnet validator addresses.
   */
  testnet: {
    /**
     * Chorus One's TON Pool Pair for the testnet
     */
    tonPoolPair: [
      'kQAHBakDk_E7qLlNQZxJDsqj_ruyAFpqarw85tO-c03fK26F',
      'kQCltujow9Sq3ZVPPU6CYGfqwDxYwjlmFGZ1Wt0bAYebio4o'
    ]
  }
} as const
