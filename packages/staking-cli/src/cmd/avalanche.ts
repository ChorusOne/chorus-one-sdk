import { Command } from '@commander-js/extra-typings'
import type { Signer } from '@chorus-one/signer'
import type { Config } from '../types'
import type { AvalancheNetworkConfig } from '@chorus-one/avalanche'
import type { SignerType } from '../enums'
import { prompt, readConfig, getNetworkConfig, log, defaultLogger } from '../util'
import { newSigner } from '../signer'
import { AvalancheStaker, publicKeyToAddress } from '@chorus-one/avalanche'
import type { UnsignedTx } from '@avalabs/avalanchejs'

export interface CLINetworkConfig extends AvalancheNetworkConfig {
  // block explorer URL to display Transaction ID via Web UI. Example:
  // e.g https://avascan.info/blockchain
  blockExplorerUrl?: string
}

export function makeAvalancheCommand (): Command {
  const avalanche = new Command('avalanche')

  avalanche.addCommand(makeTxCommand())
  avalanche.addCommand(makeKeysCommand())

  return avalanche
}

function makeKeysCommand (): Command {
  const keys = new Command('keys').description('signing key operations')

  keys.command('get').description('retrieve key information').action(getKeyInfo)

  return keys
}

function makeTxCommand (): Command {
  const tx = new Command('tx')
    .description('generate a signed transaction')
    .option('-b, --broadcast', 'broadcast generated transaction', false)
    .option('-j, --journal <value>', "write TX'es to the local journal log", 'true')

  tx.command('delegate')
    .description('generate a delegate funds to validator transaction')
    .argument('<amount>', 'amount of tokens to stake expressed in DOT/KSM/etc denom e.g 0.1')
    .argument('<days>', 'number of days to delegate funds for')
    .action(getDelegateTx)

  tx.command('export')
    .description('export funds crosschain e.g C-Chain <-> P-Chain')
    .argument('<source_chain>', 'chain to transfer from e.g C or P')
    .argument('<destination_chain>', 'chain to transfer to e.g C or P')
    .argument('<amount>', 'amount of tokens to transfer Avax denom e.g 0.1')
    .action(getExportTx)

  tx.command('import')
    .description('import funds crosschain e.g C-Chain <-> P-Chain')
    .argument('<source_chain>', 'chain where the tokens have been exported / sent from e.g C or P')
    .argument('<destination_chain>', 'chain where the tokens are to be imported to e.g C or P')
    .action(getImportTx)

  return tx
}

async function init (
  cmd: Command<[string]> | Command<[string, string]> | Command<[string, string, string]> | Command<[]>
): Promise<[Config, Signer]> {
  const path: string = cmd.parent?.parent?.parent?.getOptionValue('config') as string
  const signerType: string = cmd.parent?.parent?.parent?.getOptionValue('signer') as string

  const config: Config = await readConfig(path).catch((e) => {
    cmd.error(e, { exitCode: 1, code: 'delegate.config.fs' })
  })

  const networkConfig = getNetworkConfig<CLINetworkConfig>(config)
  const signer = await newSigner(config, signerType as SignerType, {
    addressDerivationFn: AvalancheStaker.getAddressDerivationFn(networkConfig),
    logger: defaultLogger
  })
  await signer.init()

  return [config, signer]
}

async function runTx (
  msgType: string,
  _options: any,
  cmd: Command<[string]> | Command<[string, string]> | Command<[string, string, string]> | Command<[]>,
  arg: string[]
): Promise<void> {
  const broadcastEnabled = cmd.parent?.getOptionValue('broadcast') as boolean
  const journalEnabled: boolean = JSON.parse(cmd.parent?.getOptionValue('journal') as string)

  const [config, signer] = await init(cmd)

  const networkConfig = getNetworkConfig<CLINetworkConfig>(config)
  const avalancheStaker: AvalancheStaker = new AvalancheStaker({ ...networkConfig })
  await avalancheStaker.init()

  const pk = await signer.getPublicKey(config.delegatorAddress)
  const addresses = publicKeyToAddress(pk, hrp(networkConfig))
  const logger = defaultLogger

  logger.info(0, 3, 'inspect input data')
  console.log(
    JSON.stringify(
      {
        delegator: config.delegatorAddress,
        validatorAddress: config.validatorAddress,
        messageType: msgType,
        args: arg,
        broadcast: broadcastEnabled
      },
      null,
      2
    )
  )

  let broadcastChain: string = ''
  let unsignedTx: UnsignedTx | undefined

  try {
    switch (msgType) {
      case 'delegate': {
        broadcastChain = 'P'
        unsignedTx = (
          await avalancheStaker.buildStakeTx({
            delegatorAddress: addresses['pAddr'],
            validatorAddress: config.validatorAddress,
            amount: arg[0], // amount
            daysCount: Number(arg[1]) // days
          })
        ).tx
        break
      }
      case 'export': {
        broadcastChain = arg[0]
        unsignedTx = (
          await avalancheStaker.buildExportTx({
            address: addresses,
            srcChain: arg[0], // source chain
            dstChain: arg[1], // destination chain
            amount: arg[2] // amount
          })
        ).tx
        break
      }
      case 'import': {
        broadcastChain = arg[1]
        unsignedTx = (
          await avalancheStaker.buildImportTx({
            address: addresses, // source address
            srcChain: arg[0], // source chain
            dstChain: arg[1] // destination chain
          })
        ).tx
        break
      }
    }
  } catch (e: any) {
    cmd.error(e, { exitCode: 1, code: msgType + '.tx.sign' })
  }

  if (unsignedTx === undefined) {
    cmd.error('no signed transaction found', {
      exitCode: 1,
      code: `${msgType}.tx.sign`
    })
  }

  logger.info(1, 3, 'prepare unsigned transaction')
  log('unsignedTx', JSON.stringify(unsignedTx.toJSON(), null, 2), journalEnabled)

  const shouldSign = await prompt('Do you want to sign the TX?')
  if (!shouldSign) {
    throw new Error('transaction signing aborted by user')
  }
  const { signedTx } = await avalancheStaker.sign({
    signer,
    signerAddress: config.delegatorAddress,
    tx: unsignedTx
  })

  logger.info('* transaction signature received: ')
  log(
    'signature',
    signedTx.getAllSignatures().map((x) => x.toString()),
    journalEnabled
  )

  if (broadcastEnabled) {
    const shouldBroadcast = await prompt('Do you want to broadcast TX?')
    if (!shouldBroadcast) {
      cmd.error('transaction signing aborted by user', {
        exitCode: 1,
        code: `${msgType}.abort`
      })
    }

    logger.info(3, 3, 'broadcasting the signed transaction')
    const result = await avalancheStaker.broadcast({
      signedTx: signedTx,
      dstChain: broadcastChain
    })

    const networkConfig = getNetworkConfig<CLINetworkConfig>(config)
    if (networkConfig.blockExplorerUrl !== undefined) {
      console.log(
        '\nCheck TX status here: ' +
          networkConfig.blockExplorerUrl +
          '/' +
          broadcastChain.toLowerCase() +
          '/tx/' +
          result.txID
      )
    }
  }
}

async function getDelegateTx (
  amount: string,
  days: string,
  options: any,
  cmd: Command<[string, string]>
): Promise<void> {
  await runTx('delegate', options, cmd, [amount, days])
}

async function getImportTx (
  sourceChain: string,
  destinationChain: string,
  options: any,
  cmd: Command<[string, string]>
): Promise<void> {
  await runTx('import', options, cmd, [sourceChain, destinationChain])
}

async function getExportTx (
  sourceChain: string,
  destinationChain: string,
  amount: string,
  options: any,
  cmd: Command<[string, string, string]>
): Promise<void> {
  await runTx('export', options, cmd, [sourceChain, destinationChain, amount])
}

async function getKeyInfo (_options: any, cmd: Command<[]>): Promise<void> {
  const [config, signer] = await init(cmd)
  const networkConfig = getNetworkConfig<CLINetworkConfig>(config)

  const pk = await signer.getPublicKey(config.delegatorAddress)
  const addrs = publicKeyToAddress(pk, hrp(networkConfig))
  const logger = defaultLogger

  logger.info(JSON.stringify(addrs, null, 2))
}

function hrp (networkConfig: CLINetworkConfig): string {
  return networkConfig.hrp ?? 'avax'
}
