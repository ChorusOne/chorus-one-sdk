import { Hex } from 'viem'

export interface ValidatorDepositData {
  pubkey: string
  withdrawal_credentials: string
  amount: number
  signature: string
  deposit_message_root: string
  deposit_data_root: string
  fork_version: string
  network_name: string
  deposit_cli_version: string
}

export interface ValidatorExitMessage {
  message: {
    epoch: string
    validator_index: string
  }
  signature: string
}

export type ValidatorStatus = 'created' | 'active' | 'exited'

export interface Validator {
  pubkey: string
  status: ValidatorStatus
  deposit_data: ValidatorDepositData
  exit_message?: ValidatorExitMessage
}

export interface ValidatorBatch {
  batch_id: string
  withdrawal_address: Hex
  fee_recipient: Hex
  number_of_validators: number
  network: string
  status: 'pending' | 'ready' | 'failed'
  validators: Validator[]
  created_at: string
  updated_at: string
}

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

export interface BatchStatusResponse extends ValidatorBatch {
  statusCode?: number
}
