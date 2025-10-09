/**
 * @monad/staker - TypeScript SDK for Monad Blockchain Staking
 *
 * This SDK provides a comprehensive interface for interacting with Monad's
 * staking contract, enabling staking, unstaking, rewards management, and withdrawals.
 *
 * Built with viem for type-safety, performance, and modern patterns.
 *
 * @example
 * ```typescript
 * import { MonadStaker } from '@chorus-one/monad'
 * import { FireblocksSigner } from '@chorus-one/signer-fireblocks'
 *
 * const staker = new MonadStaker({
 *   rpcUrl: 'https://testnet-rpc.monad.xyz'
 * })
 *
 * await staker.init()
 *
 * // Build staking transaction
 * const { tx } = await staker.buildStakeTx({
 *   validatorId: 1,
 *   amount: '1000' // in MON
 * })
 *
 * // Sign with Fireblocks
 * const signer = new FireblocksSigner({...})
 * await signer.init()
 *
 * const { signedTx } = await staker.sign({
 *   signer,
 *   signerAddress: '0xYourAddress',
 *   tx
 * })
 *
 * // Broadcast transaction
 * const { txHash } = await staker.broadcast({ signedTx })
 *
 * // Check transaction status
 * const { status, receipt } = await staker.getTxStatus({ txHash })
 * console.log('Status:', status) // 'success'
 * ```
 */

export { MonadStaker } from './staker'

// Export types
export type {
  MonadNetworkConfig,
  DelegatorInfo,
  WithdrawalRequestInfo,
  EpochInfo,
  StakeOptions,
  CompoundOptions,
  WithdrawOptions,
  ClaimRewardsOptions,
  UnstakeOptions,
  Transaction,
  MonadTxStatus
} from './types'

// Export constants
export { MONAD_STAKING_CONTRACT_ADDRESS } from './constants'

// Export utilities
export { isValidValidatorId, isValidWithdrawalId } from './utils'

// Export ABI (for advanced usage)
export { MONAD_STAKING_ABI } from './constants'
