import { Command } from '@commander-js/extra-typings'
import type { Config } from '../types'
import type { SubstrateNetworkConfig } from '@chorus-one/substrate'
import type { Signer } from '@chorus-one/signer'
import type { SignerType } from '../enums'
import { checkNodeVersion, getNetworkConfig, log, defaultLogger, prompt, readConfig } from '../util'
import { newSigner } from '../signer'
import { SubstrateStaker } from '@chorus-one/substrate'
import type { SubmittableExtrinsic } from '@polkadot/api/submittable/types'
import type { ISubmittableResult } from '@polkadot/types/types'

export interface CLINetworkConfig extends SubstrateNetworkConfig {
  // block explorer URL to display Transaction ID via Web UI. Example:
  // * https://westend.subscan.io/account
  blockExplorerUrl?: string
}

export function makeSubstrateCommand (): Command {
  const substrate = new Command('substrate')

  substrate.addCommand(makeTxCommand())

  return substrate
}

function makeTxCommand (): Command {
  const tx = new Command('tx')
    .description('generate a signed transaction')
    .option('-b, --broadcast', 'broadcast generated transaction', false)
    .option('-j, --journal <value>', "write TX'es to the local journal log", 'true')

  tx.command('delegate')
    .description('generate a delegate funds to validator transaction')
    .argument('<amount>', 'amount of tokens to stake expressed in DOT/KSM/etc denom e.g 0.1')
    .action(getDelegateTx)

  tx.command('bond-extra')
    .description('delegate more tokens (use this if you delegated already) to validator')
    .argument('<amount>', 'amount of tokens to stake expressed in DOT/KSM/etc denom e.g 0.1')
    .action(getBondExtraTx)

  tx.command('nominate').description('generate a nominate funds to validator transaction').action(getNominateTx)

  tx.command('unbond')
    .description('generate unbond funds to validator transaction')
    .argument('<amount>', 'amount of tokens to stake expressed in denom e.g 0.1. Zero (0) to unstake all funds.')
    .action(getUnbondTx)

  tx.command('withdraw').description('withdraw all unstaked funds from the validator contract').action(getWithdrawTx)

  return tx
}

async function init (cmd: Command<[string]> | Command<[]>): Promise<[Config, Signer]> {
  const path: string = cmd.parent?.parent?.parent?.getOptionValue('config') as string
  const signerType: string = cmd.parent?.parent?.parent?.getOptionValue('signer') as string

  const config: Config = await readConfig(path).catch((e) => {
    cmd.error(e, { exitCode: 1, code: 'delegate.config.fs' })
  })

  const signer = await newSigner(config, signerType as SignerType, {
    addressDerivationFn: SubstrateStaker.getAddressDerivationFn(),
    logger: defaultLogger
  })
  await signer.init()

  return [config, signer]
}

async function runTx (
  msgType: string,
  _options: any,
  cmd: Command<[string]> | Command<[]>,
  arg: string[]
): Promise<void> {
  // https://github.com/polkadot-js/api/issues/5880
  checkNodeVersion('v22.', 'node version v22 is faulty for polkadot api js, please downgrade')

  const broadcastEnabled = cmd.parent?.getOptionValue('broadcast') as boolean
  const journalEnabled: boolean = JSON.parse(cmd.parent?.getOptionValue('journal') as string)

  const [config, signer] = await init(cmd)

  const networkConfig = getNetworkConfig<CLINetworkConfig>(config)
  const substrateStaker: SubstrateStaker = new SubstrateStaker({
    ...networkConfig
  })
  const logger = defaultLogger
  await substrateStaker.init()

  try {
    let unsignedTx: SubmittableExtrinsic<'promise', ISubmittableResult> | undefined

    try {
      switch (msgType) {
        case 'delegate':
          unsignedTx = (
            await substrateStaker.buildStakeTx({
              amount: arg[0] // amount
            })
          ).tx
          break
        case 'bondExtra':
          unsignedTx = (
            await substrateStaker.buildBondExtraTx({
              amount: arg[0] // amount
            })
          ).tx
          break
        case 'nominate':
          unsignedTx = (
            await substrateStaker.buildNominateTx({
              validatorAddresses: config.validatorAddress.split(',')
            })
          ).tx
          break
        case 'undelegate':
          unsignedTx = (
            await substrateStaker.buildUnstakeTx({
              amount: arg[0] // amount
            })
          ).tx
          break
        case 'withdraw':
          unsignedTx = (await substrateStaker.buildWithdrawTx()).tx
          break
      }
    } catch (e: any) {
      cmd.error(e, { exitCode: 1, code: msgType + '.tx.sign' })
    }

    if (unsignedTx === undefined) {
      throw new Error('unsigned transaction is undefined')
    }

    logger.info(1, 3, 'prepare unsigned transaction')
    log('unsignedTx', unsignedTx.toHuman(), journalEnabled)

    const shouldSign = await prompt('Do you want to sign the TX?')
    if (!shouldSign) {
      throw new Error('transaction signing aborted by user')
    }

    const signedTx = (
      await substrateStaker.sign({
        signer,
        signerAddress: config.delegatorAddress,
        tx: unsignedTx,
        blocks: 0
      })
    ).signedTx

    console.log('* transaction signature received: ')
    log('signedTx', signedTx.toHuman(), journalEnabled)

    if (broadcastEnabled) {
      const shouldBroadcast = await prompt('Do you want to broadcast TX?')
      if (!shouldBroadcast) {
        cmd.error('transaction signing aborted by user', {
          exitCode: 1,
          code: 'delegate.abort'
        })
      }

      logger.info(3, 3, 'broadcasting the signed transaction')
      const response = await substrateStaker.broadcast({ signedTx })
      log('broadcastTx', JSON.stringify({ status: response.status.toHuman() }, null, 2), journalEnabled)

      if (response.status.isInBlock) {
        console.log(`transaction included at blockHash ${response.status.asInBlock.toString()}`)
      }

      if (response.status.isFinalized) {
        console.log(`transaction finalized at blockHash ${response.status.asFinalized.toString()}`)
      }

      if (networkConfig.blockExplorerUrl !== undefined) {
        console.log('\nLink to block explorer: ' + networkConfig.blockExplorerUrl + '/' + response.txHash)
      }
    }
  } finally {
    // WsProvider hangs until it's closed
    await substrateStaker.close()
  }
}

async function getDelegateTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('delegate', options, cmd, [amount])
}

async function getBondExtraTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('bondExtra', options, cmd, [amount])
}

async function getNominateTx (options: any, cmd: Command<[]>): Promise<void> {
  await runTx('nominate', options, cmd, [])
}

async function getUnbondTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('undelegate', options, cmd, [amount])
}

async function getWithdrawTx (options: any, cmd: Command<[]>): Promise<void> {
  await runTx('withdraw', options, cmd, [])
}
