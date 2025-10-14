// Docs: https://docs.monad.xyz/developer-essentials/staking/staking-precompile

import type { Address } from 'viem'

/**
 * Monad Staking Contract Address (precompile)
 * Same across all networks
 */
export const MONAD_STAKING_CONTRACT_ADDRESS: Address = '0x0000000000000000000000000000000000001000'

export const MONAD_STAKING_ABI = [
  {
    type: 'function',
    name: 'addValidator',
    inputs: [
      { name: 'payload', type: 'bytes', internalType: 'bytes' },
      { name: 'signedSecpMessage', type: 'bytes', internalType: 'bytes' },
      { name: 'signedBlsMessage', type: 'bytes', internalType: 'bytes' }
    ],
    outputs: [{ name: 'validatorId', type: 'uint64', internalType: 'uint64' }],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'changeCommission',
    inputs: [
      { name: 'validatorId', type: 'uint64', internalType: 'uint64' },
      { name: 'commission', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [{ name: 'success', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'claimRewards',
    inputs: [{ name: 'validatorId', type: 'uint64', internalType: 'uint64' }],
    outputs: [{ name: 'success', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'compound',
    inputs: [{ name: 'validatorId', type: 'uint64', internalType: 'uint64' }],
    outputs: [{ name: 'success', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'delegate',
    inputs: [{ name: 'validatorId', type: 'uint64', internalType: 'uint64' }],
    outputs: [{ name: 'success', type: 'bool', internalType: 'bool' }],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'externalReward',
    inputs: [{ name: 'validatorId', type: 'uint64', internalType: 'uint64' }],
    outputs: [{ name: 'success', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getConsensusValidatorSet',
    inputs: [{ name: 'startIndex', type: 'uint32', internalType: 'uint32' }],
    outputs: [
      { name: 'isDone', type: 'bool', internalType: 'bool' },
      { name: 'nextIndex', type: 'uint32', internalType: 'uint32' },
      { name: 'valIds', type: 'uint64[]', internalType: 'uint64[]' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getDelegations',
    inputs: [
      { name: 'delegator', type: 'address', internalType: 'address' },
      { name: 'startValId', type: 'uint64', internalType: 'uint64' }
    ],
    outputs: [
      { name: 'isDone', type: 'bool', internalType: 'bool' },
      { name: 'nextValId', type: 'uint64', internalType: 'uint64' },
      { name: 'valIds', type: 'uint64[]', internalType: 'uint64[]' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getDelegator',
    inputs: [
      { name: 'validatorId', type: 'uint64', internalType: 'uint64' },
      { name: 'delegator', type: 'address', internalType: 'address' }
    ],
    outputs: [
      { name: 'stake', type: 'uint256', internalType: 'uint256' },
      { name: 'accRewardPerToken', type: 'uint256', internalType: 'uint256' },
      { name: 'unclaimedRewards', type: 'uint256', internalType: 'uint256' },
      { name: 'deltaStake', type: 'uint256', internalType: 'uint256' },
      { name: 'nextDeltaStake', type: 'uint256', internalType: 'uint256' },
      { name: 'deltaEpoch', type: 'uint64', internalType: 'uint64' },
      { name: 'nextDeltaEpoch', type: 'uint64', internalType: 'uint64' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getDelegators',
    inputs: [
      { name: 'validatorId', type: 'uint64', internalType: 'uint64' },
      { name: 'startDelegator', type: 'address', internalType: 'address' }
    ],
    outputs: [
      { name: 'isDone', type: 'bool', internalType: 'bool' },
      { name: 'nextDelegator', type: 'address', internalType: 'address' },
      { name: 'delegators', type: 'address[]', internalType: 'address[]' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getEpoch',
    inputs: [],
    outputs: [
      { name: 'epoch', type: 'uint64', internalType: 'uint64' },
      { name: 'inEpochDelayPeriod', type: 'bool', internalType: 'bool' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getExecutionValidatorSet',
    inputs: [{ name: 'startIndex', type: 'uint32', internalType: 'uint32' }],
    outputs: [
      { name: 'isDone', type: 'bool', internalType: 'bool' },
      { name: 'nextIndex', type: 'uint32', internalType: 'uint32' },
      { name: 'valIds', type: 'uint64[]', internalType: 'uint64[]' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getSnapshotValidatorSet',
    inputs: [{ name: 'startIndex', type: 'uint32', internalType: 'uint32' }],
    outputs: [
      { name: 'isDone', type: 'bool', internalType: 'bool' },
      { name: 'nextIndex', type: 'uint32', internalType: 'uint32' },
      { name: 'valIds', type: 'uint64[]', internalType: 'uint64[]' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getValidator',
    inputs: [{ name: 'validatorId', type: 'uint64', internalType: 'uint64' }],
    outputs: [
      { name: 'authAddress', type: 'address', internalType: 'address' },
      { name: 'flags', type: 'uint64', internalType: 'uint64' },
      { name: 'stake', type: 'uint256', internalType: 'uint256' },
      { name: 'accRewardPerToken', type: 'uint256', internalType: 'uint256' },
      { name: 'commission', type: 'uint256', internalType: 'uint256' },
      { name: 'unclaimedRewards', type: 'uint256', internalType: 'uint256' },
      { name: 'consensusStake', type: 'uint256', internalType: 'uint256' },
      { name: 'consensusCommission', type: 'uint256', internalType: 'uint256' },
      { name: 'snapshotStake', type: 'uint256', internalType: 'uint256' },
      { name: 'snapshotCommission', type: 'uint256', internalType: 'uint256' },
      { name: 'secpPubkey', type: 'bytes', internalType: 'bytes' },
      { name: 'blsPubkey', type: 'bytes', internalType: 'bytes' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getWithdrawalRequest',
    inputs: [
      { name: 'validatorId', type: 'uint64', internalType: 'uint64' },
      { name: 'delegator', type: 'address', internalType: 'address' },
      { name: 'withdrawalId', type: 'uint8', internalType: 'uint8' }
    ],
    outputs: [
      { name: 'withdrawalAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'accRewardPerToken', type: 'uint256', internalType: 'uint256' },
      { name: 'withdrawEpoch', type: 'uint64', internalType: 'uint64' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'syscallOnEpochChange',
    inputs: [{ name: 'epoch', type: 'uint64', internalType: 'uint64' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'syscallReward',
    inputs: [{ name: 'blockAuthor', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  { type: 'function', name: 'syscallSnapshot', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    name: 'undelegate',
    inputs: [
      { name: 'validatorId', type: 'uint64', internalType: 'uint64' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'withdrawalId', type: 'uint8', internalType: 'uint8' }
    ],
    outputs: [{ name: 'success', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'validatorId', type: 'uint64', internalType: 'uint64' },
      { name: 'withdrawalId', type: 'uint8', internalType: 'uint8' }
    ],
    outputs: [{ name: 'success', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'event',
    name: 'ClaimRewards',
    inputs: [
      { name: 'validatorId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'delegator', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'CommissionChanged',
    inputs: [
      { name: 'validatorId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'oldCommission', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'newCommission', type: 'uint256', indexed: false, internalType: 'uint256' }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Delegate',
    inputs: [
      { name: 'validatorId', type: 'uint64', indexed: true, internalType: 'uint64' },
      { name: 'delegator', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'activationEpoch', type: 'uint64', indexed: false, internalType: 'uint64' }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Undelegate',
    inputs: [
      { name: 'validatorId', type: 'uint64', indexed: true, internalType: 'uint64' },
      { name: 'delegator', type: 'address', indexed: true, internalType: 'address' },
      { name: 'withdrawalId', type: 'uint8', indexed: false, internalType: 'uint8' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'activationEpoch', type: 'uint64', indexed: false, internalType: 'uint64' }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'ValidatorCreated',
    inputs: [
      { name: 'validatorId', type: 'uint64', indexed: true, internalType: 'uint64' },
      { name: 'authAddress', type: 'address', indexed: true, internalType: 'address' }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'ValidatorStatusChanged',
    inputs: [
      { name: 'validatorId', type: 'uint64', indexed: true, internalType: 'uint64' },
      { name: 'authAddress', type: 'address', indexed: true, internalType: 'address' },
      { name: 'flags', type: 'uint64', indexed: false, internalType: 'uint64' }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Withdraw',
    inputs: [
      { name: 'validatorId', type: 'uint64', indexed: true, internalType: 'uint64' },
      { name: 'delegator', type: 'address', indexed: true, internalType: 'address' },
      { name: 'withdrawalId', type: 'uint8', indexed: false, internalType: 'uint8' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'withdrawEpoch', type: 'uint64', indexed: false, internalType: 'uint64' }
    ],
    anonymous: false
  }
] as const
