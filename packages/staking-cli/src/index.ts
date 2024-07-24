#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings'
import { makeAvalancheCommand } from './cmd/avalanche'
import { makeCosmosCommand } from './cmd/cosmos'
import { makeEthereumCommand } from './cmd/ethereum'
import { makeNearCommand } from './cmd/near'
import { makeSolanaCommand } from './cmd/solana'
import { makeSubstrateCommand } from './cmd/substrate'
import { makeTonCommand } from './cmd/ton'

const program = new Command()

program
  .name('fireblocks-staking')
  .description('CLI to manage funds for fireblocks accounts')
  .option('-c, --config <path>', 'path to configuration file', 'config.json')
  .option(
    '-s, --signer <type>',
    'choose signer with which you want to sign TX. Options: local or fireblocks',
    'fireblocks'
  )
  .version('1.0.0')

program.addCommand(makeAvalancheCommand())
program.addCommand(makeCosmosCommand())
program.addCommand(makeEthereumCommand())
program.addCommand(makeNearCommand())
program.addCommand(makeSolanaCommand())
program.addCommand(makeSubstrateCommand())
program.addCommand(makeTonCommand())
;(async () => {
  await program.parseAsync()
})().catch((e) => {
  console.error(e)
})
