import { SafeJSONStringify } from '@chorus-one/utils'
import type { Signer } from '@chorus-one/signer'
import type { TonSigningData } from './types'
import {
  TonClient,
  external,
  Address,
  StateInit,
  beginCell,
  MessageRelaxed,
  storeMessage,
  storeMessageRelaxed,
  Cell
} from '@ton/ton'

// This is a 1:1 copy of the function from the TON SDK:
// https://github.com/ton-core/ton/blob/55c576dfc5976e1881180ee271ba8ec62d3f13d4/src/wallets/signing/createWalletTransfer.ts#L111C1-L151C2
//
// The `createWalletTransferV4` requires private key for signing, but we use the `Signer` interface from the `@chorus-one/signer` package
export function createWalletTransferV4 (args: {
  seqno: number
  sendMode: number
  walletId: number
  messages: MessageRelaxed[]
  timeout?: number
}): Cell {
  // Check number of messages
  if (args.messages.length > 4) {
    throw Error('Maximum number of messages in a single transfer is 4')
  }

  const signingMessage = beginCell().storeUint(args.walletId, 32)
  if (args.seqno === 0) {
    for (let i = 0; i < 32; i++) {
      signingMessage.storeBit(1)
    }
  } else {
    signingMessage.storeUint(args.timeout || Math.floor(Date.now() / 1e3) + 60, 32) // Default timeout: 60 seconds
  }

  signingMessage.storeUint(args.seqno, 32)
  signingMessage.storeUint(0, 8) // Simple order
  for (const m of args.messages) {
    signingMessage.storeUint(args.sendMode, 8)
    signingMessage.storeRef(beginCell().store(storeMessageRelaxed(m)))
  }

  return signingMessage.endCell()
}

export async function sign (signerAddress: string, signer: Signer, signingData: TonSigningData): Promise<Cell> {
  const signingMessage = signingData.txCell

  const { sig } = await signer.sign(
    signerAddress,
    { message: signingMessage.hash().toString('hex'), data: signingData },
    { note: SafeJSONStringify(signingData.tx, 2) }
  )
  const sigbuf = Buffer.from(sig.fullSig, 'hex')

  // The signer can also return a signed transaction (e.g ledger signer).
  // In such case the cell size will at 128 bytes + remaining transaction data
  if (sigbuf.length > 128) {
    const cells = Cell.fromBoc(sigbuf)
    if (cells.length !== 1) {
      throw new Error('signer returned ' + cells.length + 'cells instead of 1')
    }
    return cells[0]
  }

  const body = beginCell().storeBuffer(sigbuf).storeBuilder(signingMessage.asBuilder()).endCell()

  return body
}

// TonClient send wraps a signed message into an external cell message. However
// it hides it. We need the external message to calculate the hash of the message, which we use later as transaction hash
// for tracking
//
// reference: https://github.com/ton-core/ton/blob/55c576dfc5976e1881180ee271ba8ec62d3f13d4/src/client/TonClient.ts#L395
export async function externalMessage (
  client: TonClient,
  address: Address,
  message: Cell,
  init?: StateInit
): Promise<Cell> {
  let neededInit: StateInit | null = null

  if (init && !(await client.isContractDeployed(address))) {
    neededInit = init
  }

  const ext = external({
    to: address,
    init: neededInit ? { code: neededInit.code, data: neededInit.data } : null,
    body: message
  })

  return beginCell().store(storeMessage(ext)).endCell()
}
