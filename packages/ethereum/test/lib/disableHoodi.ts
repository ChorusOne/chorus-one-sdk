import { getConfig } from './getConfig'

/**
 * Allow to conditionally disable tests for Hoodi
 * Useful when dealing with migrating testnets that are difficult to set up fixtures
 * (e.g., transitions like Goerli -> Holesky -> Hoodi)
 */
export function disableHoodi () {
  const config = getConfig()

  if (config.network === 'hoodi') {
    return this.skip()
  }
  return this
}
