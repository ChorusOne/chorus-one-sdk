import { z } from 'zod'

/**
 * Zod schemas for runtime validation of Hyperliquid API responses
 * Types are inferred from schemas to maintain a single source of truth
 */

// ===== Exchange API Response Schemas =====
export const ExchangeApiSuccessResponseSchema = z.object({
  status: z.literal('ok'),
  response: z.object({
    type: z.literal('default')
  })
})

export const ExchangeApiErrorResponseSchema = z.object({
  status: z.literal('err'),
  response: z.string()
})

export const ExchangeApiResponseSchema = z.discriminatedUnion('status', [
  ExchangeApiSuccessResponseSchema,
  ExchangeApiErrorResponseSchema
])

export type ExchangeApiSuccessResponse = z.infer<typeof ExchangeApiSuccessResponseSchema>
export type ExchangeApiErrorResponse = z.infer<typeof ExchangeApiErrorResponseSchema>
export type ExchangeApiResponse = z.infer<typeof ExchangeApiResponseSchema>

// ===== Info Endpoint Response Schemas =====
export const DelegatorSummarySchema = z.object({
  delegated: z.string(),
  undelegated: z.string(),
  totalPendingWithdrawal: z.string(),
  nPendingWithdrawals: z.number()
})

export const DelegationSchema = z.object({
  validator: z.string(),
  amount: z.string(),
  lockedUntilTimestamp: z.number()
})

export const StakingRewardSchema = z.object({
  time: z.number(),
  source: z.enum(['delegation', 'commission']),
  totalAmount: z.string()
})

export const DelegationHistoryEventSchema = z.object({
  time: z.number(),
  hash: z.string(),
  delta: z.union([
    z.object({
      delegate: z.object({
        validator: z.string().startsWith('0x'),
        amount: z.string(),
        isUndelegate: z.boolean()
      })
    }),
    z.object({
      cDeposit: z.object({
        amount: z.string()
      })
    }),
    z.object({
      withdrawal: z.object({
        amount: z.string(),
        phase: z.string()
      })
    })
  ])
})

export const SpotBalanceSchema = z.object({
  coin: z.string(),
  token: z.number(),
  total: z.string(),
  hold: z.string(),
  entryNtl: z.string()
})

export const SpotBalancesResponseSchema = z.object({
  balances: z.array(SpotBalanceSchema)
})

export const DelegationsResponseSchema = z.array(DelegationSchema)
export const StakingRewardsResponseSchema = z.array(StakingRewardSchema)
export const DelegationHistoryResponseSchema = z.array(DelegationHistoryEventSchema)

export type DelegatorSummary = z.infer<typeof DelegatorSummarySchema>
export type Delegation = z.infer<typeof DelegationSchema>
export type StakingReward = z.infer<typeof StakingRewardSchema>
export type DelegationHistoryEvent = z.infer<typeof DelegationHistoryEventSchema>
export type SpotBalance = z.infer<typeof SpotBalanceSchema>

export type DelegatorHistoryDelta = DelegationHistoryEvent['delta']
