export const MAINNET_API_URL = 'https://api.hyperliquid.xyz'
export const TESTNET_API_URL = 'https://api.hyperliquid-testnet.xyz'

// curl -s -X POST "https://api.hyperliquid.xyz/info" \
//   -H "Content-Type: application/json" \
//   -d '{
//     "type": "tokenDetails",
//     "tokenId": "0x0d01dc56dcaaca66ad901c959b4011ec" // HYPE
//   }' | jq -r '.weiDecimals'
export const DECIMALS = 8
export const TESTNET_CHAIN_ID = '0x66eee' as `0x${string}`
export const MAINNET_CHAIN_ID = '0x66eee' as `0x${string}`
