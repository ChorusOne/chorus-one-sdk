import { Address } from 'viem'

export const CHORUS_ONE_HYPERLIQUID_VALIDATOR = '0x30c66ebc7f5ef4f340b424a26e4d944f60129815' as `0x${string}`

export const MAINNET_API_URL = 'https://api.hyperliquid.xyz'
export const TESTNET_API_URL = 'https://api.hyperliquid-testnet.xyz'

export const MAINNET_HYPERLIQUID_EVM_RPC_URL = 'https://rpc.hyperliquid.xyz/evm'
export const TESTNET_HYPERLIQUID_EVM_RPC_URL = 'https://rpc.hyperliquid-testnet.xyz/evm'

// Query HYPE token details:
// curl -s -X POST "https://api.hyperliquid.xyz/info" \
//   -H "Content-Type: application/json" \
//   -d '{"type": "spotMeta"}' | jq '.tokens[] | select(.name == "HYPE")'
//
// Returns: { "name": "HYPE", "index": 150, "tokenId": "0x0d01dc56dcaaca66ad901c959b4011ec", "weiDecimals": 8, ... }
// - index: 150 (used for EVM precompile calls)
// - tokenId: UUID format (used for API calls)
// - weiDecimals: 8 (HYPE decimal places)
export const DECIMALS = 8
export const HYPE_TOKEN_INDEX = 150n
export const TESTNET_CHAIN_ID = '0x66eee' as `0x${string}`
export const MAINNET_CHAIN_ID = '0x66eee' as `0x${string}`

// CoreWriter system contract address on HyperEVM
// https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore
export const CORE_WRITER_ADDRESS: Address = '0x3333333333333333333333333333333333333333'

// CoreWriter ABI - minimal interface for sendRawAction
export const CORE_WRITER_ABI = [
  {
    inputs: [{ name: 'data', type: 'bytes' }],
    name: 'sendRawAction',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

export const HYPE_SYSTEM_CONTRACT_ADDRESS: Address = '0x2222222222222222222222222222222222222222'
// HYPE System Contract ABI - event emitted when HYPE is bridged from EVM to Core
// Reference: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers
export const HYPE_SYSTEM_CONTRACT_ABI = [
  {
    type: 'event',
    name: 'Received',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  }
] as const

// L1Read precompile addresses
// https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore
export const SPOT_BALANCE_PRECOMPILE_ADDRESS: Address = '0x0000000000000000000000000000000000000801'
export const DELEGATOR_SUMMARY_PRECOMPILE_ADDRESS: Address = '0x0000000000000000000000000000000000000805'
