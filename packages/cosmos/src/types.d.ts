import type { StdSignDoc } from '@cosmjs/amino'
import type { IndexedTx } from '@cosmjs/stargate'

/** @ignore */
export interface CosmosSigningData {
  signDoc: StdSignDoc
}
/** @ignore */
export interface CosmosNetworkConfig {
  // e.g. https://celestia.chorus.one:443 - the :port is required
  rpcUrl: string

  // e.g. REST API URL for the chain e.g. https://celestia-lcd.chorus.one:443
  lcdUrl: string

  // address prefix e.g. celestia
  bechPrefix: string

  // coin lowest denominator e.g utia
  denom: string

  // Multiplier to convert the base coin unit to its smallest subunit (e.g., `1000000` for 1 TIA = 1000000 utia)
  denomMultiplier: string

  // default TX maximum gas e.g 200000. If set to "auto", the gas will be
  // calculated automatically via RPC
  gas: number | 'auto'

  // price per per gas unit (in micro-token e.g. uatom)
  // for example "0.025" (equivalent of "0.025 uatom" or "0.000000025 ATOM")
  //
  // NOTE: Currently the gas price is in the token specified in `denom`. However
  // some Cosmos-SDK networks may pay in other tokens for gas. Therefore this
  // field is of string type to accommodate for future changes
  //
  // To see current gas prices for Celestia (and other Cosmos-SDK networks), see:
  // https://github.com/cosmos/chain-registry/blob/master/celestia/chain.json
  gasPrice: string

  // additional "buffer" gas to be added to the gas limit (sometimes the gas
  // estimation is not accurate, so this is a way to add a buffer)
  extraGas?: number

  // fixed fee paid for TX - this will override the gasPrice * gas = fee calculation
  // e.g "5000" (equivalent of "5000 uatom" or "0.005 ATOM")
  fee?: string

  // Some cosmos chains are based on the evmos/ethermint SDK, an EVM compatible falvour of cosmos-sdk.
  // This flag instructs the staker to use different address derivation logic
  //
  // Examples of Evmos/Ethermint based networks: evmos, zetachain, dymension, injective and more
  isEVM?: boolean
}

/** @ignore */
export interface CosmosTxStatus {
  status: 'success' | 'failure' | 'pending' | 'unknown'
  receipt: IndexedTx | null
}
