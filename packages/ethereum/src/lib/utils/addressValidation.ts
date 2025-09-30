import { ADDRESS_REGEX, COMPOUNDING_ADDRESS_REGEX } from '../types/ethereumConfigNetwork'

/**
 * Validates if an address is a standard Ethereum address (0x01 withdrawal credentials)
 */
export function isStandardAddress (address: string): boolean {
  return ADDRESS_REGEX.test(address)
}

/**
 * Validates if an address uses compounding withdrawal credentials (0x02)
 */
export function isCompoundingAddress (address: string): boolean {
  return COMPOUNDING_ADDRESS_REGEX.test(address)
}
