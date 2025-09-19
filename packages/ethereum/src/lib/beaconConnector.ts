import { Networks } from './types/networks'
import { ValidatorExitMessage, BeaconValidatorResponse, BeaconGenesisResponse } from './types/nativeStaking'

export class BeaconConnector {
  /** Base URL for Beacon Node API */
  baseURL: string
  /** Network name */
  network: Networks

  constructor (network: Networks, beaconRpcUrl?: string) {
    this.network = network

    if (beaconRpcUrl) {
      this.baseURL = beaconRpcUrl
    } else {
      // Default beacon node URLs
      switch (network) {
        case 'ethereum':
          this.baseURL = 'https://beaconapi.consensys.net'
          break
        case 'hoodi':
          this.baseURL = 'https://holesky-beacon-api.publicnode.com'
          break
        default:
          throw new Error(`No default beacon node URL for network: ${network}`)
      }
    }
  }

  /**
   * Makes an API request to the Beacon Node API
   */
  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Beacon Node API error (${response.status}): ${errorText}`)
    }

    const text = await response.text()
    if (!text) {
      return {} as T
    }
    return JSON.parse(text) as T
  }

  /**
   * Submits voluntary exit messages to the beacon chain
   */
  async submitVoluntaryExits (exitMessages: ValidatorExitMessage[]): Promise<Set<number>> {
    const exitedValidators = new Set<number>()
    for (const exitMessage of exitMessages) {
      try {
        const endpoint = '/eth/v1/beacon/pool/voluntary_exits'
        await this.apiRequest(endpoint, {
          method: 'POST',
          body: JSON.stringify(exitMessage)
        })
        exitedValidators.add(exitMessage.message.validator_index)
      } catch (error) {
        console.error(`Error submitting exit for validator index ${exitMessage.message.validator_index}:`, error)
      }
    }
    return exitedValidators
  }

  /**
   * Gets validator statuses from the beacon chain
   */
  async getValidatorStatuses (validatorIndices: string[]): Promise<BeaconValidatorResponse> {
    const ids = validatorIndices.map((id) => `0x${id}`).join(',')
    const endpoint = `/eth/v1/beacon/states/head/validators?id=${ids}`

    return this.apiRequest<BeaconValidatorResponse>(endpoint)
  }

  /**
   * Gets the current epoch from the beacon chain
   */
  async getCurrentEpoch (): Promise<number> {
    const genesis = await this.apiRequest<BeaconGenesisResponse>('/eth/v1/beacon/genesis')
    const genesisTime = parseInt(genesis.data.genesis_time)
    const currentTime = Math.floor(Date.now() / 1000)
    const secondsPerSlot = 12
    const slotsPerEpoch = 32
    const secondsPerEpoch = secondsPerSlot * slotsPerEpoch

    return Math.floor((currentTime - genesisTime) / secondsPerEpoch)
  }

  /**
   * Checks if validators are eligible for exit using pubkeys
   */
  async checkExitEligibility (pubkeys: string[]): Promise<
    Array<{
      pubkey: string
      validatorIndex: string
      eligible: boolean
      epochsUntilEligible?: number
    }>
  > {
    const [validatorStatuses, currentEpoch] = await Promise.all([
      this.getValidatorStatuses(pubkeys),
      this.getCurrentEpoch()
    ])

    return validatorStatuses.data.map((validator) => {
      const activationEpoch = parseInt(validator.validator.activation_epoch)
      const epochsActive = currentEpoch - activationEpoch
      const eligible = epochsActive >= 256

      return {
        pubkey: validator.validator.pubkey,
        validatorIndex: validator.index,
        eligible,
        epochsUntilEligible: eligible ? undefined : 256 - epochsActive
      }
    })
  }
}
