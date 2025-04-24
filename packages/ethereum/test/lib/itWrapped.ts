/*
 * Allow to conditionally disable tests for specific networks
 * Useful when dealing with migrating testnets that are difficult to set up fixtures (e.g., transitions like Goerli -> Holesky -> Hoodi)
 */
export const itWrapped = ({ disableNetworks }: { disableNetworks: string[] }, name: string, fn: () => void) => {
  if (process.env.NETWORK && disableNetworks.includes(process.env.NETWORK)) {
    return it.skip(name, fn)
  }
  return it(name, fn)
}
