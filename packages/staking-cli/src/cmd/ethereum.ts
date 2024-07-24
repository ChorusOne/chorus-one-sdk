import { Command } from '@commander-js/extra-typings'
import type { Signer } from '@chorus-one/signer'
import type { Config } from '../types'
import type { SignerType } from '../enums'
import { newSigner } from '../signer'
import { log, prompt, readConfig, getNetworkConfig, defaultLogger } from '../util'
import { EthereumNetworkConfig, EthereumStaker } from '@chorus-one/ethereum'
import * as path from 'path'

export function makeEthereumCommand (): Command {
  const ethereum = new Command('ethereum')

  ethereum.addCommand(makeTxCommand())

  return ethereum
}

function makeTxCommand (): Command {
  const tx = new Command('tx')
    .description('generate a signed transaction')
    .option('-b, --broadcast', 'broadcast generated transaction', false)
    .option('-j, --journal <value>', "write TX'es to the local journal log", 'true')

  tx.command('delegate')
    .description('generate a delegate funds to validator transaction')
    .argument('<amount>', 'amount of tokens to stake expressed in ETH denom e.g. 0.1')
    .action(getDelegateTx)

  tx.command('unbond')
    .description('generate unstake funds from validator transaction')
    .argument('<amount>', 'amount of tokens to unstake expressed in ETH denom e.g. 0.1')
    .action(getUnbondTx)

  tx.command('withdraw').description('withdraw unstaked funds from the validator contract').action(getWithdrawTx)
  tx.command('mint')
    .description('mint tokens from the validator contract')
    .argument('<amount>', 'amount of tokens to mint expressed in osETH denom e.g. 0.1')
    .action(getMintTx)

  tx.command('burn')
    .description('burn tokens and return shares to the validator contract')
    .argument('<amount>', 'amount of tokens to burn expressed in osETH denom e.g. 0.1')
    .action(getBurnTx)

  return tx
}

async function init (cmd: Command<string[]>): Promise<[Config, Signer]> {
  const path: string = cmd.parent?.parent?.parent?.getOptionValue('config') as string
  const signerType: string = cmd.parent?.parent?.parent?.getOptionValue('signer') as string

  const config: Config = await readConfig(path).catch((e) => {
    cmd.error(e, { exitCode: 1, code: 'delegate.config.fs' })
  })

  const signer = await newSigner(config, signerType as SignerType, {
    addressDerivationFn: EthereumStaker.getAddressDerivationFn(),
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
  const broadcastEnabled = cmd.parent?.getOptionValue('broadcast') as boolean
  const journalEnabled: boolean = JSON.parse(cmd.parent?.getOptionValue('journal') as string)

  const [config, signer] = await init(cmd)

  const nearNetworkConfig = getNetworkConfig<EthereumNetworkConfig>(config)
  const ethereumStaker: EthereumStaker = new EthereumStaker(nearNetworkConfig)
  const logger = defaultLogger
  await ethereumStaker.init()

  let unsignedTx: any | undefined

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
        const resp = await ethereumStaker.buildStakeTx({
          delegatorAddress: config.delegatorAddress as `0x${string}`,
          validatorAddress: config.validatorAddress as `0x${string}`,
          amount: arg[0]
        })
        unsignedTx = resp.tx
        break
      }
      case 'undelegate': {
        const resp = await ethereumStaker.buildUnstakeTx({
          delegatorAddress: config.delegatorAddress as `0x${string}`,
          validatorAddress: config.validatorAddress as `0x${string}`,
          amount: arg[0]
        })
        unsignedTx = resp.tx
        break
      }
      case 'withdraw': {
        const resp = await ethereumStaker.buildWithdrawTx({
          delegatorAddress: config.delegatorAddress as `0x${string}`,
          validatorAddress: config.validatorAddress as `0x${string}`
        })
        unsignedTx = resp.tx
        break
      }
      case 'mint': {
        const resp = await ethereumStaker.buildMintTx({
          delegatorAddress: config.delegatorAddress as `0x${string}`,
          validatorAddress: config.validatorAddress as `0x${string}`,
          amount: arg[0]
        })
        unsignedTx = resp.tx
        break
      }
      case 'burn': {
        const resp = await ethereumStaker.buildBurnTx({
          delegatorAddress: config.delegatorAddress as `0x${string}`,
          validatorAddress: config.validatorAddress as `0x${string}`,
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

  logger.info(1, 3, 'prepare unsigned transaction, tx preview')
  log('unsignedTxActions', unsignedTx, journalEnabled)

  const shouldSign = await prompt('Do you want to sign the TX?')
  if (!shouldSign) {
    throw new Error('transaction signing aborted by user')
  }
  const { signedTx } = await ethereumStaker.sign({
    signer,
    signerAddress: config.delegatorAddress as `0x${string}`,
    tx: unsignedTx
  })

  console.log('* transaction signature received: ')
  log('signedTx', signedTx, journalEnabled)

  if (broadcastEnabled) {
    const shouldBroadcast = await prompt('Do you want to broadcast TX?')
    if (!shouldBroadcast) {
      cmd.error('transaction signing aborted by user', {
        exitCode: 1,
        code: 'delegate.abort'
      })
    }

    logger.info(3, 3, 'broadcasting the signed transaction')
    const result = await ethereumStaker.broadcast({ signedTx })
    log('broadcastTx', result, journalEnabled)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const blockExplorerUrl = ethereumStaker.connector.eth.chain?.blockExplorers?.default.url
    if (!blockExplorerUrl) {
      throw new Error('Block explorer URL not found')
    }
    console.log('\nCheck TX status here: ' + path.join(blockExplorerUrl, 'tx', result.txHash))
  }
}

async function getDelegateTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('delegate', options, cmd, [amount])
}

async function getUnbondTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('undelegate', options, cmd, [amount])
}

async function getWithdrawTx (options: any, cmd: Command<[]>): Promise<void> {
  await runTx('withdraw', options, cmd, [])
}

async function getMintTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('mint', options, cmd, [amount])
}

async function getBurnTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('burn', options, cmd, [amount])
}
