import { Hex } from 'viem'

export type ValidatorStatus = 'created' | 'active' | 'exited'
export type BatchStatusEnum = 'created' | 'ready'

export interface CreateBatchRequest {
  batch_id: string
  withdrawal_address: Hex
  fee_recipient: Hex
  number_of_validators: number
  network: string
}

export interface CreateBatchResponse {
  batch_id: string
  message: string
}

export interface ValidatorExitMessage {
  message: {
    epoch: number
    validator_index: number
  }
  signature: string
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

export interface BatchDetailsValidator {
  deposit_data: BatchDetailsDepositData
  status: ValidatorStatus
  exit_message: ValidatorExitMessage | null
}

export interface BatchDetailsResponse {
  validators: BatchDetailsValidator[]
  status: BatchStatusEnum
  created: string
  is_compounding: boolean
  deposit_gwei_per_validator: number
  status_code?: number // Optional HTTP status code
}

export interface Validator extends BatchDetailsValidator {
  eligible_for_exit: boolean
  epochs_until_eligible?: number
}

export interface BatchValidators extends Omit<BatchDetailsResponse, 'validators'> {
  validators: Validator[]
}

export interface ListBatchItem {
  batch_id: string
  created: number
  status: BatchStatusEnum
  is_compounding: boolean
  deposit_gwei_per_validator: number
}

export interface ListBatchesResponse {
  requests: ListBatchItem[]
}

// ========== Beacon Node types ==========
export interface BeaconValidatorStatus {
  index: string
  balance: string
  status: string
  validator: {
    pubkey: string
    withdrawal_credentials: string
    effective_balance: string
    slashed: boolean
    activation_eligibility_epoch: string
    activation_epoch: string
    exit_epoch: string
    withdrawable_epoch: string
  }
}

export interface BeaconValidatorResponse {
  execution_optimistic: boolean
  finalized: boolean
  data: BeaconValidatorStatus[]
}

export interface BeaconGenesisResponse {
  data: {
    genesis_time: string
    genesis_validators_root: string
    genesis_fork_version: string
  }
}
