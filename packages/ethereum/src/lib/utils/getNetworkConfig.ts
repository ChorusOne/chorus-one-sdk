import { Hex } from 'viem'
import { Networks } from '../types/networks'

export interface NetworkConfig {
  depositContractAddress: Hex
  withdrawalContractAddress: Hex
  excessInhibitor: Hex
  compoundingFeeAddition: bigint
  excessWithdrawalRequestsStorageSlot: bigint
  consolidationRequestFeeAddition: bigint
  minConsolidationRequestFee: bigint
}

/**
 * Gets the network configuration based on the network name
 * @param network - The network name ('ethereum' or 'hoodi')
 * @returns The network configuration
 */
export function getNetworkConfig (network: Networks): NetworkConfig {
  switch (network) {
    case 'ethereum':
      // https://github.com/ethereum/EIPs/blob/dd845b91eb7445877f2d5b4381319a72dea0a766/EIPS/eip-7910.md?plain=1#L181
      // https://eips.ethereum.org/EIPS/eip-7002#specification
      return {
        depositContractAddress: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
        withdrawalContractAddress: '0x00000961Ef480Eb55e80D19ad83579A64c007002',
        excessInhibitor: ('0x' + BigInt(2 ** 256 - 1).toString(16)) as Hex,
        compoundingFeeAddition: 3n,
        excessWithdrawalRequestsStorageSlot: 0n,
        consolidationRequestFeeAddition: 17n,
        minConsolidationRequestFee: 1n
      }
    case 'hoodi':
      return {
        depositContractAddress: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
        withdrawalContractAddress: '0x00000961Ef480Eb55e80D19ad83579A64c007002',
        excessInhibitor: ('0x' + BigInt(2 ** 256 - 1).toString(16)) as Hex,
        compoundingFeeAddition: 3n,
        excessWithdrawalRequestsStorageSlot: 0n,
        consolidationRequestFeeAddition: 17n,
        minConsolidationRequestFee: 1n
      }
    default:
      throw new Error(`Invalid network passed: ${network}`)
  }
}
