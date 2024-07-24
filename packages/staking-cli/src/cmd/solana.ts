import { Command } from '@commander-js/extra-typings'

import { newSigner } from '../signer'
import { getNetworkConfig, log, defaultLogger, prompt, ask, readConfig } from '../util'
import { SolanaStaker, SolanaTransaction } from '@chorus-one/solana'

import type { Signer } from '@chorus-one/signer'
import type { Config } from '../types'
import type { SolanaNetworkConfig } from '@chorus-one/solana'
import type { SignerType } from '../enums'

export interface CLINetworkConfig extends SolanaNetworkConfig {
  // block explorer URL to display Transaction ID via Web UI. Example:
  //   https://explorer.solana.com/tx/{tx}?cluster=testnet
  blockExplorerUrl?: string
}

export function makeSolanaCommand (): Command {
  const solana = new Command('solana')

  solana.addCommand(makeTxCommand())
  solana.addCommand(makeKeysCommand())

  return solana
}

function makeKeysCommand (): Command {
  const keys = new Command('keys').description('signing key operations')

  keys.command('get-staking-accounts').description('retrieve staking accounts').action(getStakingAccountsInfo)

  return keys
}

function makeTxCommand (): Command {
  const tx = new Command('tx')
    .description('generate a signed transaction')
    .option('-b, --broadcast', 'broadcast generated transaction', false)
    .option('-j, --journal <value>', "write TX'es to the local journal log", 'true')

  tx.command('delegate')
    .description('generate a delegate funds to validator transaction')
    .argument('<amount>', 'amount of tokens to stake expressed in macro denom e.g "1" for 1 SOL')
    .action(getDelegateTx)

  tx.command('delegate-with-stake-account')
    .description('generate a delegate funds to validator transaction using the provided stake account')
    .argument('<stake-account-address>', 'solana stake account address')
    .action(getDelegateWithStakeAccountTx)

  tx.command('create-stake-account')
    .description('generate a create stake account tx')
    .argument('<amount>', 'amount of tokens to stake expressed in macro denom e.g "1" for 1 SOL')
    .action(getCreateStakeAccountTx)

  tx.command('undelegate')
    .description('generate a deactivate stake ransaction')
    .argument('<amount>', 'amount of tokens to unbond expressed in denom e.g "1" for 1 SOL')
    .action(getUndelegateTx)

  tx.command('merge-stakes')
    .description('generate a transaction to merge two stake accounts')
    .argument('<source-address>', 'source stake account address to merge')
    .argument('<destination-address>', 'destination stake account address to merge to')
    .action(getMergeStakesTx)

  tx.command('split-stake')
    .description('generate a transaction to split stake account into two accounts')
    .argument('<source-address>', 'source stake account address to split')
    .argument('<amount>', 'amount of tokens to unbond expressed in denom e.g "1" for 1 SOL')
    .action(getSplitStakeTx)

  tx.command('withdraw-stake')
    .description('generate a transaction to withdraw funds from the stake account')
    .argument('<stake-account-address>', 'stake account address to withdraw from')
    .argument('<amount>', 'amount of tokens to withdraw expressed in denom e.g "1" for 1 SOL (0 for all)')
    .action(getWithdrawStakeTx)

  return tx
}

async function init (cmd: Command<[string]> | Command<[string, string]> | Command<[]>): Promise<[Config, Signer]> {
  const path: string = cmd.parent?.parent?.parent?.getOptionValue('config') as string
  const signerType: string = cmd.parent?.parent?.parent?.getOptionValue('signer') as string

  const config: Config = await readConfig(path).catch((e) => {
    cmd.error(e, { exitCode: 1, code: 'delegate.config.fs' })
  })

  const signer = await newSigner(config, signerType as SignerType, {
    addressDerivationFn: SolanaStaker.getAddressDerivationFn(),
    logger: defaultLogger
  })
  await signer.init()

  return [config, signer]
}

async function runTx (
  msgType: string,
  _options: any,
  cmd: Command<[string]> | Command<[string, string]> | Command<[string, string]> | Command<[]>,
  arg: string[]
): Promise<void> {
  const broadcastEnabled = cmd.parent?.getOptionValue('broadcast') as boolean
  const journalEnabled: boolean = JSON.parse(cmd.parent?.getOptionValue('journal') as string)

  const [config, signer] = await init(cmd)

  const networkConfig = getNetworkConfig<CLINetworkConfig>(config)
  const solanaStaker: SolanaStaker = new SolanaStaker({ ...networkConfig })
  const logger = defaultLogger
  await solanaStaker.init()

  let unsignedTx: SolanaTransaction | undefined
  let stakeAccountAddr: string = ''

  try {
    switch (msgType) {
      case 'create-stake-account': {
        const { tx, stakeAccountAddress } = await solanaStaker.buildCreateStakeAccountTx({
          ownerAddress: config.delegatorAddress,
          amount: arg[0]
        })

        unsignedTx = tx
        stakeAccountAddr = stakeAccountAddress
        break
      }

      case 'delegate': {
        const response = await solanaStaker.getStakeAccounts({
          ownerAddress: config.delegatorAddress,
          withStates: true,
          withMacroDenom: true
        })
        logger.info(0, 3, 'list of current stake accounts assigned to your address')
        console.table(response.accounts)

        const shouldCreateNewAccount = await prompt('Do you want to create a new stake account?')
        if (shouldCreateNewAccount) {
          const { tx, stakeAccountAddress } = await solanaStaker.buildStakeTx({
            ownerAddress: config.delegatorAddress,
            validatorAddress: config.validatorAddress,
            amount: arg[0] // amount
          })

          unsignedTx = tx
          stakeAccountAddr = stakeAccountAddress
        } else {
          const userProvidedAddr = await ask('Please provide the stake account address')
          if (userProvidedAddr.trim() === '') {
            throw new Error('no stake account address provided')
          }

          const { tx, stakeAccountAddress } = await solanaStaker.buildStakeTx({
            ownerAddress: config.delegatorAddress,
            validatorAddress: config.validatorAddress,
            stakeAccountAddress: userProvidedAddr,
            amount: arg[0] // amount
          })

          unsignedTx = tx
          stakeAccountAddr = stakeAccountAddress
        }
        break
      }

      case 'delegate-with-stake-account': {
        const { tx, stakeAccountAddress } = await solanaStaker.buildStakeTx({
          ownerAddress: config.delegatorAddress,
          validatorAddress: config.validatorAddress,
          stakeAccountAddress: arg[0]
        })

        unsignedTx = tx
        stakeAccountAddr = stakeAccountAddress
        break
      }

      case 'unstake': {
        unsignedTx = (
          await solanaStaker.buildUnstakeTx({
            ownerAddress: config.delegatorAddress,
            stakeAccountAddress: arg[0]
          })
        ).tx
        break
      }

      case 'withdraw-stake': {
        unsignedTx = (
          await solanaStaker.buildWithdrawStakeTx({
            ownerAddress: config.delegatorAddress,
            stakeAccountAddress: arg[0],
            amount: arg[1]
          })
        ).tx
        break
      }

      case 'merge-stakes': {
        unsignedTx = (
          await solanaStaker.buildMergeStakesTx({
            ownerAddress: config.delegatorAddress,
            sourceAddress: arg[0],
            destinationAddress: arg[1]
          })
        ).tx
        break
      }

      case 'split-stake': {
        const { tx, stakeAccountAddress } = await solanaStaker.buildSplitStakeTx({
          ownerAddress: config.delegatorAddress,
          stakeAccountAddress: arg[0],
          amount: arg[1]
        })

        unsignedTx = tx
        stakeAccountAddr = stakeAccountAddress
        break
      }
    }
  } catch (e: any) {
    cmd.error(e, { exitCode: 1, code: msgType + '.tx.sign' })
  }

  if (unsignedTx === undefined) {
    throw new Error('no transaction to sign')
  }

  logger.info(1, 3, 'prepare unsigned transaction')
  log('unsignedTx', unsignedTx.tx.instructions, journalEnabled)

  const shouldSign = await prompt('Do you want to sign the TX?')
  if (!shouldSign) {
    throw new Error('transaction signing aborted by user')
  }

  logger.info(2, 3, 'preparing signed transaction')
  const { signedTx } = await solanaStaker.sign({
    signer,
    signerAddress: config.delegatorAddress,
    tx: unsignedTx
  })

  console.log('* transaction signature received with fee structure: ')
  log('signedTx', signedTx.signatures, journalEnabled)

  if (broadcastEnabled) {
    const shouldBroadcast = await prompt('Do you want to broadcast TX?')
    if (!shouldBroadcast) {
      cmd.error('transaction signing aborted by user', {
        exitCode: 1,
        code: 'delegate.abort'
      })
    }

    logger.info(3, 3, 'broadcasting the signed transaction')

    if (stakeAccountAddr !== '') {
      console.log('* stake account involved in the transaction: ' + stakeAccountAddr)
    }

    const result = await solanaStaker.broadcast({ signedTx })
    log('broadcastTx', result, journalEnabled)

    const networkConfig = getNetworkConfig<CLINetworkConfig>(config)
    if (networkConfig.blockExplorerUrl !== undefined) {
      console.log('\nCheck TX status here: ' + networkConfig.blockExplorerUrl.replace('{tx}', result.txHash))
    }
  }
}

async function getDelegateTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('delegate', options, cmd, [amount])
}

async function getDelegateWithStakeAccountTx (
  stakeAccountAddress: string,
  options: any,
  cmd: Command<[string]>
): Promise<void> {
  await runTx('delegate-with-stake-account', options, cmd, [stakeAccountAddress])
}

async function getCreateStakeAccountTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('create-stake-account', options, cmd, [amount])
}

async function getUndelegateTx (amount: string, options: any, cmd: Command<[string]>): Promise<void> {
  await runTx('unstake', options, cmd, [amount])
}

async function getMergeStakesTx (
  sourceAddress: string,
  destinationAddress: string,
  options: any,
  cmd: Command<[string, string]>
): Promise<void> {
  await runTx('merge-stakes', options, cmd, [sourceAddress, destinationAddress])
}

async function getSplitStakeTx (
  sourceAddress: string,
  amount: string,
  options: any,
  cmd: Command<[string, string]>
): Promise<void> {
  await runTx('split-stake', options, cmd, [sourceAddress, amount])
}

async function getWithdrawStakeTx (
  stakeAccountAddress: string,
  amount: string,
  options: any,
  cmd: Command<[string, string]>
): Promise<void> {
  await runTx('withdraw-stake', options, cmd, [stakeAccountAddress, amount])
}

async function getStakingAccountsInfo (_options: any, cmd: Command<[]>): Promise<void> {
  const [config, _] = await init(cmd)

  const networkConfig = getNetworkConfig<CLINetworkConfig>(config)
  const solanaStaker: SolanaStaker = new SolanaStaker({ ...networkConfig })
  await solanaStaker.init()

  console.table(
    (
      await solanaStaker.getStakeAccounts({
        ownerAddress: config.delegatorAddress,
        withStates: true,
        withMacroDenom: true
      })
    ).accounts
  )
}
