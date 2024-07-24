/** @ignore */
export interface FireblocksSignerConfig {
  // the API RSA key
  apiSecretKey: string

  // the Fireblocks API KEY
  apiKey: string

  // fireblocks vault name e.g. 'celestia-wallet'
  vaultName: string

  // e.g. CELESTIA or CELESTIA_TEST
  assetId: string

  // The URL of the Fireblocks API
  apiUrl?: string

  // maximum time (in milliseconds) to wait for Fireblocks API sign request to complete
  //
  // Fireblocks Raw Sign API is asynchronous and requires polling. There is no
  // time guarantee for the sign request to complete. This timeout is used to
  // limit the time the signer waits for the sign request to complete
  timeout?: number

  // the intervall (in milliseconds) at which signer polls the Fireblocks API to check if the sign
  // request has completed
  pollInterval?: number
}
