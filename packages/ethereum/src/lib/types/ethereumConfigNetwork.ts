import { Networks } from './networks'

/** @ignore */
export interface EthereumNetworkConfig {
  // RPC URL e.g. https://ethereum-hoodi-rpc.publicnode.com
  rpcUrl?: string
  // chain name i.e. ethereum, hoodi
  network: Networks
}
// EIP-7251 Consensus layer constants (in Gwei)
export const MIN_ACTIVATION_BALANCE_GWEI = 2 ** 5 * 10 ** 9 // 32 ETH = 32000000000 Gwei
export const MAX_EFFECTIVE_BALANCE_ELECTRA_GWEI = 2 ** 11 * 10 ** 9 // 2048 ETH = 2048000000000 Gwei

// Address validation patterns
export const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
export const COMPOUNDING_ADDRESS_REGEX = /^(0x02[a-fA-F0-9]{62})$/
