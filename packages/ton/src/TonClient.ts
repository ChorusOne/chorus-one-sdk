import { TonClient as NativeTonClient, Cell } from '@ton/ton'
import axios from 'axios'
import { z } from 'zod'

const configParamCodec = z.object({
  ok: z.boolean(),
  result: z.object({
    '@type': z.string(),
    config: z.object({
      '@type': z.string(),
      bytes: z.string()
    }),
    '@extra': z.string()
  })
})

export class TonClient extends NativeTonClient {
  async getConfigParam (config_id: number): Promise<Cell> {
    const url = new URL(this.parameters.endpoint)
    const base = url.pathname.split('/').slice(0, -1).join('/')
    url.pathname = base + '/getConfigParam'
    url.searchParams.set('config_id', config_id.toString())

    const r = await axios.get(url.toString())
    if (r.status !== 200) {
      throw Error('Unable to fetch config param, error: ' + r.status + ' ' + r.statusText)
    }

    const configParam = configParamCodec.safeParse(r.data)
    if (!configParam.success) {
      throw Error('Unable to parse config param, error: ' + JSON.stringify(configParam.error))
    }

    const paramBytes = configParam.data?.result.config.bytes
    if (paramBytes === undefined) {
      throw Error('Failed to get config param bytes')
    }

    return Cell.fromBoc(Buffer.from(paramBytes, 'base64'))[0]
  }
}
