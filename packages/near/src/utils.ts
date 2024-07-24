import { Connection } from 'near-api-js'
import { NearAccessKey, NearAccessKeysResponse } from './types'

function isValidNearAccessKeysResponse (obj: any): obj is NearAccessKeysResponse {
  return (
    obj &&
    Array.isArray(obj.keys) &&
    obj.keys.every(
      (key: any) =>
        typeof key.public_key === 'string' &&
        key.access_key &&
        typeof key.access_key.nonce === 'number' &&
        (key.access_key.permission === 'FullAccess' ||
          (key.access_key.permission &&
            key.access_key.permission.FunctionCall &&
            typeof key.access_key.permission.FunctionCall.receiver_id === 'string'))
    )
  )
}

export async function fetchAccessKey (
  sourceAddress: string,
  destinationAddress: string,
  connection: Connection
): Promise<NearAccessKey> {
  const accessKeys = await connection.provider.query(`access_key/${sourceAddress}`, '')
  if (!isValidNearAccessKeysResponse(accessKeys)) {
    throw new Error('Invalid access keys response')
  }

  const allowedAccessKeysResponse = accessKeys.keys.filter(
    (key) =>
      key.access_key.permission === 'FullAccess' ||
      (Object.keys(key.access_key.permission).includes('FunctionCall') &&
        key.access_key.permission.FunctionCall.receiver_id === destinationAddress)
  )

  if (allowedAccessKeysResponse.length === 0) {
    throw new Error('No suitable access key found.')
  }

  const [accessKey] = allowedAccessKeysResponse
  return accessKey
}
