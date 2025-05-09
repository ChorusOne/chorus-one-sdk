import { toNano } from '@ton/ton'
import { TupleItem } from '@ton/core'

/**
 * Pool status parameters
 */
export interface PoolStatusParams {
  balance?: bigint
  balanceSent?: bigint
  balancePendingDeposits?: bigint
  balancePendingWithdrawals?: bigint
  balanceWithdraw?: bigint
}

/**
 * Creates mock data for a pool status response
 */
export const createPoolStatusMock = (params: PoolStatusParams = {}): TupleItem[] => {
  const {
    balance = toNano('20000'),
    balanceSent = toNano('0'),
    balancePendingDeposits = toNano('0'),
    balancePendingWithdrawals = toNano('0'),
    balanceWithdraw = toNano('0')
  } = params

  return [
    { type: 'int', value: balance },
    { type: 'int', value: balanceSent },
    { type: 'int', value: balancePendingDeposits },
    { type: 'int', value: balancePendingWithdrawals },
    { type: 'int', value: balanceWithdraw }
  ]
}

/**
 * Member parameters
 */
export interface MemberParams {
  balance?: bigint
  pendingDeposit?: bigint
  pendingWithdraw?: bigint
  withdraw?: bigint
}

/**
 * Creates mock data for a delegator member response
 */
export const createMemberMock = (params: MemberParams = {}): TupleItem[] => {
  const {
    balance = toNano('1'),
    pendingDeposit = toNano('1'),
    pendingWithdraw = toNano('1'),
    withdraw = toNano('0.05')
  } = params

  return [
    { type: 'int', value: balance },
    { type: 'int', value: pendingDeposit },
    { type: 'int', value: pendingWithdraw },
    { type: 'int', value: withdraw }
  ]
}

/**
 * Pool parameters
 */
export interface ParamsData {
  enabled?: bigint
  updatesEnabled?: bigint
  minStake?: bigint
  depositFee?: bigint
  withdrawFee?: bigint
  poolFee?: bigint
  receiptPrice?: bigint
  minStakeTotal?: bigint
}

/**
 * Creates mock data for a pool params response
 */
export const createParamsMock = (params: ParamsData = {}): TupleItem[] => {
  const {
    enabled = BigInt(1),
    updatesEnabled = BigInt(1),
    minStake = toNano('1'),
    depositFee = toNano('0.05'),
    withdrawFee = toNano('0.05'),
    poolFee = toNano('0.1'),
    receiptPrice = toNano('0.01'),
    minStakeTotal = toNano('10')
  } = params

  return [
    { type: 'int', value: enabled },
    { type: 'int', value: updatesEnabled },
    { type: 'int', value: minStake },
    { type: 'int', value: depositFee },
    { type: 'int', value: withdrawFee },
    { type: 'int', value: poolFee },
    { type: 'int', value: receiptPrice },
    { type: 'int', value: minStakeTotal }
  ]
}
