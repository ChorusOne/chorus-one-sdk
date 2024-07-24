import { Command } from '@commander-js/extra-typings'
import { TxRaw, AuthInfo } from 'cosmjs-types/cosmos/tx/v1beta1/tx'

import { newSigner } from '../signer'
import { getNetworkConfig, log, defaultLogger, prompt, readConfig } from '../util'
import { CosmosStaker } from '@chorus-one/cosmos'
import { CosmosConfigurator } from '@chorus-one/cosmos'

import type { Signer } from '@chorus-one/signer'
import type { Config } from '../types'
import type { CosmosNetworkConfig } from '@chorus-one/cosmos'
import type { SignerType } from '../enums'
import type { EncodeObject } from '@cosmjs/proto-signing'

export interface CLINetworkConfig extends CosmosNetworkConfig {
  // block explorer URL to display Transaction ID via Web UI. Example:
  //   https://mintscan.io/celestia/tx/
  //   https://celestia.explorers.guru/transaction/
  blockExplorerUrl?: string
}

export function makeCosmosCommand (): Command {
  const cosmos = new Command('cosmos')

  cosmos.addCommand(makeTxCommand())
  cosmos.addCommand(makeConfigCommand())

  return cosmos
}

function makeConfigCommand (): Command {
  const config = new Command('config')

  config
    .command('gen')
    .description('generate a configuration file using community based chain registry')
    .argument('<network>', 'network name to generate configuration for (e.g. celestia)')
    .action(getGenConfig)

  return config
}

function makeTxCommand (): Command {
  const tx = new Command('tx')
    .description('generate a signed transaction')
    .option('-b, --broadcast', 'broadcast generated transaction', false)
    .option('-m, --memo <memo>', 'a note attached to transaction', '')
    .option('-j, --journal <value>', "write TX'es to the local journal log", 'true')

  tx.command('delegate')
    .description('generate a delegate funds to validator transaction')
    .argument('<amount>', 'amount of tokens to stake expressed in macro denom e.g "1" for 1 ATOM')
    .action(getDelegateTx)

  tx.command('unbond')
    .description('generate unbond funds to validator transaction')
    .argument('<amount>', 'amount of tokens to unbond expressed in denom e.g "1" for 1 ATOM')
    .action(getUnbondTx)

  tx.command('redelegate')
    .description('redelegate funds to another validator')
    .argument('<amount>', 'amount of tokens to redelegate expressed in denom e.g "1" for 1 ATOM')
    .argument('<validator-dst-address>', 'validator address to redelegate funds to')
    .action(getRedelegateTx)

  tx.command('withdraw-rewards')
    .description('withdraw rewards earned with given validator')
    .argument('[validatorAddress]', 'address of the validator from where to claim rewards')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .action(getWithdrawRewardsTx)

  return tx
}

async function init (cmd: Command<[string]> | Command<[string, string]>): Promise<[Config, Signer]> {
  const path: string = cmd.parent?.parent?.parent?.getOptionValue('config') as string
  const signerType: string = cmd.parent?.parent?.parent?.getOptionValue('signer') as string

  const config: Config = await readConfig(path).catch((e) => {
    cmd.error(e, { exitCode: 1, code: 'delegate.config.fs' })
  })
  const networkConfig = getNetworkConfig<CLINetworkConfig>(config)

  const signer = await newSigner(config, signerType as SignerType, {
    addressDerivationFn: CosmosStaker.getAddressDerivationFn(networkConfig),
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
): Promise<Uint8Array> {
  const broadcastEnabled = cmd.parent?.getOptionValue('broadcast') as boolean
  const memo = cmd.parent?.getOptionValue('memo') as string
  const journalEnabled: boolean = JSON.parse(cmd.parent?.getOptionValue('journal') as string)

  const [config, signer] = await init(cmd)

  const networkConfig = getNetworkConfig<CLINetworkConfig>(config)
  const cosmosStaker: CosmosStaker = new CosmosStaker({ ...networkConfig })
  const logger = defaultLogger
  await cosmosStaker.init()

  let unsignedTx: EncodeObject | undefined

  try {
    switch (msgType) {
      case 'delegate':
        unsignedTx = (
          await cosmosStaker.buildStakeTx({
            delegatorAddress: config.delegatorAddress,
            validatorAddress: config.validatorAddress,
            amount: arg[0] // amount
          })
        ).tx
        break
      case 'undelegate':
        unsignedTx = (
          await cosmosStaker.buildUnstakeTx({
            delegatorAddress: config.delegatorAddress,
            validatorAddress: config.validatorAddress,
            amount: arg[0]
          })
        ).tx
        break
      case 'redelegate':
        unsignedTx = (
          await cosmosStaker.buildRedelegateTx({
            delegatorAddress: config.delegatorAddress,
            validatorSrcAddress: config.validatorAddress,
            validatorDstAddress: arg[1],
            amount: arg[0]
          })
        ).tx
        break
      case 'withdrawRewards':
        unsignedTx = (
          await cosmosStaker.buildWithdrawRewardsTx({
            delegatorAddress: config.delegatorAddress,
            validatorAddress: arg[0]
          })
        ).tx
        break
    }
  } catch (e: any) {
    cmd.error(e, { exitCode: 1, code: msgType + '.tx.sign' })
  }

  if (unsignedTx === undefined) {
    throw new Error('unsigned transaction is undefined')
  }

  logger.info(1, 3, 'prepare unsigned transaction')
  log('unsignedTx', unsignedTx, journalEnabled)

  const shouldSign = await prompt('Do you want to sign the TX?')
  if (!shouldSign) {
    throw new Error('transaction signing aborted by user')
  }
  const { signedTx } = await cosmosStaker.sign({
    signer,
    signerAddress: config.delegatorAddress,
    tx: unsignedTx,
    memo
  })

  const signedTxDecoded = TxRaw.decode(signedTx)
  const fee = AuthInfo.decode(signedTxDecoded.authInfoBytes).fee

  if (fee === undefined) {
    throw new Error('fee is undefined')
  }

  console.log('* transaction signature received with fee structure: ')
  log(
    'signedTxAndFee',
    {
      signedTx: TxRaw.toJSON(signedTxDecoded),
      fee: {
        amount: fee.amount.map((x) => `${x.amount}${x.denom}`),
        payer: fee.payer,
        gasLimit: fee.gasLimit
      }
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
    const result = await cosmosStaker.broadcast({ signedTx })
    log(
      'broadcastTx',
      {
        code: result.code,
        hash: result.transactionHash,
        gasUsed: result.gasUsed,
        gasWanted: result.gasWanted
      },
      journalEnabled
    )

    const networkConfig = getNetworkConfig<CLINetworkConfig>(config)
    if (networkConfig.blockExplorerUrl !== undefined) {
      console.log('\nCheck TX status here: ' + networkConfig.blockExplorerUrl + result.transactionHash)
    }

    if (result.code !== 0) {
      throw new Error('transaction failed, expected status: 0, got: ' + result.code)
    }
  }

  return signedTx
}

async function getDelegateTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('delegate', options, cmd, [amount])
}

async function getUnbondTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('undelegate', options, cmd, [amount])
}

async function getRedelegateTx (
  amount: string,
  validatorDstAddress: string,
  options: any,
  cmd: Command<[string, string]>
): Promise<void> {
  await runTx('redelegate', options, cmd, [amount, validatorDstAddress])
}

async function getWithdrawRewardsTx (validatorAddress: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('withdrawRewards', options, cmd, [validatorAddress])
}

async function getGenConfig (network: string, _options: any, _cmd: Command<[string]>): Promise<void> {
  const networkConfig = await CosmosConfigurator.genNetworkConfig(network)

  console.log(JSON.stringify(networkConfig, null, 2))
}
