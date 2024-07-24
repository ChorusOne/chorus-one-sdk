import { Networks } from './networks'

/** @ignore */
export interface EthereumNetworkConfig {
  // RPC URL e.g. https://ethereum-holesky-rpc.publicnode.com
  rpcUrl?: string
  // chain name i.e. ethereum, holesky
  network: Networks
}
