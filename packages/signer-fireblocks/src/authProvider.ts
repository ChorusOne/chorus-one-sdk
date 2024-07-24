import { IAuthProvider } from 'fireblocks-sdk/dist/src/iauth-provider'
import { v4 as uuid } from 'uuid'
import { KJUR, KEYUTIL, RSAKey } from 'jsrsasign'

export class ApiTokenProvider implements IAuthProvider {
  constructor (
    private privateKey: string,
    private apiKey: string
  ) {}

  signJwt (path: string, bodyJson?: any): string {
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    }

    const payload = {
      uri: path,
      nonce: uuid(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 55,
      sub: this.apiKey,
      bodyHash: KJUR.crypto.Util.sha256(JSON.stringify(bodyJson || ''))
    }

    const sHeader = JSON.stringify(header)
    const sPayload = JSON.stringify(payload)

    const privateKeyObject = KEYUTIL.getKey(this.privateKey) as RSAKey
    const token = KJUR.jws.JWS.sign('RS256', sHeader, sPayload, privateKeyObject)

    return token
  }

  getApiKey (): string {
    return this.apiKey
  }
}

export function getAuthProvider (privateKey: string, apiKey: string): IAuthProvider {
  return new ApiTokenProvider(privateKey, apiKey)
}
