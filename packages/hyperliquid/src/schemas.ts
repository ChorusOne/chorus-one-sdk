import { z } from 'zod'

/**
 * Zod schemas for runtime validation of Hyperliquid API responses
 * Types are inferred from schemas to maintain a single source of truth
 */

// ===== Common Validation Schemas =====

/**
 * Validator address schema - validates 42-character hexadecimal format
 * e.g. 0x0000000000000000000000000000000000000000
 */
export const ValidatorAddressSchema = z
  .string()
  .regex(
    /^0x[0-9a-fA-F]{40}$/,
    'Invalid validator address format. Must be a 42-character hexadecimal string starting with 0x'
  )

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

// ===== Bridge / Token Registry Schemas =====

/**
 * EVM contract information for a token that can be bridged
 * null if the token is not bridgeable to EVM
 */
export const EvmContractSchema = z.object({
  address: z.string().startsWith('0x'),
  evm_extra_wei_decimals: z.number()
}).nullable()

/**
 * Spot token metadata from spotMeta Info endpoint
 */
export const SpotTokenSchema = z.object({
  name: z.string(),
  szDecimals: z.number(),
  weiDecimals: z.number(),
  index: z.number(),
  tokenId: z.string().startsWith('0x'),
  isCanonical: z.boolean(),
  evmContract: EvmContractSchema,
  fullName: z.string().nullable(),
  deployerTradingFeeShare: z.string()
})

/**
 * Response from spotMeta Info endpoint
 */
export const SpotMetaResponseSchema = z.object({
  tokens: z.array(SpotTokenSchema),
  universe: z.array(z.any()) // Universe structure varies, we don't need it for bridging
})

export type EvmContract = z.infer<typeof EvmContractSchema>
export type SpotToken = z.infer<typeof SpotTokenSchema>
export type SpotMetaResponse = z.infer<typeof SpotMetaResponseSchema>
