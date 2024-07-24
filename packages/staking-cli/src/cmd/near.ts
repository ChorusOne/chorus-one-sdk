import { Command } from '@commander-js/extra-typings'
import type { Signer } from '@chorus-one/signer'
import type { Config } from '../types'
import type { NearNetworkConfig } from '@chorus-one/near'
import type { SignerType } from '../enums'
import { newSigner } from '../signer'
import { log, prompt, readConfig, getNetworkConfig, defaultLogger } from '../util'
import { NearStaker } from '@chorus-one/near'
import { transactions } from 'near-api-js'
import * as path from 'path'

export interface CLINetworkConfig extends NearNetworkConfig {
  // e.g https://testnet.nearblocks.io/txns
  blockExplorerUrl?: string
}

export function makeNearCommand (): Command {
  const near = new Command('near')

  near.addCommand(makeTxCommand())

  return near
}

function makeTxCommand (): Command {
  const tx = new Command('tx')
    .description('generate a signed transaction')
    .option('-b, --broadcast', 'broadcast generated transaction', false)
    .option('-j, --journal <value>', "write TX'es to the local journal log", 'true')

  tx.command('delegate')
    .description('generate a delegate funds to validator transaction')
    .argument('<amount>', 'amount of tokens to stake expressed in NEAR denom e.g 0.1')
    .action(getDelegateTx)

  tx.command('unbond')
    .description('generate unstake funds from validator transaction')
    .argument('<amount>', 'amount of tokens to stake expressed in denom e.g 0.1. Zero (0) to unstake all funds.')
    .action(getUnbondTx)

  tx.command('withdraw')
    .description('withdraw unstaked funds from the validator contract')
    .argument('<amount>', 'amount of tokens to stake expressed in NEAR denom e.g 0.1. Zero (0) to withdraw all funds.')
    .action(getWithdrawTx)

  return tx
}

async function init (cmd: Command<[string]> | Command<[string, string]>): Promise<[Config, Signer]> {
  const path: string = cmd.parent?.parent?.parent?.getOptionValue('config') as string
  const signerType: string = cmd.parent?.parent?.parent?.getOptionValue('signer') as string

  const config: Config = await readConfig(path).catch((e) => {
    cmd.error(e, { exitCode: 1, code: 'delegate.config.fs' })
  })

  const signer = await newSigner(config, signerType as SignerType, {
    addressDerivationFn: NearStaker.getAddressDerivationFn(),
    logger: defaultLogger
  })
  await signer.init()

  return [config, signer]
}

async function runTx (
  msgType: string,
  _options: any,
  cmd: Command<[string]> | Command<[string, string]>,
  arg: string[]
): Promise<void> {
  const broadcastEnabled = cmd.parent?.getOptionValue('broadcast') as boolean
  const journalEnabled: boolean = JSON.parse(cmd.parent?.getOptionValue('journal') as string)

  const [config, signer] = await init(cmd)

  const nearNetworkConfig = getNetworkConfig<CLINetworkConfig>(config)
  const nearStaker: NearStaker = new NearStaker({ ...nearNetworkConfig })
  const logger = defaultLogger
  await nearStaker.init()

  let unsignedTx: transactions.Transaction | undefined

  logger.info(1, 3, 'prepare unsigned transaction')
  console.log(
    JSON.stringify(
      {
        delegator: config.delegatorAddress,
        contractId: config.validatorAddress,
        messageType: msgType,
        args: arg,
        broadcast: broadcastEnabled
      },
      null,
      2
    )
  )

  try {
    switch (msgType) {
      case 'delegate': {
        const resp = await nearStaker.buildStakeTx({
          delegatorAddress: config.delegatorAddress,
          validatorAddress: config.validatorAddress,
          amount: arg[0]
        })
        unsignedTx = resp.tx
        break
      }
      case 'undelegate': {
        const resp = await nearStaker.buildUnstakeTx({
          delegatorAddress: config.delegatorAddress,
          validatorAddress: config.validatorAddress,
          amount: arg[0]
        })
        unsignedTx = resp.tx
        break
      }
      case 'withdraw': {
        const resp = await nearStaker.buildWithdrawTx({
          delegatorAddress: config.delegatorAddress,
          validatorAddress: config.validatorAddress,
          amount: arg[0]
        })
        unsignedTx = resp.tx
        break
      }
    }
  } catch (e: any) {
    cmd.error(e, { exitCode: 1, code: msgType + '.tx.sign' })
  }

  if (unsignedTx === undefined) {
    throw new Error('unsignedTx is empty')
  }

  logger.info(1, 3, 'prepare unsigned transaction, actions preview')
  log('unsignedTxActions', unsignedTx.actions, journalEnabled)

  const shouldSign = await prompt('Do you want to sign the TX?')
  if (!shouldSign) {
    throw new Error('transaction signing aborted by user')
  }
  const { signedTx } = await nearStaker.sign({
    signer,
    signerAddress: config.delegatorAddress,
    tx: unsignedTx
  })

  console.log('* transaction signature received: ')
  log(
    'signedTx',
    {
      actions: signedTx.transaction.actions.map((action) => action.functionCall?.methodName),
      receiverId: signedTx.transaction.receiverId,
      signerId: signedTx.transaction.signerId,
      blockHash: Buffer.from(signedTx.transaction.blockHash).toString('hex'),
      signature: Buffer.from(signedTx.signature.data).toString('hex')
    },
    journalEnabled
  )

  if (broadcastEnabled) {
    const shouldBroadcast = await prompt('Do you want to broadcast TX?')
    if (!shouldBroadcast) {
      cmd.error('transaction signing aborted by user', {
        exitCode: 1,
        code: 'delegate.abort'
      })
    }

    logger.info(3, 3, 'broadcasting the signed transaction')
    const result = await nearStaker.broadcast({ signedTx })
    log(
      'broadcastTx',
      {
        final_execution_outcome: result.transaction_outcome,
        status: result.status,
        hash: result.transaction.hash
      },
      journalEnabled
    )

    const networkConfig = getNetworkConfig<CLINetworkConfig>(config)
    if (networkConfig.blockExplorerUrl !== undefined) {
      console.log('\nCheck TX status here: ' + path.join(networkConfig.blockExplorerUrl, result.transaction.hash))
    }
  }
}

async function getDelegateTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('delegate', options, cmd, [amount])
}

async function getUnbondTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('undelegate', options, cmd, [amount])
}

async function getWithdrawTx (validatorAddress: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('withdraw', options, cmd, [validatorAddress])
}
