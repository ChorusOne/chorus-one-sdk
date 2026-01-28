import type { Address } from 'viem'

export type PolygonNetworks = 'mainnet' | 'testnet'

export interface NetworkContracts {
  stakeManagerAddress: Address
  stakingTokenAddress: Address
}

/** Contract addresses per network (mainnet = Ethereum L1, testnet = Sepolia L1) */
// Reference: https://docs.polygon.technology/pos/reference/rpc-endpoints/
export const NETWORK_CONTRACTS: Record<PolygonNetworks, NetworkContracts> = {
  mainnet: {
    stakeManagerAddress: '0x5e3Ef299fDDf15eAa0432E6e66473ace8c13D908',
    stakingTokenAddress: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6'
  },
  testnet: {
    stakeManagerAddress: '0x4AE8f648B1Ec892B6cc68C89cc088583964d08bE',
    stakingTokenAddress: '0x3fd0A53F4Bf853985a95F4Eb3F9C9FDE1F8e2b53'
  }
}

/** Chorus One Polygon ValidatorShare contract addresses */
export const CHORUS_ONE_POLYGON_VALIDATORS = {
  mainnet: '0xD9E6987D77bf2c6d0647b8181fd68A259f838C36' as Address
} as const

export const VALIDATOR_SHARE_ABI = [
  {
    type: 'function',
    name: 'buyVoucherPOL',
    inputs: [
      { name: '_amount', type: 'uint256', internalType: 'uint256' },
      { name: '_minSharesToMint', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [{ name: 'amountToDeposit', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'sellVoucher_newPOL',
    inputs: [
      { name: 'claimAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'maximumSharesToBurn', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'unstakeClaimTokens_newPOL',
    inputs: [{ name: 'unbondNonce', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'withdrawRewardsPOL',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'restakePOL',
    inputs: [],
    outputs: [
      { name: 'amountRestaked', type: 'uint256', internalType: 'uint256' },
      { name: 'liquidReward', type: 'uint256', internalType: 'uint256' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getTotalStake',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'uint256', internalType: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'unbondNonces',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'unbonds_new',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [
      { name: 'shares', type: 'uint256', internalType: 'uint256' },
      { name: 'withdrawEpoch', type: 'uint256', internalType: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getLiquidRewards',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view'
  }
] as const

export const STAKE_MANAGER_ABI = [
  {
    type: 'function',
    name: 'epoch',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view'
  }
] as const
