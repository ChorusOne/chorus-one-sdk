import { Hex } from 'viem'

export type ValidatorStatus = 'created' | 'active' | 'exited'
export type BatchStatus = 'created' | 'ready'

export interface CreateBatchRequest {
  batch_id: string
  withdrawal_address: Hex
  fee_recipient: Hex
  number_of_validators: number
  network: string
  is_compounding?: boolean
  deposit_gwei_per_validator?: bigint
}

export interface CreateBatchResponse {
  batch_id: string
  message: string
  is_compounding?: boolean
  deposit_gwei_per_validator?: number
}
// https://native-staking.chorus.one/docs
export interface BatchDetailsResponse {
  validators: BatchDetailsValidator[]
  status: BatchStatus
  created: string
  is_compounding: boolean
  deposit_gwei_per_validator: number
  status_code?: number // Optional HTTP status code
}
export interface BatchDetailsValidator {
  deposit_data: BatchDetailsDepositData
  status: ValidatorStatus
}
export interface BatchDetailsDepositData {
  amount: number
  deposit_cli_version: string
  deposit_data_root: string
  deposit_message_root: string
  fork_version: string
  network_name: string
  pubkey: string
  signature: string
  withdrawal_credentials: string
}
export interface ListBatchesResponse {
  requests: ListBatchItem[]
}
export interface ListBatchItem {
  batch_id: string
  created: number
  status: BatchStatus
  is_compounding: boolean
  deposit_gwei_per_validator: number
}
