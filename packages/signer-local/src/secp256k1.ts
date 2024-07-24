import type { Signature } from '@chorus-one/signer'
import { HDKey as HDKeySecp256k1 } from '@scure/bip32'
import { secp256k1 } from '@noble/curves/secp256k1'
// We would love to use the @noble-secp256k1 package but it supports only esm:
//   https://github.com/paulmillr/noble-secp256k1/issues/115#issuecomment-1748018784

export function deriveKey (seed: Uint8Array, hdPath: string): { publicKey: Uint8Array; privateKey: Uint8Array } {
  const key = HDKeySecp256k1.fromMasterSeed(seed).derive(hdPath)

  if (key === null || key.publicKey == null || key.privateKey == null) {
    throw new Error('failed to derive keypair from seed')
  }

  return { publicKey: key.publicKey, privateKey: key.privateKey }
}

export async function sign (content: string, privKey: Uint8Array): Promise<Signature> {
  const signature = secp256k1.sign(Buffer.from(content, 'hex'), privKey)

  const rawSig = signature.toCompactRawBytes()
  const sig = {
    fullSig: signature.toCompactHex(),
    r: Buffer.from(rawSig.subarray(0, 32)).toString('hex'),
    s: Buffer.from(rawSig.subarray(32, 64)).toString('hex'),
    v: signature.recovery
  }

  return sig
}
