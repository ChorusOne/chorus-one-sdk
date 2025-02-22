import { promises as fsPromises } from 'fs'
import type { Config } from './types'
import type { Signer, AddressDerivationFn, MnemonicToSeedFn, SeedToKeypairFn } from '@chorus-one/signer'
import { KeyType } from '@chorus-one/signer'
import { SignerType } from './enums'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'
import { LocalSigner } from '@chorus-one/signer-local'
import { Logger } from '@chorus-one/utils'
import { LedgerTonSigner } from '@chorus-one/signer-ledger-ton'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'

export async function newSigner (
  config: Config,
  signerType: SignerType,
  options: {
    keyType?: KeyType
    logger?: Logger
    addressDerivationFn?: AddressDerivationFn
    mnemonicToSeedFn?: MnemonicToSeedFn
    seedToKeypairFn?: SeedToKeypairFn
  }
): Promise<Signer> {
  switch (signerType) {
    case SignerType.FIREBLOCKS: {
      if (options.addressDerivationFn === undefined) {
        throw new Error('address derivation function required for fireblocks signer')
      }
      const apiSecretKey = (await fsPromises.readFile(config.fireblocks.apiSecretKeyPath, 'utf-8')).trim()
      const apiKey = (await fsPromises.readFile(config.fireblocks.apiKeyPath, 'utf-8')).trim()

      return new FireblocksSigner({
        apiSecretKey,
        apiKey,
        addressDerivationFn: options.addressDerivationFn,
        logger: options.logger,
        ...config.fireblocks
      })
    }
    case SignerType.LOCAL: {
      if (options.addressDerivationFn === undefined) {
        throw new Error('address derivation function required for local signer')
      }
      const mnemonic = (await fsPromises.readFile(config.localsigner.mnemonicPath, 'utf-8')).trim()

      return new LocalSigner({
        mnemonic,
        addressDerivationFn: options.addressDerivationFn,
        mnemonicToSeedFn: options.mnemonicToSeedFn,
        seedToKeypairFn: options.seedToKeypairFn,
        logger: options.logger,
        keyType: options.keyType ?? KeyType.SECP256K1,
        ...config.localsigner
      })
    }
    case SignerType.LEDGER: {
      if (config.networkType !== 'ton') {
        throw new Error('Ledger signer is only supported for TON network')
      }

      const transport = await TransportNodeHid.create()

      return new LedgerTonSigner({
        transport: transport,
        logger: options.logger,
        ...config.ledger
      })
    }
  }
}
