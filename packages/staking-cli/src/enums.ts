// it's a workaround for ./types.d.ts failing to resolve if the enum is used as
// value (not only the type)
export enum SignerType {
  FIREBLOCKS = 'fireblocks',
  LOCAL = 'local',
  LEDGER = 'ledger'
}

export enum NetworkType {
  COSMOS = 'cosmos',
  NEAR = 'near',
  SUBSTRATE = 'substrate',
  AVALANCHE = 'avalanche',
  TON = 'ton',
  SOLANA = 'solana',
  ETHEREUM = 'ethereum'
}
