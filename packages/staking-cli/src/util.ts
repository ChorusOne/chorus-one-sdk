import * as readline from 'readline'
import * as process from 'process'
import chalk from 'chalk'
import { promises as fsPromises } from 'fs'
import type { Journal, JournalEntry, Config } from './types'
import { NetworkType } from './enums'
import { SafeJSONStringify } from '@chorus-one/utils'

export const defaultLogger = {
  info: (...args: any[]): void => {
    if (args.length > 2) {
      console.log(chalk.green(`# [${args[0]}/${args[1]}] ${args[2]}`))
    } else {
      console.log(...args)
    }
  },
  error: (...args: any[]): void => {
    console.error(...args)
  }
}

async function fileExists (path: string): Promise<boolean> {
  return await fsPromises
    .access(path, fsPromises.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}

async function writeJournal (entry: JournalEntry): Promise<void> {
  let journal: Journal = { entries: [] }
  if (await fileExists('./journal.log')) {
    const journalFile = await fsPromises.readFile('./journal.log', 'utf-8')
    journal = JSON.parse(journalFile)
  }

  if (entry.data instanceof Object) {
    entry.data = JSON.parse(SafeJSONStringify(entry.data))
  }

  journal.entries.push(entry)

  await fsPromises.writeFile('./journal.log', JSON.stringify(journal, null, 2), { flag: 'w' })
}

export async function log (type: string, data: any, enabled?: boolean): Promise<void> {
  console.log(data)

  if (enabled === false) {
    return
  }

  return await writeJournal({
    type,
    timestamp: Math.floor(Date.now() / 1000),
    data
  })
}

export async function readConfig (path: string): Promise<Config> {
  const configFile = await fsPromises.readFile(path, 'utf-8')
  const cfg: Config = JSON.parse(configFile)

  return cfg
}

export function getNetworkConfig<T> (cfg: Config): T {
  if (cfg.networkType === undefined) {
    throw new Error('networkType is missing in configuration')
  }

  switch (cfg.networkType) {
    case NetworkType.NEAR:
      if (cfg.near === undefined) {
        throw new Error('near configuration is missing')
      }
      return cfg.near as T
    case NetworkType.COSMOS:
      if (cfg.cosmos === undefined) {
        throw new Error('cosmos configuration is missing')
      }
      return cfg.cosmos as T
    case NetworkType.SUBSTRATE:
      if (cfg.substrate === undefined) {
        throw new Error('substrate configuration is missing')
      }
      return cfg.substrate as T
    case NetworkType.SOLANA:
      if (cfg.solana === undefined) {
        throw new Error('solana configuration is missing')
      }
      return cfg.solana as T

    case NetworkType.AVALANCHE:
      if (cfg.avalanche === undefined) {
        throw new Error('avalanche configuration is missing')
      }
      return cfg.avalanche as T
    case NetworkType.TON:
      if (cfg.ton === undefined) {
        throw new Error('ton configuration is missing')
      }
      return cfg.ton as T

    case NetworkType.ETHEREUM:
      if (cfg.ethereum === undefined) {
        throw new Error('ethereum configuration is missing')
      }
      return cfg.ethereum as T
  }
}

export async function prompt (ask: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  try {
    for (;;) {
      const userInput = await new Promise<string>((resolve) => {
        rl.question(ask + ' [y/n]: ', resolve)
      })

      const lowerCaseInput = userInput.toLowerCase()

      if (lowerCaseInput === 'y' || lowerCaseInput === 'yes') {
        return await Promise.resolve(true)
      } else if (lowerCaseInput === 'n' || lowerCaseInput === 'no') {
        return await Promise.resolve(false)
      } else {
        console.log('Invalid input. Please enter either "y" or "n".')
      }
    }
  } finally {
    rl.close()
  }
}

export async function ask (question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  try {
    for (;;) {
      const userInput = await new Promise<string>((resolve) => {
        rl.question(question + ': ', resolve)
      })
      return await Promise.resolve(userInput)
    }
  } finally {
    rl.close()
  }
}

export function checkNodeVersion (versionPrefix: string, err?: string): void {
  const version = process.version
  if (version.startsWith(versionPrefix)) {
    if (err !== undefined) {
      console.error(err)
    } else {
      console.error(`Error: Node.js version ${version} is not supported.`)
    }
    process.exit(1)
  }
}
