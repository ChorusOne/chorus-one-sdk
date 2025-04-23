import { Networks } from './networks'

/** @ignore */
export interface EthereumNetworkConfig {
  // RPC URL e.g. https://ethereum-hoodi-rpc.publicnode.com
  rpcUrl?: string
  // chain name i.e. ethereum, hoodi
  network: Networks
}
