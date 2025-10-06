/**
 * @monad/staker - TypeScript SDK for Monad Blockchain Staking
 *
 * This SDK provides a comprehensive interface for interacting with Monad's
 * staking contract, enabling delegation, rewards management, and withdrawals.
 *
 * Built with viem for type-safety, performance, and modern patterns.
 *
 * @example
 * ```typescript
 * import { MonadStaker } from '@monad/staker'
 * import { createWalletClient, http } from 'viem'
 * import { privateKeyToAccount } from 'viem/accounts'
 *
 * const staker = new MonadStaker({
 *   rpcUrl: 'https://your-monad-rpc.com',
 *   contractAddress: '0x0000000000000000000000000000000000001000'
 * })
 *
 * await staker.init()
 *
 * // Build delegation transaction
 * const tx = await staker.buildDelegateTx({
 *   validatorId: 1,
 *   amount: '1000' // in MON
 * })
 *
 * // Sign and send using viem wallet client
 * const account = privateKeyToAccount('0x...')
 * const walletClient = createWalletClient({
 *   account,
 *   chain: { id: 30143, name: 'Monad', nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: ['https://your-monad-rpc.com'] } } },
 *   transport: http('https://your-monad-rpc.com')
 * })
 *
 * const hash = await walletClient.sendTransaction(tx)
 * console.log('Transaction:', hash)
 * ```
 */

export { MonadStaker } from './staker'

// Export types
export type {
  MonadNetworkConfig,
  ValidatorInfo,
  DelegatorInfo,
  WithdrawalRequestInfo,
  EpochInfo,
  DelegateOptions,
  CompoundOptions,
  WithdrawOptions,
  ClaimRewardsOptions,
  UndelegateOptions
} from './types'

// Export constants
export { MONAD_STAKING_CONTRACT_ADDRESS } from './constants'

// Export utilities
export { isValidValidatorId, isValidWithdrawalId } from './utils'

// Export ABI (for advanced usage)
export { MONAD_STAKING_ABI } from './constants'
