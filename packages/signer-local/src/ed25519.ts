import type { Signature } from '@chorus-one/signer'
import { derivePath, getPublicKey } from 'ed25519-hd-key'
import { ed25519 } from '@noble/curves/ed25519'

export function deriveKey (seed: Uint8Array, hdPath: string): { publicKey: Uint8Array; privateKey: Uint8Array } {
  const { key } = derivePath(hdPath, Buffer.from(seed).toString('hex'))
  const publicKey = getPublicKey(key, false)

  return {
    publicKey: Uint8Array.from(publicKey),
    privateKey: Uint8Array.from(key)
  }
}

export async function sign (content: string, privKey: Uint8Array): Promise<Signature> {
  const signature = ed25519.sign(Buffer.from(content, 'hex'), privKey)

  return {
    fullSig: Buffer.from(signature).toString('hex')
  }
}
