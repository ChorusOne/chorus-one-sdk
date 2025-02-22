/** @ignore */
export interface LedgerTonSignerConfig {
  // Whether derived addresses should be bounceable
  bounceable: boolean

  // BIP44 address derivation path
  // e.g. 44'/607'/0'/0'/0'/0'
  accounts: [{ hdPath: string }]
}
