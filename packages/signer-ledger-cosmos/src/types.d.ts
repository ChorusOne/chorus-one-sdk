/** @ignore */
export interface LedgerCosmosSignerConfig {
  // address prefix e.g. celestia
  bechPrefix: string

  // BIP39 address derivation path
  accounts: [{ hdPath: string }]
}
