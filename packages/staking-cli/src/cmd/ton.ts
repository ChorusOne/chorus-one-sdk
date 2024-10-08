import { Command } from '@commander-js/extra-typings'
import type { Signer } from '@chorus-one/signer'
import { KeyType } from '@chorus-one/signer'
import type { Config } from '../types'
import type { TonNetworkConfig, UnsignedTx } from '@chorus-one/ton'
import type { SignerType } from '../enums'
import { prompt, readConfig, getNetworkConfig, log, defaultLogger } from '../util'
import { SafeJSONStringify } from '@chorus-one/utils'
import { newSigner } from '../signer'
import { TonStaker } from '@chorus-one/ton'

export interface CLINetworkConfig extends TonNetworkConfig {
  // block explorer URL to display Transaction ID via Web UI. Example:
  // e.g https://testnet.tonviewer.com
  blockExplorerUrl?: string
}

export function makeTonCommand (): Command {
  const ton = new Command('ton')

  ton.addCommand(makeTxCommand())

  return ton
}

function makeTxCommand (): Command {
  const tx = new Command('tx')
    .description('generate a signed transaction')
    .option('-b, --broadcast', 'broadcast generated transaction', false)
    .option('-j, --journal <value>', "write TX'es to the local journal log", 'true')

  tx.command('delegate-nominator-pool')
    .description('generate a delegate funds to TON nominator pool contract transaction')
    .argument('<amount>', 'amount of tokens to stake expressed in TON denom e.g 0.1')
    .action(getDelegateNominatorPoolTx)

  tx.command('unstake-nominator-pool')
    .description('generate a unstake funds to TON nominator pool contract transaction')
    .action(getUnstakeNominatorPoolTx)

  tx.command('delegate-single-nominator-pool')
    .description('generate a delegate funds to TON single nominator pool contract transaction')
    .argument('<amount>', 'amount of tokens to stake expressed in TON denom e.g 0.1')
    .action(getDelegateSingleNominatorPoolTx)

  tx.command('unstake-single-nominator-pool')
    .description('generate a unstake funds to TON single nominator pool contract transaction')
    .argument('<amount>', 'amount of tokens to unstake expressed in TON denom e.g 0.1')
    .action(getUnstakeSingleNominatorPoolTx)

  tx.command('transfer')
    .description('generate a transfer funds transaction')
    .argument('<amount>', 'amount of tokens to transfer expressed in TON denom e.g 0.1')
    .action(getTransferTx)

  tx.command('deploy-wallet').description('deploy a wallet contract transaction').action(getDeployWalletTx)

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
    addressDerivationFn: TonStaker.getAddressDerivationFn({
      addressDerivationConfig: networkConfig.addressDerivationConfig
    }),
    mnemonicToSeedFn: TonStaker.getMnemonicToSeedFn(),
    seedToKeypairFn: TonStaker.getSeedToKeypairFn(),
    keyType: KeyType.ED25519,
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
  const tonStaker: TonStaker = new TonStaker({ ...networkConfig })
  await tonStaker.init()

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

  let unsignedTx: UnsignedTx | undefined

  try {
    switch (msgType) {
      case 'delegate-nominator-pool': {
        unsignedTx = (
          await tonStaker.buildStakeNominatorPoolTx({
            delegatorAddress: config.delegatorAddress,
            validatorAddress: config.validatorAddress,
            amount: arg[0] // amount
          })
        ).tx
        break
      }
      case 'unstake-nominator-pool': {
        unsignedTx = (
          await tonStaker.buildUnstakeNominatorPoolTx({
            delegatorAddress: config.delegatorAddress,
            validatorAddress: config.validatorAddress
          })
        ).tx
        break
      }
      case 'delegate-single-nominator-pool': {
        unsignedTx = (
          await tonStaker.buildStakeSingleNominatorPoolTx({
            delegatorAddress: config.delegatorAddress,
            validatorAddress: config.validatorAddress,
            amount: arg[0] // amount
          })
        ).tx
        break
      }
      case 'unstake-single-nominator-pool': {
        unsignedTx = (
          await tonStaker.buildUnstakeSingleNominatorPoolTx({
            delegatorAddress: config.delegatorAddress,
            validatorAddress: config.validatorAddress,
            amount: arg[0] // amount
          })
        ).tx
        break
      }
      case 'transfer': {
        unsignedTx = (
          await tonStaker.buildTransferTx({
            destinationAddress: config.validatorAddress,
            amount: arg[0] // amount
          })
        ).tx
        break
      }
      case 'deploy-wallet': {
        unsignedTx = (
          await tonStaker.buildDeployWalletTx({
            address: config.delegatorAddress
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
  log('unsignedTx', SafeJSONStringify(unsignedTx, 2), journalEnabled)

  const shouldSign = await prompt('Do you want to sign the TX?')
  if (!shouldSign) {
    throw new Error('transaction signing aborted by user')
  }
  const signedTx = await tonStaker.sign({
    signer,
    signerAddress: config.delegatorAddress,
    tx: unsignedTx
  })

  logger.info('* signed transaction received: ')
  log('signature', signedTx, journalEnabled)

  if (broadcastEnabled) {
    const shouldBroadcast = await prompt('Do you want to broadcast TX?')
    if (!shouldBroadcast) {
      cmd.error('transaction signing aborted by user', {
        exitCode: 1,
        code: `${msgType}.abort`
      })
    }

    logger.info(3, 3, 'broadcasting the signed transaction')
    const txHash = await tonStaker.broadcast({
      signedTx: signedTx
    })

    const networkConfig = getNetworkConfig<CLINetworkConfig>(config)
    if (networkConfig.blockExplorerUrl !== undefined) {
      console.log('\nCheck TX status here: ' + networkConfig.blockExplorerUrl + '/transaction/' + txHash)
    }
  }
}

async function getDelegateNominatorPoolTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('delegate-nominator-pool', options, cmd, [amount])
}

async function getUnstakeNominatorPoolTx (options: any, cmd: Command<[]>): Promise<void> {
  await runTx('unstake-nominator-pool', options, cmd, [])
}

async function getDelegateSingleNominatorPoolTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('delegate-single-nominator-pool', options, cmd, [amount])
}

async function getUnstakeSingleNominatorPoolTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('unstake-single-nominator-pool', options, cmd, [amount])
}

async function getTransferTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('transfer', options, cmd, [amount])
}

async function getDeployWalletTx (options: any, cmd: Command<[]>): Promise<void> {
  await runTx('deploy-wallet', options, cmd, [])
}
